import { UserRole } from "@prisma/client";
import { Router } from "express";

import { createDraftProblemController } from "../controllers/problemController";
import asyncHandler from "../middlewares/asyncHandlerMiddleware";
import { isUserAuthenticatedMiddleware, validateUserRoleMiddleware } from "../middlewares/authMiddleware";

const problemRoutes = Router();

problemRoutes.post(
  "/create-draft-problem",
  asyncHandler(isUserAuthenticatedMiddleware),
  validateUserRoleMiddleware([UserRole.ADMIN, UserRole.PROBLEM_SETTER]),
  asyncHandler(createDraftProblemController)
);

export default problemRoutes;
