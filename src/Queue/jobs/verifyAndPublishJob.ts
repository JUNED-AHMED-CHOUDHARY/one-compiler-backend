import { ProblemStatus } from "@prisma/client";
import { Processor, UnrecoverableError } from "bullmq";

import { isSameOutput, RUN_MODE_FLAG } from "../../constants/judgeProtocol";
import ProblemServices from "../../dbServices/problemServices";
import { getLanguageExecutionConfig } from "../../services/docker/dockerRunner";
import { poolManager } from "../../services/docker/PoolManager";
import { assembleExecutableCode, findTemplateForLanguage } from "../../services/judge/assembleExecutableCode";
import { HarnessJudgeService } from "../../services/judge/HarnessJudgeService";
import { TestCaseCacheService } from "../../services/judge/TestCaseCacheService";
import { logger } from "../../services/logger";
import { createJobStepTimer } from "../../utilities/jobStepTimer";
import { getRunnerLanguageFromDBLanguage } from "../../utilities/languageMapper";
import { getProblemMetaData } from "../../utilities/problemMetaData";
import { verifyMongoChecks, verifyProblemToBePublishedBasicChecks } from "../jobHelpers/verifyAndPublishJobHelper";

const verifyAndPublishJob: Processor = async (job) => {
  logger.info(`[Worker] Picked up Job ID: ${job.id}`);

  const { problemId } = job.data;
  let recycleContainer = false;
  const timer = createJobStepTimer(String(job.id));

  try {
    if (!problemId) throw new UnrecoverableError("Problem id is required");

    const problem = await timer.measure("fetchProblem", () => ProblemServices.getProblemByIdWithInclude(problemId, { code_templates: true }));
    if (!problem) throw new UnrecoverableError("Problem not found");

    await timer.measure("basicChecks", () => {
      verifyProblemToBePublishedBasicChecks(problem);
    });

    await timer.measure("mongoChecks", () => verifyMongoChecks(problemId, problem.evaluation_type));

    const harnessPayload = await timer.measure("harnessCache", () => TestCaseCacheService.getHarnessPayload(problemId));
    logger.info(`[Worker] Job ${job.id} | harness cache payload: ${harnessPayload.testcaseCount} cases, ${harnessPayload.bytes} bytes`);

    const referenceLanguage = problem.reference_solution_language!;
    const referenceCode = problem.reference_solution_code!;

    const template = await timer.measure("findTemplate", () => findTemplateForLanguage(problem.code_templates, referenceLanguage));
    if (!template) {
      throw new UnrecoverableError("There must be a code template for the reference solution language");
    }

    const executableCode = await timer.measure("assembleCode", () => {
      try {
        return assembleExecutableCode(template.hidden_stub_code, referenceCode);
      } catch (error) {
        throw new UnrecoverableError(error instanceof Error ? error.message : "Failed to assemble executable code");
      }
    });

    const language = getRunnerLanguageFromDBLanguage(referenceLanguage);
    const { fileName, compileCommand, batchRunCommand } = getLanguageExecutionConfig(language);

    const container = await timer.measure("acquireContainer", () => poolManager.acquire(language));

    try {
      await timer.measure("writeAndCompile", () =>
        HarnessJudgeService.writeSourceAndCompile({
          container,
          fileName,
          executableCode,
          compileCommand
        })
      );

      const { execution, shouldRecycleContainer } = await timer.measure("harnessRun", () =>
        HarnessJudgeService.runHarness({
          container,
          runCommand: batchRunCommand,
          harnessPayload,
          timeLimitMsPerCase: problem.time_limit_ms
        })
      );
      recycleContainer = shouldRecycleContainer;

      await timer.measure("assertVerdict", () => {
        HarnessJudgeService.assertHarnessPassed(execution, harnessPayload.testcaseCount);
      });

      // The learner Run button goes through the stub's run mode, so prove it reproduces every sample.
      await timer.measure("runModeSelfCheck", async () => {
        const sampleTestcases = getProblemMetaData(problem.meta_data).sample_testcases ?? [];

        const { execution, cases, shouldRecycleContainer } = await HarnessJudgeService.runCases({
          container,
          runCommand: batchRunCommand,
          inputs: sampleTestcases.map((sample) => sample.input),
          timeLimitMsPerCase: problem.time_limit_ms
        });
        recycleContainer = recycleContainer || shouldRecycleContainer;

        const mismatchIndex = sampleTestcases.findIndex((sample, index) => !isSameOutput(cases[index]?.output, sample.expected));
        if (mismatchIndex >= 0) {
          const actual = cases[mismatchIndex]?.output ?? (execution.stderr || "no result");
          throw new UnrecoverableError(
            `Run mode (${RUN_MODE_FLAG}) self-check failed on sample ${mismatchIndex + 1}: expected ${sampleTestcases[mismatchIndex].expected}, got ${actual}`
          );
        }
      });

      await timer.measure("markPublished", () => ProblemServices.updateProblemById(problemId, { status: ProblemStatus.PUBLISHED }, { select: { id: true } }));

      logger.info(`[Worker] Job ${job.id} | Problem ${problemId} published | ${timer.formatSummary()}`);
    } finally {
      await timer.measure("releaseContainer", () =>
        poolManager.release(container, { recycle: recycleContainer }).catch((err) => logger.error(`[Worker] Job ${job.id} | Failed to release container: ${err}`))
      );
    }

    logger.info(`[Worker] Job ${job.id} | timing.total=${timer.summaryMs()}ms`);
  } catch (error) {
    logger.error(`[Worker] Job ${job.id} | Error in verifyAndPublishJob: ${error}`);
    logger.error(`[Worker] Job ${job.id} | timing so far | ${timer.formatSummary()}`);
    logger.error(`[Worker] Job ${job.id} | timing.total=${timer.summaryMs()}ms`);
    throw error;
  }
};

export default verifyAndPublishJob;
