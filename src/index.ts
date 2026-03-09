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
    const server = app.listen(port, () => {
      logger.info("Server is running", { port });
    });

    server.on("error", (error) => {
      logger.error("HTTP server failed", { error });
      process.exit(1);
    });
  } catch (error: unknown) {
    logger.error("Unkown Error.", { error });
    process.exit(1);
  }
};

startServer();
