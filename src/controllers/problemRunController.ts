import { ProblemStatus } from "@prisma/client";
import { NextFunction, Response } from "express";
import { NotFound } from "http-errors";
import { StatusCodes } from "http-status-codes";

import prisma from "../config/prisma";
import CustomError from "../exceptions/custom-error";
import { ProblemRunJobData } from "../Queue/jobs/problemRunJob";
import { queueManager } from "../Queue/QueueManager";
import { findTemplateForLanguage } from "../services/judge/assembleExecutableCode";
import { TypedRequestParamsBody } from "../types/request";
import { ProblemRunBody } from "../zodValidations/problemRunValidations";
import { ProblemIdInParam } from "../zodValidations/problemValidations";

export const runProblemCodeController = async (req: TypedRequestParamsBody<ProblemIdInParam, ProblemRunBody>, res: Response, next: NextFunction) => {
  const problem = req.problem!;
  const { language, source_code, stdin } = req.body;

  if (problem.status !== ProblemStatus.PUBLISHED) {
    throw new NotFound("Problem not found");
  }

  const codeTemplates = await prisma.problemCodeTemplates.findMany({
    where: { problem_id: problem.id }
  });

  const template = findTemplateForLanguage(codeTemplates, language);
  if (!template) {
    throw new CustomError("Validation failed", StatusCodes.BAD_REQUEST, {
      errors: [{ path: "language", message: `No code template available for ${language}` }]
    });
  }

  const problemRunQueue = queueManager.getQueue("problemRun");
  const jobData: ProblemRunJobData = {
    problemId: problem.id,
    language,
    source_code,
    stdin
  };

  const job = await problemRunQueue.add("problemRun", jobData);

  res.locals.responseData = {
    success: true,
    statusCode: StatusCodes.ACCEPTED,
    message: "Code run started",
    data: { jobId: job.id }
  };

  next();
};
