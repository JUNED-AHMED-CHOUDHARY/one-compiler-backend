import { type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { type ParamsDictionary, type Query } from "express-serve-static-core";

/**
 * Async handler to wrap the API routes, allowing for async error handling.
 * @param fn Function to call for the API endpoint
 * @returns Promise with a catch statement
 */

type AsyncRequestHandler<TParams = ParamsDictionary, TResponse = unknown, TBody = unknown, TQuery = Query> = (
  req: Request<TParams, TResponse, TBody, TQuery>,
  res: Response<TResponse>,
  next: NextFunction
) => unknown | Promise<unknown>;

const asyncHandler = <TParams = ParamsDictionary, TResponse = unknown, TBody = unknown, TQuery = Query>(
  fn: AsyncRequestHandler<TParams, TResponse, TBody, TQuery>
): RequestHandler<TParams, TResponse, TBody, TQuery> => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
