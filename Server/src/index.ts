import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { prisma } from "./lib/prisma.js";
import { initializeWebSocket,clients } from "./socket/index.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.route.js";
import conversationRoutes from "./routes/conversation.routes.js";
import messageRoutes from "./routes/message.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

import { errorHandler } from "./middleware/errorHandler.js";
import { limiter } from "./lib/rate-limit.js";
import {log} from "./lib/logger.js"
import dotenv from "dotenv"
import { createServer } from "http";
import {requestLogger} from "./middleware/requestLogger.js"
import {metrics} from "./lib/metrics.js"
import { redisPublisher, redisSubscriber } from "./lib/redis.js"
import { instanceId, startedAt } from "./lib/instance.js"

dotenv.config();


const app = express();

// Phase 4: behind nginx (or Render's proxy) every request comes from the proxy's IP,
// so the rate limiter would treat ALL users as one. "trust proxy" makes Express read
// the real client IP from the X-Forwarded-For header the proxy adds.
// Only enable it when there really is a proxy in front, otherwise clients could fake that header.
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}


const server = createServer(app);

let isShuttingDown = false 

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

app.use(requestLogger);

app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    message: "Server Running",
  });
});

// Phase 9: one place that says "is Redis OK?" — used by /metrics and /health
function redisStatus() {
  if (!redisPublisher) return "disabled"          // single-server mode, Redis not configured
  return redisPublisher.status === "ready" ? "healthy" : "unhealthy"
}

app.get("/metrics", (req, res) => {
  res.json({
    // Phase 9: with several servers, numbers mean nothing without saying WHICH server
    instanceId,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),

    http: {
      requestsTotal: metrics.http.requestsTotal.get(),
      errorsTotal: metrics.http.errorsTotal.get(),
      requestDuration: {
        count: metrics.http.requestDurationMs.getCount(),
        averageMs: metrics.http.requestDurationMs.getAverage(),
        maxMs: metrics.http.requestDurationMs.getMax(),
      },
    },

    websocket: {
      connectionsTotal: metrics.websocket.connectionsTotal.get(),
      // this instance only — add up every instance's /metrics for the whole system
      activeConnections: metrics.websocket.activeConnections.get(),
      reconnectsTotal: metrics.websocket.reconnectsTotal.get(),
      messagesReceivedTotal: metrics.websocket.messagesReceivedTotal.get(),
      messagesSentTotal: metrics.websocket.messagesSentTotal.get(),
      errorsTotal: metrics.websocket.errorsTotal.get(),
      deliveryLatency: {
        count: metrics.websocket.deliveryLatencyMs.getCount(),
        averageMs: metrics.websocket.deliveryLatencyMs.getAverage(),
        maxMs: metrics.websocket.deliveryLatencyMs.getMax(),
      },
    },

    redis: {
      status: redisStatus(),
      connectionErrorsTotal: metrics.redis.connectionErrorsTotal.get(),
      publishFailuresTotal: metrics.redis.publishFailuresTotal.get(),
      presenceFailuresTotal: metrics.redis.presenceFailuresTotal.get(),
    },

    database: {
      queriesTotal: metrics.database.queriesTotal.get(),
      queryErrorsTotal: metrics.database.queryErrorsTotal.get(),
      queryDuration: {
        count: metrics.database.queryDurationMs.getCount(),
        averageMs: metrics.database.queryDurationMs.getAverage(),
        maxMs: metrics.database.queryDurationMs.getMax(),
      },
    },
  });
});

// Phase 9: health check for a load balancer / Render / Docker.
// 200 = "send me traffic", 503 = "don't send me new traffic".
app.get("/health", async (req, res) => {
  // shutting down → tell the load balancer to stop routing NEW connections here,
  // while the existing ones are being closed (graceful shutdown, Phase 4)
  if (isShuttingDown) {
    return res.status(503).json({ status: "shutting_down", instanceId })
  }

  let database = "healthy"
  try {
    await prisma.$queryRaw`SELECT 1` //check if the database is reachable and responsive
  } catch {
    database = "unhealthy"
  }

  const redis = redisStatus()

  // database down → this server can't save or load anything → unhealthy (503)
  // Redis down → messages still work for users on THIS server (local fallback),
  //              only cross-server delivery is broken → "degraded", still 200
  const status =
    database === "unhealthy" ? "unhealthy" : redis === "unhealthy" ? "degraded" : "healthy"

  res.status(status === "unhealthy" ? 503 : 200).json({
    status,
    instanceId,
    server: "healthy",
    database,
    redis,
    websocket: {
      // WebSocket health: is the WS server accepting, and how many sockets it holds
      acceptingConnections: !isShuttingDown,
      activeConnections: metrics.websocket.activeConnections.get(),
    },
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  })
})

app.use(limiter)
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api", messageRoutes);
app.use("/api/uploads", uploadRoutes);

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;
const wss = initializeWebSocket(server, () => isShuttingDown);

async function startServer() {
  try {
    // Connect to PostgreSQL
    await prisma.$connect();
    log.info("database.connected");

    // Reset any stale presence statuses left from previous server runs.
    // Phase 4: only in single-server mode! With Redis there may be OTHER instances
    // still serving connected users — wiping everyone to OFFLINE would be wrong.
    if (!redisPublisher) {
      await prisma.user.updateMany({
        data: { status: "OFFLINE" },
      });
    }

    

    // Start Express+websocket server Server
    server.listen(PORT, () => {
    log.info("server.started", {
    port: PORT,
});
    });

    ;
  } catch (error) {
    log.error("server.start.failed", {
    error: error instanceof Error
        ? error.message
        : String(error),
    });
    process.exit(1);
  }
}

startServer();

/*
async function shutdown() {
  console.log("Shutting down server...");

  await prisma.$disconnect();

  process.exit(0);
}
  */
 async function shutdown() {
    if (isShuttingDown) return;

    isShuttingDown = true;

    // Phase 9: how long did shutdown take, and how many users did it affect?
    const shutdownStartedAt = Date.now();
    log.info("server.shutdown.started", { openConnections: clients.size });
    // Ask all WebSocket clients to close gracefully
    for (const ws of clients.keys()) {
        ws.close();
    }

    wss.close();

    // Give connections a few seconds to close gracefully.
    // If they don't, forcefully terminate them.
    const forceCloseTimer = setTimeout(() => {
        // Phase 9: if this shows up often, clients aren't closing cleanly
        log.warn("server.shutdown.force_terminate", { remainingConnections: clients.size });
        for (const ws of clients.keys()) {
            ws.terminate();
        }
    }, 5000);

    server.close(async () => {
        clearTimeout(forceCloseTimer);

        await prisma.$disconnect();
        // close Redis connections too, otherwise they keep the process alive.
        // quit() (not disconnect()) waits for pending commands — e.g. the presence
        // removals the socket close handlers just sent — before closing.
        // allSettled: if Redis is already down, quit() rejects; ignore that and keep shutting down
        await Promise.allSettled([redisPublisher?.quit(), redisSubscriber?.quit()]);

       log.info("server.shutdown.completed", { durationMs: Date.now() - shutdownStartedAt });

        process.exit(0);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

//from process I mean node js process object which is a global object in node js and it is used to handle the 
//events like SIGINT and SIGTERM which are used to handle the termination of the process.