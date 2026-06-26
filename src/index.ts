import cors from "cors";
import express from "express";
import helmet from "helmet";

import ENV from "./config/ENV";
import { connectMongoDB } from "./config/mongodb";
import { connectPrisma } from "./config/prisma";
import errorHandler from "./exceptions/error-handler";
import notFoundHandler from "./exceptions/not-found-handler";
import responseMiddlewareHandler from "./middlewares/responseMiddleware";
import { registerWorkers } from "./Queue/workers/registerWorkers";
import indexRoutes from "./routes/indexRoutes";
import { poolManager } from "./services/docker/PoolManager";
import { logger, requestLoggerMiddleware } from "./services/logger";
import { shutDownManager } from "./services/shutDownManager/shutDownManager";
import { ShutdownPriority } from "./types/services/shutdownManger";

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

// response middleware
app.use(responseMiddlewareHandler);

// error middlewares...
app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await Promise.all([connectPrisma(), connectMongoDB(), poolManager.initialize()]);
    registerWorkers(); // because worker was running before mongo connection was established causing failed testcases uploads retry throws error no bucket foundthats why !
    const server = app.listen(port, () => {
      logger.info("Server is running", { port });
    });

    server.on("error", (error) => {
      logger.error("HTTP server failed", { error });
      process.exit(1);
    });
    shutDownManager.registerCleanupTask({
      name: "Express Server",
      priority: ShutdownPriority.NORMAL,
      task: async () => {
        return new Promise((resolve, reject) => {
          logger.info("Closing Express HTTP server..");

          server.close((err) => {
            if (err) return reject(err);
            resolve();
          });

          if ("closeIdleConnections" in server) server.closeIdleConnections();

          setTimeout(() => {
            logger.warn("Active HTTP connections persisting, forcefully terminating sockets.");
            if ("closeAllConnections" in server) {
              server.closeAllConnections();
            }
          }, 5000).unref();
        });
      }
    });
  } catch (error: unknown) {
    logger.error("Unknown Error.", { error });
    process.exit(1);
  }
};

startServer();
