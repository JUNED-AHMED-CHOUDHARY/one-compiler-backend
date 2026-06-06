import { type NextFunction, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import { type ZodType } from "zod";
import CustomError from "../exceptions/custom-error";

const formatPath = (path: PropertyKey[]) => {
  return path.length > 0 ? path.join(".") : "root";
};

const zodValidateBody = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(
        new CustomError("Validation failed", StatusCodes.BAD_REQUEST, {
          errors: result.error.issues.map((issue) => ({
            path: formatPath(issue.path),
            message: issue.message
          }))
        })
      );
    }

    return next();
  };
};

export default zodValidateBody;
