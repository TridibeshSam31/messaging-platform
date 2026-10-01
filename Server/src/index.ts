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

dotenv.config();


const app = express();


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

app.get("/metrics", (req, res) => {
  res.json({
    http: {
      requestsTotal: metrics.http.requestsTotal.get(),
      errorsTotal: metrics.http.errorsTotal.get(),
      requestDuration: {
        count: metrics.http.requestDurationMs.getCount(),
        averageMs: metrics.http.requestDurationMs.getAverage(),
      },
    },

    websocket: {
      connectionsTotal: metrics.websocket.connectionsTotal.get(),
      activeConnections: metrics.websocket.activeConnections.get(),
      messagesReceivedTotal: metrics.websocket.messagesReceivedTotal.get(),
      messagesSentTotal: metrics.websocket.messagesSentTotal.get(),
      errorsTotal: metrics.websocket.errorsTotal.get(),
    },

    database: {
      queriesTotal: metrics.database.queriesTotal.get(),
      queryErrorsTotal: metrics.database.queryErrorsTotal.get(),
      queryDuration: {
        count: metrics.database.queryDurationMs.getCount(),
        averageMs: metrics.database.queryDurationMs.getAverage(),
      },
    },
  });
});

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

    // Reset any stale presence statuses left from previous server runs
    await prisma.user.updateMany({
      data: { status: "OFFLINE" },
    });

    

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

    log.info("server.shutdown.started");
    // Ask all WebSocket clients to close gracefully
    for (const ws of clients.keys()) {
        ws.close();
    }

    wss.close();

    // Give connections a few seconds to close gracefully.
    // If they don't, forcefully terminate them.
    const forceCloseTimer = setTimeout(() => {
        for (const ws of clients.keys()) {
            ws.terminate();
        }
    }, 5000);

    server.close(async () => {
        clearTimeout(forceCloseTimer);

        await prisma.$disconnect();

       log.info("server.shutdown.completed");

        process.exit(0);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

//from process I mean node js process object which is a global object in node js and it is used to handle the 
//events like SIGINT and SIGTERM which are used to handle the termination of the process.