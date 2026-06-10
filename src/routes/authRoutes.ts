import { Router } from "express";

import { loginController, signUpController } from "../controllers/authController";
import asyncHandler from "../middlewares/asyncHandlerMiddleware";
import { zodValidateBody } from "../middlewares/validateRequestMiddleware";
import { loginBodySchema, signUpBodySchema } from "../zodValidations/authValidations";

const authRoutes = Router();

authRoutes.post("/sign-up", zodValidateBody(signUpBodySchema), asyncHandler(signUpController));
authRoutes.post("/login", zodValidateBody(loginBodySchema), asyncHandler(loginController));

export default authRoutes;
