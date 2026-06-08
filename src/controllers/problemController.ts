import { NextFunction, Response } from "express";
import { StatusCodes } from "http-status-codes";

import ProblemServices from "../dbServices/problemServices";
import TagServices from "../dbServices/TagServices";
import CustomError from "../exceptions/custom-error";
import { TypedRequestBody } from "../types/request";
import { CreateDraftProblemBody } from "../zodValidations/problemValidations";

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
