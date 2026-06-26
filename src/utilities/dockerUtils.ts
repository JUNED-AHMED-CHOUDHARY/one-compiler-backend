import { spawn } from "child_process";
import { Readable } from "stream";

import { ContainerState } from "../services/docker/PoolManager";
import { MAX_EXECUTION_TIME_IN_MS, MAX_OUTPUT_LENGTH } from "../zodValidations/variablesUsedInValidations";


export interface DockerExecutorOptions {
  container: ContainerState;

  command: string;

  stdin?: string | Readable;

  timeoutMs?: number;

  maxOutputLength?: number;
}

export interface DockerExecutorResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  executionTimeMs: number;
  outputTruncated: boolean;
}

export const dockerExecutor = async ({
  container,
  command,
  stdin,
  timeoutMs = MAX_EXECUTION_TIME_IN_MS,
  maxOutputLength = MAX_OUTPUT_LENGTH
}: DockerExecutorOptions): Promise<DockerExecutorResult> => {
  const executionStartedAt = Date.now();

  return await new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", container.name, "sh", "-c", command]);

    let stdout = "";
    let stderr = "";

    let timedOut = false;
    let outputTruncated = false;
    let settled = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");

      settle(null, "SIGKILL");
    }, timeoutMs);

    const settle = (exitCode: number | null, signal: NodeJS.Signals | null) => {
      if (settled) return;

      settled = true;

      clearTimeout(timeout);

      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
        signal,
        timedOut,
        executionTimeMs: Date.now() - executionStartedAt,
        outputTruncated
      });
    };

    //
    // stdin
    //

    if (typeof stdin === "string") {
      child.stdin.write(stdin);
      child.stdin.end();
    } else if (stdin) {
      stdin.pipe(child.stdin);

      stdin.on("error", reject);
    } else {
      child.stdin.end();
    }

    //
    // stdout
    //

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();

      if (stdout.length > maxOutputLength) {
        outputTruncated = true;

        stdout = stdout.substring(0, maxOutputLength) + "\n...[Output Truncated]";

        child.kill("SIGKILL");
      }
    });

    //
    // stderr
    //

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", settle);

    child.on("error", (err) => {
      clearTimeout(timeout);

      reject(err);
    });
  });
};
