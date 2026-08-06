import { Processor } from "bullmq";

import codeRunnerJob from "../jobs/codeRunnerJob";
import testCasesUploadJob from "../jobs/testCasesUploadJob";
import verifyAndPublishJob from "../jobs/verifyAndPublishJob";
import { queueManager } from "../QueueManager";
import { QUEUE_NAMES } from "../QueueNames";

interface WorkerDefination {
  name: QUEUE_NAMES;
  processor: Processor | string;
  concurrency: number;
}
// TODO: in future require.resolve separate for production workers

const workers: WorkerDefination[] = [
  {
    name: "programming",
    processor: codeRunnerJob,
    concurrency: 10
  },
  {
    name: "testcasesUpload",
    processor: testCasesUploadJob,
    concurrency: 1
  },
  {
    name: "PublishProblemVerification",
    processor: verifyAndPublishJob,
    concurrency: 1
  }
];
// TODO: need to add the shutdown manager for the workers as well..
export const registerWorkers = () => {
  workers.forEach(({ name, concurrency, processor }) => queueManager.createWorker(name, processor, { concurrency }));
};
