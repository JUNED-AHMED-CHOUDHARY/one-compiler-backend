import { type ErrorRequestHandler } from "express";
import axios from "axios";
import createHttpError from "http-errors";
import { StatusCodes } from "http-status-codes";

import { logger } from "../services/logger";
import CustomError from "./custom-error";

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const isKnownError = err instanceof CustomError;
  const isAxiosError = axios.isAxiosError(err);
  const isHttpError = createHttpError.isHttpError(err);

  const upstreamStatusCode = isAxiosError ? err.response?.status : undefined;
  const upstreamMessage = isAxiosError ? err.response?.data?.message : undefined;

  const statusCode = isKnownError
    ? err.status
    : isHttpError
      ? err.statusCode
      : typeof upstreamStatusCode === "number"
        ? upstreamStatusCode
        : isAxiosError
          ? StatusCodes.BAD_GATEWAY
          : StatusCodes.INTERNAL_SERVER_ERROR;

  const message = isKnownError ? err.message : isHttpError ? err.message : isAxiosError ? (upstreamMessage ?? err.message ?? "Upstream service error") : "Internal server error";

  const additionalInfo = isKnownError
    ? err.additionalInfo
    : isAxiosError
      ? {
          upstreamStatusCode,
          upstreamErrorCode: err.code
        }
      : undefined;

  logger.error("Request failed", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message,
    isAxiosError,
    errorName: err instanceof Error ? err.name : "UnknownError",
    stack: err instanceof Error ? err.stack : undefined,
    additionalInfo
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(additionalInfo !== undefined ? { additionalInfo } : {})
  });
};

export default errorHandler;
