import { SubmissionStatus } from "@prisma/client";
import { Processor, UnrecoverableError } from "bullmq";

import { isSameOutput, testcaseInputKey } from "../../constants/judgeProtocol";
import ProblemServices from "../../dbServices/problemServices";
import { findTemplateForLanguage } from "../../services/judge/assembleExecutableCode";
import { HarnessJudgeService } from "../../services/judge/HarnessJudgeService";
import { logger } from "../../services/logger";
import { getProblemMetaData } from "../../utilities/problemMetaData";
import { ProblemRunBody } from "../../zodValidations/problemRunValidations";

export type ProblemRunJobData = Pick<ProblemRunBody, "language" | "source_code" | "inputs"> & { problemId: string };

type RunVerdict = SubmissionStatus | "INVALID_TESTCASE";

type RunCaseResult = {
  input: string;
  /** Whatever the solution printed while running this case. */
  stdout: string;
  output: string | null;
  expected: string | null;
  passed: boolean;
};

export type ProblemRunResult = { verdict: RunVerdict; error?: string; cases?: RunCaseResult[] };

/**
 * Learner "Run": samples use the expected output stored at upload time; any custom input is first
 * run through the reference solution, which both produces its expected output and validates it —
 * if the reference can't produce a result for an input, that input is invalid for this problem.
 */
const problemRunJob: Processor<ProblemRunJobData, ProblemRunResult> = async (job) => {
  const { problemId, language, source_code, inputs } = job.data;

  logger.info(`[Worker] Picked up problem run job ${job.id}`, { problemId, language, testcases: inputs.length });

  const problem = await ProblemServices.getProblemByIdWithInclude(problemId, { code_templates: true });
  const template = problem && findTemplateForLanguage(problem.code_templates, language);
  const referenceTemplate = problem?.reference_solution_language && findTemplateForLanguage(problem.code_templates, problem.reference_solution_language);

  if (!problem || !template || !referenceTemplate || !problem.reference_solution_code) {
    throw new UnrecoverableError("Problem run context is no longer available");
  }

  const sampleExpectedByInput = new Map((getProblemMetaData(problem.meta_data).sample_testcases ?? []).map((sample) => [testcaseInputKey(sample.input), sample.expected]));
  const storedExpected = inputs.map((input) => sampleExpectedByInput.get(testcaseInputKey(input)) ?? null);

  let expected = storedExpected;

  if (storedExpected.includes(null)) {
    const reference = await HarnessJudgeService.compileAndRunCases({
      language: referenceTemplate.language,
      hiddenStubCode: referenceTemplate.hidden_stub_code,
      solutionCode: problem.reference_solution_code,
      inputs,
      timeLimitMsPerCase: problem.time_limit_ms
    });

    if ("compileError" in reference) {
      throw new UnrecoverableError(`Reference solution for ${problemId} failed to compile: ${reference.compileError}`);
    }

    expected = storedExpected.map((stored, index) => stored ?? reference.cases[index]?.output ?? null);

    const invalidIndex = expected.indexOf(null);
    if (invalidIndex >= 0) {
      // reference stderr is deliberately not returned — it can leak the reference solution's source
      return { verdict: "INVALID_TESTCASE", error: `Testcase ${invalidIndex + 1} is invalid for this problem — check its format and constraints` };
    }
  }

  const userRun = await HarnessJudgeService.compileAndRunCases({
    language,
    hiddenStubCode: template.hidden_stub_code,
    solutionCode: source_code,
    inputs,
    timeLimitMsPerCase: problem.time_limit_ms
  });

  if ("compileError" in userRun) {
    return { verdict: SubmissionStatus.COMPILATION_ERROR, error: userRun.compileError };
  }

  const { execution } = userRun;
  const cases: RunCaseResult[] = inputs.map((input, index) => {
    const ran = userRun.cases[index];
    return { input, stdout: ran?.stdout ?? "", output: ran?.output ?? null, expected: expected[index], passed: isSameOutput(ran?.output, expected[index]) };
  });

  if (execution.timedOut) return { verdict: SubmissionStatus.TIME_LIMIT_EXCEEDED, error: `Time Limit Exceeded (${problem.time_limit_ms}ms per testcase)`, cases };
  if (execution.outputTruncated) return { verdict: SubmissionStatus.RUNTIME_ERROR, error: "Output Limit Exceeded", cases };
  if (execution.exitCode !== 0 || cases.some((runCase) => runCase.output === null)) {
    return { verdict: SubmissionStatus.RUNTIME_ERROR, error: execution.stderr || "Runtime Error", cases };
  }

  return { verdict: cases.every((runCase) => runCase.passed) ? SubmissionStatus.ACCEPTED : SubmissionStatus.WRONG_ANSWER, cases };
};

export default problemRunJob;
