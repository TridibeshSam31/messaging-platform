import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { prisma } from "./lib/prisma.js";
import { initializeWebSocket } from "./socket/index.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.route.js";
import conversationRoutes from "./routes/conversation.routes.js";
import messageRoutes from "./routes/message.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

import { errorHandler } from "./middleware/errorHandler.js";
import { limiter } from "./lib/rate-limit.js";
import dotenv from "dotenv"

dotenv.config();


const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    message: "Server Running",
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

async function startServer() {
  try {
    // Connect to PostgreSQL
    await prisma.$connect();
    console.log(" Database connected");

    // Reset any stale presence statuses left from previous server runs
    await prisma.user.updateMany({
      data: { status: "OFFLINE" },
    });

    // Initialize WebSocket Server (runs on its own port 8080)
    initializeWebSocket();

    // Start Express Server
    app.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

async function shutdown() {
  console.log("Shutting down server...");

  await prisma.$disconnect();

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

//from process I mean node js process object which is a global object in node js and it is used to handle the 
//events like SIGINT and SIGTERM which are used to handle the termination of the process.