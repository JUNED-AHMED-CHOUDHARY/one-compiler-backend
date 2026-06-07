import { Router } from "express";

import { createDraftProblemController } from "../controllers/problemController";
import asyncHandler from "../middlewares/asyncHandlerMiddleware";
import { isUserAuthenticatedMiddleware } from "../middlewares/authMiddleware";

const problemRoutes = Router();

problemRoutes.post("/create-draft-problem", asyncHandler(isUserAuthenticatedMiddleware), asyncHandler(createDraftProblemController));

export default problemRoutes;
