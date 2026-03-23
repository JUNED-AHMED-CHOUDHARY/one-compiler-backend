import { Processor } from "bullmq";
import { runProgrammingLanguagesCode } from "../../services/dockerRunner";

const codeRunnerJob: Processor = async (job) => {
  console.log(`\n[Worker] Picked up Job ID: ${job.id}`);
  const { code, language, stdin = "" } = job.data;

  try {
    const output = await runProgrammingLanguagesCode(job.id!, language, code, stdin);
    return { output };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(String(error));
  }
};

export default codeRunnerJob;
