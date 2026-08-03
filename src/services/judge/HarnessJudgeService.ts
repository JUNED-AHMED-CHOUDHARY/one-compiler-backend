import fs from "node:fs";

import { UnrecoverableError } from "bullmq";

import { HARNESS_FAIL_PREFIX, HARNESS_SUCCESS, parseHarnessVerdict } from "../../constants/judgeProtocol";
import { MAX_HARNESS_SUITE_TIMEOUT_MS, MAX_OUTPUT_LENGTH } from "../../zodValidations/variablesUsedInValidations";
import { dockerExecutor, DockerExecutorResult } from "../docker/containerExecutor";
import { ContainerState } from "../docker/PoolManager";

import { CachedHarnessPayload } from "./TestCaseCacheService";

export type HarnessRunResult = {
  execution: DockerExecutorResult;
  /** True when the sandbox should be recycled (TLE / crash / truncated output). */
  shouldRecycleContainer: boolean;
};

/**
 * Shared harness judge operations used by verify/publish and (later) submit jobs.
 */
export class HarnessJudgeService {
  static async writeSourceAndCompile(params: {
    container: ContainerState;
    fileName: string;
    executableCode: string;
    compileCommand?: string;
    compileTimeoutMs?: number;
  }): Promise<void> {
    const { container, fileName, executableCode, compileCommand, compileTimeoutMs = 15000 } = params;

    await dockerExecutor({
      container,
      command: `cat > /workspace/${fileName}`,
      stdin: executableCode
    });

    if (!compileCommand) return;

    const compileResult = await dockerExecutor({
      container,
      command: compileCommand,
      timeoutMs: compileTimeoutMs
    });

    if (compileResult.timedOut) {
      throw new UnrecoverableError("Compilation Error: Time Limit Exceeded");
    }

    if (compileResult.exitCode !== 0) {
      throw new UnrecoverableError(`Compilation Error:\n${compileResult.stderr || compileResult.stdout}`);
    }
  }

  static async runHarness(params: { container: ContainerState; runCommand: string; harnessPayload: CachedHarnessPayload; timeLimitMsPerCase: number }): Promise<HarnessRunResult> {
    const { container, runCommand, harnessPayload, timeLimitMsPerCase } = params;

    const uncappedTimeout = timeLimitMsPerCase * harnessPayload.testcaseCount;
    const timeoutMs = Math.min(Math.max(uncappedTimeout, timeLimitMsPerCase), MAX_HARNESS_SUITE_TIMEOUT_MS);

    const execution = await dockerExecutor({
      container,
      command: runCommand,
      stdin: fs.createReadStream(harnessPayload.absolutePath, { highWaterMark: 512 * 1024 }),
      timeoutMs,
      maxOutputLength: Math.max(MAX_OUTPUT_LENGTH, 64 * 1024)
    });

    const shouldRecycleContainer = execution.timedOut || execution.outputTruncated || execution.exitCode !== 0;

    return { execution, shouldRecycleContainer };
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
