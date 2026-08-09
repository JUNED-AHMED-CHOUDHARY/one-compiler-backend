import { Processor, UnrecoverableError } from "bullmq";

import ProblemServices from "../../dbServices/problemServices";
import { formatCodeExecutionOutput, runCodeInContainer } from "../../services/docker/dockerRunner";
import { assembleExecutableCode } from "../../services/judge/assembleExecutableCode";
import { logger } from "../../services/logger";
import { getRunnerLanguageFromDBLanguage } from "../../utilities/languageMapper";
import { ProblemRunBody } from "../../zodValidations/problemRunValidations";

export type ProblemRunJobData = {
  problemId: string;
  language: ProblemRunBody["language"];
  source_code: string;
  stdin: string;
};

const problemRunJob: Processor<ProblemRunJobData> = async (job) => {
  const { problemId, language, source_code, stdin } = job.data;

  logger.info(`[Worker] Picked up problem run job ${job.id}`, { problemId, language });

  const problem = await ProblemServices.getProblemByIdWithInclude(problemId, {
    code_templates: { where: { language } }
  });
  const template = problem?.code_templates[0];

  if (!problem || !template) {
    throw new UnrecoverableError("Problem run context is no longer available");
  }

  let executableCode: string;
  try {
    executableCode = assembleExecutableCode(template.hidden_stub_code, source_code);
  } catch (error) {
    throw new UnrecoverableError(error instanceof Error ? error.message : "Failed to assemble executable code");
  }

  const runnerLanguage = getRunnerLanguageFromDBLanguage(language, UnrecoverableError);
  const execution = await runCodeInContainer(String(job.id), runnerLanguage, executableCode, stdin, problem.time_limit_ms);

  return {
    output: formatCodeExecutionOutput(execution, problem.time_limit_ms)
  };
};

export default problemRunJob;
