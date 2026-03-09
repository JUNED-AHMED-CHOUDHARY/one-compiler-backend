import { Router } from "express";
import { runCode } from "../controllers/codeController";
import asyncHandler from "../middlewares/asyncHandlerMiddleware";

const codeRoutes = Router();

codeRoutes.post("/run", asyncHandler(runCode));

export default codeRoutes;
