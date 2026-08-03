import { PassThrough, Readable } from "node:stream";

import { MAX_EXECUTION_TIME_IN_MS, MAX_OUTPUT_LENGTH, MAX_STDERR_LENGTH } from "../../zodValidations/variablesUsedInValidations";

import { ContainerExec } from "./containerExec";

export interface DockerExecutorOptions {
  /** Warm-pool container identity (name is enough for Engine API lookup). */
  container: { name: string };
  /** Shell command executed as `sh -c <command>` inside the container. */
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

const shouldAttachStdin = (stdin: string | Readable | undefined): stdin is string | Readable => stdin !== undefined;

/**
 * Execute a command in a warm container via the Docker Engine HTTP/socket API.
 * Avoids spawning the Docker CLI on every call.
 */
export const dockerExecutor = async ({
  container,
  command,
  stdin,
  timeoutMs = MAX_EXECUTION_TIME_IN_MS,
  maxOutputLength = MAX_OUTPUT_LENGTH
}: DockerExecutorOptions): Promise<DockerExecutorResult> => {
  const executionStartedAt = Date.now();
  const dockerContainer = ContainerExec.getContainer(container.name);
  const attachStdin = shouldAttachStdin(stdin);

  const exec = await dockerContainer.exec({
    Cmd: ["sh", "-c", command],
    AttachStdin: attachStdin,
    AttachStdout: true,
    AttachStderr: true,
    Tty: false
  });

  return await new Promise<DockerExecutorResult>((resolve, reject) => {
    let timedOut = false;
    let outputTruncated = false;
    let settled = false;
    let stdoutSize = 0;
    let stderrSize = 0;

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const settle = async (signal: NodeJS.Signals | null = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      try {
        const inspectData = await exec.inspect();
        resolve({
          stdout: Buffer.concat(stdoutChunks).toString("utf-8").trim(),
          stderr: Buffer.concat(stderrChunks).toString("utf-8").trim(),
          exitCode: inspectData.ExitCode ?? null,
          signal,
          timedOut,
          executionTimeMs: Date.now() - executionStartedAt,
          outputTruncated
        });
      } catch (error) {
        reject(error);
      }
    };

    let rawStream: (NodeJS.ReadWriteStream & { destroy?: (error?: Error) => void }) | undefined;

    const forceStopExecStream = async () => {
      try {
        rawStream?.destroy?.();
      } catch {
        /* ignore */
      }

      // Best-effort kill of leftover workload; pool recycles on TLE for a clean sandbox.
      try {
        await ContainerExec.runDetached(container.name, ["sh", "-c", "pkill -9 -f '/workspace/' 2>/dev/null || true"]);
      } catch {
        /* ignore */
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      void forceStopExecStream().finally(() => {
        void settle("SIGKILL");
      });
    }, timeoutMs);

    void (async () => {
      try {
        rawStream = (await exec.start({
          hijack: true,
          stdin: attachStdin
        })) as NodeJS.ReadWriteStream;

        const stdoutStream = new PassThrough();
        const stderrStream = new PassThrough();
        dockerContainer.modem.demuxStream(rawStream, stdoutStream, stderrStream);

        stdoutStream.on("data", (chunk: Buffer) => {
          if (settled) return;

          const remaining = maxOutputLength - stdoutSize;
          if (remaining <= 0) return;

          if (chunk.length > remaining) {
            stdoutChunks.push(chunk.subarray(0, remaining));
            stdoutSize = maxOutputLength;
            outputTruncated = true;
            void forceStopExecStream().finally(() => {
              void settle("SIGKILL");
            });
            return;
          }

          stdoutChunks.push(chunk);
          stdoutSize += chunk.length;
        });

        stderrStream.on("data", (chunk: Buffer) => {
          if (settled) return;
          if (stderrSize >= MAX_STDERR_LENGTH) return;

          const remaining = MAX_STDERR_LENGTH - stderrSize;
          if (chunk.length > remaining) {
            stderrChunks.push(chunk.subarray(0, remaining));
            stderrSize = MAX_STDERR_LENGTH;
            return;
          }

          stderrChunks.push(chunk);
          stderrSize += chunk.length;
        });

        rawStream.on("end", () => {
          void settle();
        });

        rawStream.on("error", (error) => {
          if (settled) return;
          clearTimeout(timer);
          reject(error);
        });

        if (attachStdin) {
          const inputStream = typeof stdin === "string" ? Readable.from([stdin]) : stdin;
          inputStream.pipe(rawStream);
          inputStream.on("error", (error) => {
            if (settled) return;
            clearTimeout(timer);
            reject(error);
          });
        }
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    })();
  });
};
