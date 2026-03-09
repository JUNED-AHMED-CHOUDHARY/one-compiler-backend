import { Processor } from "bullmq";

const codeRunnerJob: Processor = async (job) => {
  console.log(job.data);
};

export default codeRunnerJob;
