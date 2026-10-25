import { ProblemStatus } from "@prisma/client";
import { NextFunction, Response } from "express";
import { NotFound } from "http-errors";
import { StatusCodes } from "http-status-codes";

import prisma from "../config/prisma";
import { ID_PREFIXES } from "../constants/idPrefixes";
import CustomError from "../exceptions/custom-error";
import { ProblemRunJobData } from "../Queue/jobs/problemRunJob";
import { queueManager } from "../Queue/QueueManager";
import { findTemplateForLanguage } from "../services/judge/assembleExecutableCode";
import { TypedRequestParamsBody } from "../types/request";
import { generateId } from "../utilities/commonFunctions";
import { getProblemMetaData } from "../utilities/problemMetaData";
import { ProblemRunBody } from "../zodValidations/problemRunValidations";
import { ProblemIdInParam } from "../zodValidations/problemValidations";

export const runProblemCodeController = async (req: TypedRequestParamsBody<ProblemIdInParam, ProblemRunBody>, res: Response, next: NextFunction) => {
  const problem = req.problem!;
  const { language, source_code, inputs } = req.body;

  if (problem.status !== ProblemStatus.PUBLISHED) {
    throw new NotFound("Problem not found");
  }

  // Only a structural check — whether the values themselves are valid is decided by the reference solution in the job.
  const { params } = getProblemMetaData(problem.meta_data);
  if (params?.length) {
    const errors = inputs.flatMap((input, index) =>
      input.trim().split(/\r?\n/u).length === params.length
        ? []
        : [{ path: `inputs.${index}`, message: `Testcase ${index + 1} must have exactly ${params.length} lines (${params.join(", ")})` }]
    );

    if (errors.length > 0) throw new CustomError("Validation failed", StatusCodes.BAD_REQUEST, { errors });
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
    inputs
  };

  const job = await problemRunQueue.add("problemRun", jobData, { jobId: generateId(ID_PREFIXES.EXECUTION_JOB) });

  res.locals.responseData = {
    success: true,
    statusCode: StatusCodes.ACCEPTED,
    message: "Code run started",
    data: { jobId: job.id }
  };

  next();
};
