import { type NextFunction, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodIssue, type ZodType } from "zod";

import CustomError from "../exceptions/custom-error";

const formatPath = (path: PropertyKey[]) => {
  return path.length > 0 ? path.join(".") : "root";
};

const formatErrorMessages = (issues: ZodIssue[]) => {
  return issues.map((issue) => ({
    path: formatPath(issue.path),
    message: issue.message
  }));
};

export const zodValidateBody = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(
        new CustomError("Validation failed", StatusCodes.BAD_REQUEST, {
          errors: formatErrorMessages(result.error.issues)
        })
      );
    }

    return next();
  };
};

export const zodValidateParams = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return next(
        new CustomError("Validation failed", StatusCodes.BAD_REQUEST, {
          errors: formatErrorMessages(result.error.issues)
        })
      );
    }
    next();
  };
};
