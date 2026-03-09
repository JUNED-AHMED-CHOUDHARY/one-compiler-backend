import { Router } from "express";
import { getExecutionResult, runCode } from "../controllers/codeController";
import asyncHandler from "../middlewares/asyncHandlerMiddleware";

const codeRoutes = Router();

codeRoutes.post("/run", asyncHandler(runCode));
codeRoutes.get("/result/:id", asyncHandler(getExecutionResult));

export default codeRoutes;
