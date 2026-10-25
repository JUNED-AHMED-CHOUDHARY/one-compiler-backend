import { Job } from "bullmq";
import { Request, Response } from "express";
import { BadRequest, NotFound } from "http-errors";
import { StatusCodes } from "http-status-codes";

import { ID_PREFIXES } from "../constants/idPrefixes";
import { queueManager } from "../Queue/QueueManager";
import { QUEUE_NAMES } from "../Queue/QueueNames";
import { generateId } from "../utilities/commonFunctions";

const EXECUTION_RESULT_QUEUES: QUEUE_NAMES[] = ["programming", "problemRun"];

async function findExecutionJob(jobId: string): Promise<Job | null> {
  for (const queueName of EXECUTION_RESULT_QUEUES) {
    const job = await queueManager.getQueue(queueName).getJob(jobId);
    if (job) return job;
  }
  return null;
}

export const runCode = async (req: Request, res: Response) => {
  const body = req.body;

  const programmingQueue = queueManager.getQueue("programming");

  const job = await programmingQueue.add("programming", body, { jobId: generateId(ID_PREFIXES.EXECUTION_JOB) });

  return res.status(StatusCodes.OK).json({
    jobId: job.id
  });
};

export const getExecutionResult = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!id) throw BadRequest("Job Id is required");

  const job = await findExecutionJob(id);

  if (!job) throw NotFound(`job not found against this id :- ${id}`);

  const jobState = await job.getState();

  switch (jobState) {
    case "completed": {
      // playground jobs return { output }, problem runs return { verdict, error?, cases? }
      const returnedValue = job.returnvalue;
      return res.status(StatusCodes.OK).json({
        status: returnedValue ? jobState : "active",
        ...returnedValue
      });
    }

    case "failed": {
      const fallbackError = (job.stacktrace && job.stacktrace[0]) || "Job failed due to an unknown error";
      return res.status(StatusCodes.OK).json({
        status: jobState,
        error: job.failedReason || fallbackError
      });
    }
  }

  return res.status(StatusCodes.OK).json({
    status: jobState
  });
};
