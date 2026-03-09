import { Processor } from "bullmq";
import { runProgrammingLanguagesCode } from "../../services/dockerRunner";

const codeRunnerJob: Processor = async (job) => {
  console.log(`\n[Worker] Picked up Job ID: ${job.id}`);
  const { code, language } = job.data;

  const output = await runProgrammingLanguagesCode(job.id!, language, code);
  return { output };
};

export default codeRunnerJob;
