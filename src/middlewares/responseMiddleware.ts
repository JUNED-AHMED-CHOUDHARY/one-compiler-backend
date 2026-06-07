import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

const responseMiddlewareHandler = (_req: Request, res: Response, next: NextFunction) => {
  const responseData = res.locals.responseData;

  if (!responseData) return next();

  const statusCode = responseData.statusCode ?? StatusCodes.OK;
  const success = responseData.success ?? true;
  const message = responseData.message;
  const data = responseData.data;

  return res.status(statusCode).json({ success, message, data });
};

export default responseMiddlewareHandler;
