import { UserRole } from "@prisma/client";
import { NextFunction, type Request, type Response } from "express";
import { Unauthorized } from "http-errors";

import UserServices from "../dbServices/userServices";
import { verifyJwtToken } from "../utilities/jwtUtils";

export const isUserAuthenticatedMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const headers = req.headers;

  if (!headers.authorization) throw new Unauthorized("Unauthorized");

  const token = headers.authorization?.replace("Bearer ", "");

  if (!token) throw new Unauthorized("Unauthorized");

  const decodedToken = verifyJwtToken(token);

  if (!decodedToken) throw new Unauthorized("Unauthorized");

  const user = await UserServices.getUserById(decodedToken.id);

  if (!user) throw new Unauthorized("Unauthorized");

  req.user = user;

  next();
};

export const validateUserRoleMiddleware = (roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) throw new Unauthorized("You are not allowed to create problems");

    next();
  };
};
