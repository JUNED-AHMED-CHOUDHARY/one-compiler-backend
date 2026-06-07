import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const createDraftProblemController = async (req: Request, res: Response, _next: NextFunction) => {
  const user = req.user;

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Problem created successfully",
    data: user
  });
};
