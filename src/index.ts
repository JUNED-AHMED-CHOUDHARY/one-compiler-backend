import express from "express";
import cors from "cors";
import helmet from "helmet";

import ENV from "./config/ENV";
import errorHandler from "./exceptions/error-handler";
import notFoundHandler from "./exceptions/not-found-handler";
import { logger, requestLoggerMiddleware } from "./services/logger";
import indexRoutes from "./routes/indexRoutes";
// register bullmq workers..
import "./Queue/workers/registerWorkers";
import { poolManager } from "./services/PoolManager";
import { connectPrisma, disconnectPrisma } from "./config/prisma";

const app = express();
const port = Number(ENV.PORT) || 7000;

// middlewares...
// app.disable("x-powered-by");
app.use(cors());
app.use(requestLoggerMiddleware);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// routes...
app.use(indexRoutes);

// error middlewares...
app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await Promise.all([connectPrisma(), poolManager.initialize()]);
    const server = app.listen(port, () => {
      logger.info("Server is running", { port });
    });

    server.on("error", (error) => {
      logger.error("HTTP server failed", { error });
      process.exit(1);
    });

    // 1. GRACEFUL SHUTDOWN: Clean up containers if the server stops via terminal (Ctrl+C)
    process.on("SIGINT", async () => {
      await poolManager.cleanupAllContainers(true);
      await disconnectPrisma();
      process.exit(0);
    });

    // 2. GRACEFUL SHUTDOWN: Clean up containers if killed by a process manager (PM2/Docker)
    process.on("SIGTERM", async () => {
      await poolManager.cleanupAllContainers(true);
      await disconnectPrisma();
      process.exit(0);
    });

    // 4. CRASH SHUTDOWN: Clean up if a random bug crashes the server
    process.on("uncaughtException", async (error) => {
      logger.error("💥 Uncaught Exception! Shutting down gracefully...", { error });
      await poolManager.cleanupAllContainers(true);
      process.exit(1); // Exit with code 1 indicating a failure
    });

    // 5. PROMISE REJECTION: Clean up if an async function fails silently
    process.on("unhandledRejection", async (reason) => {
      logger.error("💥 Unhandled Promise Rejection! Shutting down gracefully...", { reason });
      await poolManager.cleanupAllContainers(true);
      process.exit(1);
    });
  } catch (error: unknown) {
    logger.error("Unknown Error.", { error });
    process.exit(1);
  }
};

startServer();
