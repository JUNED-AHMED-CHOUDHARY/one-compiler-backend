import { NextFunction, type Response } from "express";
import { NotFound } from "http-errors";

import ProblemServices from "../dbServices/problemServices";
import { type TypedRequestParams } from "../types/request";
import { type ProblemIdInParam } from "../zodValidations/problemValidations";

export const getProblemByIdMiddleware = async (req: TypedRequestParams<ProblemIdInParam>, _res: Response, next: NextFunction) => {
  const { problemId } = req.params;
  const problem = await ProblemServices.getProblemById(problemId);

  if (!problem) {
    throw new NotFound("Problem not found");
  }

  req.problem = problem;

  next();
};
