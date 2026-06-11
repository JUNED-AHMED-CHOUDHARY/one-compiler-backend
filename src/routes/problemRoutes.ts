import { UserRole } from "@prisma/client";
import { Router } from "express";

import { createDraftProblemController, evaluationSettingsController, updateContentController, upsertProblemTemplatesController } from "../controllers/problemController";
import asyncHandler from "../middlewares/asyncHandlerMiddleware";
import { isUserAuthenticatedMiddleware, validateUserRoleMiddleware } from "../middlewares/authMiddleware";
import { getProblemByIdMiddleware } from "../middlewares/problemsMiddleware";
import { zodValidateBody, zodValidateParams } from "../middlewares/validateRequestMiddleware";
import {
  createDraftProblemBodySchema,
  ProblemEvaluationSettingsBodySchema,
  problemIdInParamSchema,
  UpdateContentBodySchema,
  UpsertProblemTemplatesBodySchema
} from "../zodValidations/problemValidations";

const problemRoutes = Router();
// step 1
problemRoutes.post(
  "/create-draft-problem",
  asyncHandler(isUserAuthenticatedMiddleware),
  validateUserRoleMiddleware([UserRole.ADMIN, UserRole.PROBLEM_SETTER]),
  zodValidateBody(createDraftProblemBodySchema),
  asyncHandler(createDraftProblemController)
);

// step 2 part 1
problemRoutes.patch(
  "/:problemId/content",
  asyncHandler(isUserAuthenticatedMiddleware),
  validateUserRoleMiddleware([UserRole.ADMIN, UserRole.PROBLEM_SETTER]),
  zodValidateParams(problemIdInParamSchema),
  zodValidateBody(UpdateContentBodySchema),
  asyncHandler(getProblemByIdMiddleware),
  // TODO: check if user is a contributor in the problem or not.
  asyncHandler(updateContentController)
);

// step 2 part 2
// TODO: upload a image or gif or video when user drop inside the markdown editor and call this api..

// step 3 tab 1
problemRoutes.patch(
  "/:problemId/templates",
  asyncHandler(isUserAuthenticatedMiddleware),
  validateUserRoleMiddleware([UserRole.ADMIN, UserRole.PROBLEM_SETTER]),
  zodValidateParams(problemIdInParamSchema),
  zodValidateBody(UpsertProblemTemplatesBodySchema),
  asyncHandler(getProblemByIdMiddleware),
  asyncHandler(upsertProblemTemplatesController)
);

// step 3 tab 2
problemRoutes.patch(
  "/:problemId/evaluation-settings",
  asyncHandler(isUserAuthenticatedMiddleware),
  validateUserRoleMiddleware([UserRole.ADMIN, UserRole.PROBLEM_SETTER]),
  zodValidateParams(problemIdInParamSchema),
  zodValidateBody(ProblemEvaluationSettingsBodySchema),
  asyncHandler(getProblemByIdMiddleware),
  asyncHandler(evaluationSettingsController)
);

export default problemRoutes;
