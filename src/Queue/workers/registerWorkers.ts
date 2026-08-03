import { Processor } from "bullmq";

import ENV from "../../config/ENV";
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

const codeRunnerProcessorPath = require.resolve("../jobs/codeRunnerJob");
const programmingProcessor: Processor | string = ENV.NODE_ENV === "development" ? codeRunnerJob : codeRunnerProcessorPath;

const testCasesUploadProcessorPath = require.resolve("../jobs/testCasesUploadJob");
const testCasesUploadProcessor: Processor | string = ENV.NODE_ENV === "development" ? testCasesUploadJob : testCasesUploadProcessorPath;

const verifyAndPublishProcessorPath = require.resolve("../jobs/verifyAndPublishJob");
const verifyAndPublishProcessor: Processor | string = ENV.NODE_ENV === "development" ? verifyAndPublishJob : verifyAndPublishProcessorPath;

const workers: WorkerDefination[] = [
  {
    name: "programming",
    processor: programmingProcessor,
    concurrency: 10
  },
  {
    name: "testcasesUpload",
    processor: testCasesUploadProcessor,
    concurrency: 1
  },
  {
    name: "PublishProblemVerification",
    processor: verifyAndPublishProcessor,
    concurrency: 1
  }
];
// TODO: need to add the shutdown manager for the workers as well..
export const registerWorkers = () => {
  workers.forEach(({ name, concurrency, processor }) => queueManager.createWorker(name, processor, { concurrency }));
};
