import { UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import { NextFunction, type Response } from "express";
import { StatusCodes } from "http-status-codes";

import { ID_PREFIXES } from "../constants/idPrefixes";
import UserServices from "../dbServices/userServices";
import CustomError from "../exceptions/custom-error";
import { type TypedRequestBody } from "../types/request";
import { generateId } from "../utilities/commonFunctions";
import { type SignUpBody } from "../zodValidations/authValidations";
// TODO : eslint rule for the import sequence..

const BCRYPT_SALT_ROUNDS = 12;

export const signUpController = async (req: TypedRequestBody<SignUpBody>, res: Response, next: NextFunction) => {
  const { email, password, name, userName } = req.body;

  const existingUser = await UserServices.getUserByEmailOrUsername(email, userName);

  if (existingUser?.email === email) {
    throw new CustomError("Validation failed", StatusCodes.CONFLICT, {
      errors: [{ path: "email", message: "Email already exists" }]
    });
  }

  if (existingUser?.username === userName) {
    throw new CustomError("Validation failed", StatusCodes.CONFLICT, {
      errors: [{ path: "userName", message: "Username already exists" }]
    });
  }

  const userId = generateId(ID_PREFIXES.USER);

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // TODO : user_image later...

  const userData = await UserServices.createUser({ id: userId, email, password_hash: passwordHash, role: UserRole.PROBLEM_SOLVER, username: userName, name });

  res.locals.responseData = {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: "User created successfully",
    data: userData
  };

  next();
};
