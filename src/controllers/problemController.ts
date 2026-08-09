import { EvaluationType, ProblemStatus } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { NotFound } from "http-errors";
import { StatusCodes } from "http-status-codes";

import ProblemCodeTemplateServices from "../dbServices/problemCodeTemplateServices";
import { PROBLEM_SELECTS } from "../dbServices/problemSelects";
import ProblemServices from "../dbServices/problemServices";
import TagServices from "../dbServices/TagServices";
import CustomError from "../exceptions/custom-error";
import { queueManager } from "../Queue/QueueManager";
import { TypedRequestBody, TypedRequestParams, TypedRequestParamsBody } from "../types/request";
import {
  CreateDraftProblemBody,
  ListProblemsQuery,
  ProblemEvaluationSettingsBody,
  ProblemIdInParam,
  ProblemSlugNameInParam,
  ReferenceSolutionBody,
  UpdateContentBody,
  UpsertProblemTemplatesBody
} from "../zodValidations/problemValidations";

// Learner / solver routes

export const getProblemsListController = async (req: Request, res: Response, next: NextFunction) => {
  const listResult = await ProblemServices.listPublishedProblems(req.validatedQuery as ListProblemsQuery);

  res.locals.responseData = {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Problems fetched successfully",
    data: listResult
  };

  next();
};

export const getProblemBySlugController = async (req: TypedRequestParams<ProblemSlugNameInParam>, res: Response, next: NextFunction) => {
  const { status, problem_slug_name } = req.problem!;

  if (status !== ProblemStatus.PUBLISHED) {
    throw new NotFound("Either Problem is not published or not found");
  }

  const detail = await ProblemServices.getProblemBySlugName(problem_slug_name, PROBLEM_SELECTS.detail);

  res.locals.responseData = {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Problem fetched successfully",
    data: detail
  };

  next();
};

// below setters controllers...
export const createDraftProblemController = async (req: TypedRequestBody<CreateDraftProblemBody>, res: Response, next: NextFunction) => {
  const user = req.user;
  const { problem_slug_name, tag_links } = req.body;

  const existingProblem = await ProblemServices.getProblemBySlugName(problem_slug_name);

  if (existingProblem) {
    throw new CustomError("Validation failed", StatusCodes.CONFLICT, {
      errors: [{ path: "problem_slug_name", message: "Problem with this slug name already exists" }]
    });
  }

  const topicTags = await TagServices.getTagsBySlugNames(tag_links);

  if (topicTags.length !== tag_links.length) {
    throw new CustomError("Validation failed", StatusCodes.CONFLICT, {
      errors: [{ path: "tag_links", message: "One or more tags with the given slug names do not exist" }]
    });
  }

  const draftProblem = await ProblemServices.createDraftProblem({ ...req.body, topicTags, user });

  res.locals.responseData = {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: "Draft problem created successfully",
    data: draftProblem
  };

  next();
};

// step 2 part 1
export const updateContentController = async (req: TypedRequestParamsBody<ProblemIdInParam, UpdateContentBody>, res: Response, next: NextFunction) => {
  const { problemId } = req.params;

  const updatedProblem = await ProblemServices.updateProblemContent(problemId, req.body);

  res.locals.responseData = {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Content updated successfully",
    data: updatedProblem
  };

  next();
};

export const upsertProblemTemplatesController = async (req: TypedRequestParamsBody<ProblemIdInParam, UpsertProblemTemplatesBody>, res: Response, next: NextFunction) => {
  const { problemId } = req.params;
  const { templates } = req.body;
  const updatedProblemTemplates = await ProblemCodeTemplateServices.upsertProblemTemplates(problemId, templates);

  res.locals.responseData = {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Templates updated successfully",
    data: updatedProblemTemplates
  };

  next();
};

export const evaluationSettingsController = async (req: TypedRequestParamsBody<ProblemIdInParam, ProblemEvaluationSettingsBody>, res: Response, next: NextFunction) => {
  const { problemId } = req.params;

  const payload = req.body;

  if (payload.evaluation_type === EvaluationType.EXACT_MATCH) payload.custom_checker_code = null;

  const updatedProblem = await ProblemServices.updateProblemById(problemId, payload);

  res.locals.responseData = {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Evaluation settings updated successfully",
    data: updatedProblem
  };

  next();
};

export const uploadTestCasesController = async (req: TypedRequestParams<ProblemIdInParam>, res: Response, next: NextFunction) => {
  const { problemId } = req.params;
  const testcaseZipFile = req.file;

  if (!testcaseZipFile) {
    throw new CustomError("Test cases zip file is required", StatusCodes.BAD_REQUEST);
  }

  const testcasesUploadQueue = queueManager.getQueue("testcasesUpload");

  const payload = {
    problemId,
    filePath: testcaseZipFile.path,
    originalFileName: testcaseZipFile.originalname
  };

  const job = await testcasesUploadQueue.add("testcasesUpload", payload);

  res.locals.responseData = {
    success: true,
    statusCode: StatusCodes.ACCEPTED,
    message: "Zip file received. Extracting test cases in the background",
    data: {
      status: await job.getState(),
      jobId: job.id
    }
  };

  next();
};

export const updateReferenceSolutionController = async (req: TypedRequestParamsBody<ProblemIdInParam, ReferenceSolutionBody>, res: Response, next: NextFunction) => {
  const { problemId } = req.params;

  const updatedProblem = await ProblemServices.updateProblemById(problemId, req.body);

  res.locals.responseData = {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Reference solution updated successfully",
    data: updatedProblem
  };

  next();
};

export const verifyAndPublishProblemController = async (req: TypedRequestParams<ProblemIdInParam>, res: Response, next: NextFunction) => {
  const { problemId } = req.params;

  const publishProblemVerificationQueue = queueManager.getQueue("PublishProblemVerification");
  const job = await publishProblemVerificationQueue.add("PublishProblemVerification", { problemId });

  res.locals.responseData = {
    success: true,
    statusCode: StatusCodes.ACCEPTED,
    message: "Problem verification and publication in progress",
    data: {
      status: await job.getState(),
      jobId: job.id
    }
  };

  next();
};
