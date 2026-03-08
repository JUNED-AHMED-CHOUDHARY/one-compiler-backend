import fs from "node:fs";
import path from "node:path";

import morgan from "morgan";
import winston from "winston";

import { Config } from "../config/config";
import ENV from "../config/ENV";

const logLevel = process.env.LOG_LEVEL ?? (Config.isRunningProd ? "info" : "debug");
const logDir = path.join(process.cwd(), "logs");

if (Config.isRunningProd) {
  fs.mkdirSync(logDir, { recursive: true });
}

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metadata = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";

    if (stack) {
      return `${timestamp} [${level}] ${message}\n${stack}${metadata}`;
    }

    return `${timestamp} [${level}] ${message}${metadata}`;
  }),
);

const transportList: winston.transport[] = [
  new winston.transports.Console({
    level: logLevel,
    format: Config.isRunningProd ? jsonFormat : devFormat,
    handleExceptions: true,
    handleRejections: true,
  }),
];

if (Config.isRunningProd) {
  transportList.push(
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: jsonFormat,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      format: jsonFormat,
    }),
  );
}

const logger = winston.createLogger({
  level: logLevel,
  defaultMeta: {
    service: "one-compiler-backend",
    environment: ENV.NODE_ENV,
  },
  transports: transportList,
  exitOnError: false,
});

const requestLoggerMiddleware = morgan(
  Config.isRunningProd
    ? ':remote-addr - :method :url :status :res[content-length] - :response-time ms'
    : ':method :url :status :response-time ms :res[content-length]',
  {
    stream: {
      write: (message: string) => {
        logger.http(message.trim());
      },
    },
  },
);

export { logger, requestLoggerMiddleware };
