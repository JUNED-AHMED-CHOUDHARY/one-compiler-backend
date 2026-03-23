import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { queueManager } from "../Queue/QueueManager";
import { BadRequest, NotFound } from "http-errors";
export const runCode = async (req: Request, res: Response) => {
  const body = req.body;

  const programmingQueue = queueManager.getQueue("programming");

  const job = await programmingQueue.add("programming", body);

  return res.status(StatusCodes.OK).json({
    jobId: job.id
  });
};

export const getExecutionResult = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!id) throw BadRequest("Job Id is required");

  const programmingQueue = queueManager.getQueue("programming");

  const job = await programmingQueue.getJob(id);

  if (!job) throw NotFound(`job not found against this id :- ${id}`);

  const jobState = await job?.getState();

  switch (jobState) {
    case "completed": {
      const returnedValue = job?.returnvalue?.output ?? "";
      return res.status(StatusCodes.OK).json({
        status: returnedValue ? jobState : "active",
        output: returnedValue
      });
    }

    case "failed": {
      const fallbackError = (job?.stacktrace && job.stacktrace[0]) || "Job failed due to an unknown error";
      return res.status(StatusCodes.OK).json({
        status: jobState,
        error: job?.failedReason || fallbackError
      });
    }
  }

  return res.status(StatusCodes.OK).json({
    status: jobState
  });
};
