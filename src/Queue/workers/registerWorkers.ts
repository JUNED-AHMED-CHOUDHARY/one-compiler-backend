import { QUEUE_NAMES } from "../QueueNames";
import { Processor } from "bullmq";
import { queueManager } from "../QueueManager";
import ENV from "../../config/ENV";
import codeRunnerJob from "../jobs/codeRunnerJob";

interface WorkerDefination {
  name: QUEUE_NAMES;
  processor: Processor | string;
  concurrency: number;
}

const codeRunnerProcessorPath = require.resolve("../jobs/codeRunnerJob");
const programmingProcessor: Processor | string = ENV.NODE_ENV === "development" ? codeRunnerJob : codeRunnerProcessorPath;

const workers: WorkerDefination[] = [
  {
    name: "programming",
    processor: programmingProcessor,
    concurrency: 10
  }
];

workers.forEach(({ name, concurrency, processor }) => queueManager.createWorker(name, processor, { concurrency }));
