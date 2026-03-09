import { type NextFunction, type Request, type Response } from "express";
import { getReasonPhrase, StatusCodes } from "http-status-codes";

import CustomError from "./custom-error";

const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new CustomError(`Route ${getReasonPhrase(StatusCodes.NOT_FOUND)}`, StatusCodes.NOT_FOUND));
};

export default notFoundHandler;
