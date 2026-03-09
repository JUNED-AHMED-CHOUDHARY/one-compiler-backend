import { JobsOptions } from "bullmq";

export type QUEUE_NAMES = "programming";

export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  removeOnComplete: {
    count: 20,
    age: 60 * 60
  },
  backoff: {
    type: "exponential",
    delay: 1000,
    jitter: 0.5
  },
  removeOnFail: {
    count: 100
  },
  stackTraceLimit: 10
};
