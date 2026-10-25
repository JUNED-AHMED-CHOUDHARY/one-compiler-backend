import fs from "node:fs";

import { ProgrammingLanguage } from "@prisma/client";
import { UnrecoverableError } from "bullmq";

import { buildRunModeStdin, HARNESS_FAIL_PREFIX, HARNESS_SUCCESS, parseHarnessVerdict, parseRunModeOutput, RUN_MODE_FLAG, RunModeCase } from "../../constants/judgeProtocol";
import { getRunnerLanguageFromDBLanguage } from "../../utilities/languageMapper";
import { MAX_HARNESS_SUITE_TIMEOUT_MS, MAX_OUTPUT_LENGTH } from "../../zodValidations/variablesUsedInValidations";
import { dockerExecutor, DockerExecutorResult } from "../docker/containerExecutor";
import { getLanguageExecutionConfig } from "../docker/dockerRunner";
import { ContainerState, poolManager } from "../docker/PoolManager";
import { logger } from "../logger";

import { assembleExecutableCode } from "./assembleExecutableCode";
import { CachedHarnessPayload } from "./TestCaseCacheService";

export type HarnessRunResult = {
  execution: DockerExecutorResult;
  /** True when the sandbox should be recycled (TLE / crash / truncated output). */
  shouldRecycleContainer: boolean;
};

export type RunCasesResult = HarnessRunResult & { cases: RunModeCase[] };

type CompileParams = {
  container: ContainerState;
  fileName: string;
  executableCode: string;
  compileCommand?: string;
  compileTimeoutMs?: number;
};

const suiteTimeoutMs = (timeLimitMsPerCase: number, testcaseCount: number) =>
  Math.min(Math.max(timeLimitMsPerCase * testcaseCount, timeLimitMsPerCase), MAX_HARNESS_SUITE_TIMEOUT_MS);

const shouldRecycle = (execution: DockerExecutorResult) => execution.timedOut || execution.outputTruncated || execution.exitCode !== 0;

/**
 * Shared harness judge operations used by verify/publish, learner run and (later) submit jobs.
 */
export class HarnessJudgeService {
  /** Returns the compilation error message, or null when the source is ready to run. */
  static async tryWriteSourceAndCompile({ container, fileName, executableCode, compileCommand, compileTimeoutMs = 15000 }: CompileParams): Promise<string | null> {
    await dockerExecutor({
      container,
      command: `cat > /workspace/${fileName}`,
      stdin: executableCode
    });

    if (!compileCommand) return null;

    const compileResult = await dockerExecutor({
      container,
      command: compileCommand,
      timeoutMs: compileTimeoutMs
    });

    if (compileResult.timedOut) return "Compilation Error: Time Limit Exceeded";
    if (compileResult.exitCode !== 0) return `Compilation Error:\n${compileResult.stderr || compileResult.stdout}`;

    return null;
  }

  static async writeSourceAndCompile(params: CompileParams): Promise<void> {
    const compileError = await this.tryWriteSourceAndCompile(params);
    if (compileError) throw new UnrecoverableError(compileError);
  }

  static async runHarness(params: { container: ContainerState; runCommand: string; harnessPayload: CachedHarnessPayload; timeLimitMsPerCase: number }): Promise<HarnessRunResult> {
    const { container, runCommand, harnessPayload, timeLimitMsPerCase } = params;

    const execution = await dockerExecutor({
      container,
      command: runCommand,
      stdin: fs.createReadStream(harnessPayload.absolutePath, { highWaterMark: 512 * 1024 }),
      timeoutMs: suiteTimeoutMs(timeLimitMsPerCase, harnessPayload.testcaseCount),
      maxOutputLength: Math.max(MAX_OUTPUT_LENGTH, 64 * 1024)
    });

    return { execution, shouldRecycleContainer: shouldRecycle(execution) };
  }

  /** Runs an already-compiled stub in run mode — see RUN_MODE_FLAG in constants/judgeProtocol.ts. */
  static async runCases(params: { container: ContainerState; runCommand: string; inputs: string[]; timeLimitMsPerCase: number }): Promise<RunCasesResult> {
    const { container, runCommand, inputs, timeLimitMsPerCase } = params;

    const execution = await dockerExecutor({
      container,
      command: `${runCommand} ${RUN_MODE_FLAG}`,
      stdin: buildRunModeStdin(inputs),
      timeoutMs: suiteTimeoutMs(timeLimitMsPerCase, inputs.length)
    });

    return { execution, cases: parseRunModeOutput(execution.stdout), shouldRecycleContainer: shouldRecycle(execution) };
  }

  /** Acquire → assemble → compile → run mode → release, for one solution in its own sandbox. */
  static async compileAndRunCases(params: {
    language: ProgrammingLanguage;
    hiddenStubCode: string;
    solutionCode: string;
    inputs: string[];
    timeLimitMsPerCase: number;
    /** Wait for the sandbox to be back in the pool before returning — needed when the caller acquires the same language next. */
    awaitRelease?: boolean;
  }): Promise<RunCasesResult | { compileError: string }> {
    const { language, hiddenStubCode, solutionCode, inputs, timeLimitMsPerCase, awaitRelease = false } = params;

    let executableCode: string;
    try {
      executableCode = assembleExecutableCode(hiddenStubCode, solutionCode);
    } catch (error) {
      throw new UnrecoverableError(error instanceof Error ? error.message : "Failed to assemble executable code");
    }

    const runnerLanguage = getRunnerLanguageFromDBLanguage(language, UnrecoverableError);
    const { fileName, compileCommand, batchRunCommand } = getLanguageExecutionConfig(runnerLanguage);
    const container = await poolManager.acquire(runnerLanguage);
    let recycleContainer = false;

    try {
      const compileError = await this.tryWriteSourceAndCompile({ container, fileName, executableCode, compileCommand });
      if (compileError) return { compileError };

      const result = await this.runCases({ container, runCommand: batchRunCommand, inputs, timeLimitMsPerCase });
      recycleContainer = result.shouldRecycleContainer;
      return result;
    } finally {
      const release = poolManager.release(container, { recycle: recycleContainer }).catch((err) => logger.error(`Failed to release container ${container.name}: ${err}`));
      if (awaitRelease) await release;
    }
  }

  /** Convert harness execution into pass / UnrecoverableError (BullMQ-friendly). */
  static assertHarnessPassed(execution: DockerExecutorResult, testcaseCount: number): void {
    if (execution.timedOut) {
      throw new UnrecoverableError(`Time Limit Exceeded while running ${testcaseCount} testcases`);
    }

    if (execution.outputTruncated) {
      throw new UnrecoverableError("Harness output truncated — possible invalid stub or excessive logging");
    }

    if (execution.exitCode !== 0) {
      throw new UnrecoverableError(execution.stderr || execution.stdout || "Runtime Error");
    }

    const verdict = parseHarnessVerdict(execution.stdout);

    if (verdict.status === "passed") return;

    if (verdict.status === "failed") {
      throw new UnrecoverableError(`Testcase ${verdict.testCaseNumber}: Wrong Answer (expected ${verdict.expected}, got ${verdict.actual})`);
    }

    throw new UnrecoverableError(
      `Harness did not return a valid verdict. Hidden stubs must print ${HARNESS_SUCCESS} or ${HARNESS_FAIL_PREFIX}<n>:<actual>:<expected>. Got: ${verdict.raw}`
    );
  }
}
