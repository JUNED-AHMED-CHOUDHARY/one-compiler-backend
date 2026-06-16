// TODO : update status to draft if it was published or archived. (in the end add middleware inside -> res.locals.responseData.data -> updatedProblem)
import { UserRole } from "@prisma/client";
import { Router } from "express";

import { MULTER_UPLOAD_FIELD_NAME } from "../constants/middlewareConstants";
import {
  createDraftProblemController,
  evaluationSettingsController,
  updateContentController,
  updateReferenceSolutionController,
  uploadTestCasesController,
  upsertProblemTemplatesController
} from "../controllers/problemController";
import asyncHandler from "../middlewares/asyncHandlerMiddleware";
import { isUserAuthenticatedMiddleware, validateUserRoleMiddleware } from "../middlewares/authMiddleware";
import { uploadMulterTestCaseZip } from "../middlewares/multerMiddleware";
import { getProblemByIdMiddleware } from "../middlewares/problemsMiddleware";
import { zodValidateBody, zodValidateParams } from "../middlewares/validateRequestMiddleware";
import {
  createDraftProblemBodySchema,
  ProblemEvaluationSettingsBodySchema,
  problemIdInParamSchema,
  ReferenceSolutionBodySchema,
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

// step 3 tab 3
problemRoutes.post(
  "/:problemId/testcases-upload",
  asyncHandler(isUserAuthenticatedMiddleware),
  validateUserRoleMiddleware([UserRole.ADMIN, UserRole.PROBLEM_SETTER]),
  zodValidateParams(problemIdInParamSchema),
  uploadMulterTestCaseZip.single(MULTER_UPLOAD_FIELD_NAME),
  asyncHandler(getProblemByIdMiddleware),
  asyncHandler(uploadTestCasesController)
);

problemRoutes.post(
  "/:problemId/reference-solution",
  asyncHandler(isUserAuthenticatedMiddleware),
  validateUserRoleMiddleware([UserRole.ADMIN, UserRole.PROBLEM_SETTER]),
  zodValidateParams(problemIdInParamSchema),
  zodValidateBody(ReferenceSolutionBodySchema),
  asyncHandler(getProblemByIdMiddleware),
  asyncHandler(updateReferenceSolutionController)
);

export default problemRoutes;
