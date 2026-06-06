import { type Response } from "express";
import { StatusCodes } from "http-status-codes";

import { type SignUpBody } from "../zodValidations/authValidations";
import { type TypedRequestBody } from "../types/request";

export const signUpController = async (req: TypedRequestBody<SignUpBody>, res: Response) => {
  const { email, name } = req.body;

  return res.status(StatusCodes.OK).json({
    message: "Sign up successful",
    data: {
      email,
      name
    }
  });
};
