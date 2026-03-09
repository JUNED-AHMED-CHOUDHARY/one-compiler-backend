import { Processor } from "bullmq";
import { runCppCode } from "../../services/dockerRunner";

const codeRunnerJob: Processor = async (job) => {
  console.log(`\n[Worker] Picked up Job ID: ${job.id}`);
  const { code, language } = job.data;

  if (language === "cpp") {
    const output = await runCppCode(job.id!, code);
    return { output };
  }

  throw new Error(`Language ${language} not supported yet.`);
};

export default codeRunnerJob;
