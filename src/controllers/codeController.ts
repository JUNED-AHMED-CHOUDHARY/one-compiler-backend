import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { queueManager } from "../Queue/QueueManager";

export const runCode = async (req: Request, res: Response) => {
  const body = req.body;

  const programmingQueue = queueManager.getQueue("programming");
  await programmingQueue.add("programming", body);
  return res.status(StatusCodes.OK).json(body);
};
