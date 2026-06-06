import { Router } from "express";
import asyncHandler from "../middlewares/asyncHandlerMiddleware";
import zodValidateBody from "../middlewares/validateRequestMiddleware";
import { signUpController } from "../controllers/authController";
import { signUpBodySchema } from "../zodValidations/authValidations";

const authRoutes = Router();

authRoutes.post("/sign-up", zodValidateBody(signUpBodySchema), asyncHandler(signUpController));

export default authRoutes;
