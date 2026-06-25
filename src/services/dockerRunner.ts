import { spawn } from "child_process";

import { MAX_EXECUTION_TIME_IN_MS, MAX_OUTPUT_LENGTH } from "../zodValidations/variablesUsedInValidations";

import { poolManager } from "./PoolManager"; // Make sure path is correct

export type SUPPORTED_PROGRAMMING_LANGUAGES = "cpp" | "javascript" | "python";

interface LanguageExecutionConfig {
  fileName: string;
  runCommand: string;
}

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  // eslint-disable-next-line no-undef
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  executionTimeMs: number;
  outputTruncated: boolean;
}

const getLanguageExecutionConfig = (language: SUPPORTED_PROGRAMMING_LANGUAGES): LanguageExecutionConfig => {
  switch (language) {
    case "cpp":
      return {
        fileName: "main.cpp",
        runCommand: "g++ main.cpp -o main && chmod +x main && ./main < input.txt"
      };

    case "javascript":
      return {
        fileName: "index.js",
        runCommand: "node index.js < input.txt"
      };

    case "python":
      return {
        fileName: "main.py",
        runCommand: "python main.py < input.txt"
      };

    default:
      throw new Error(`Unsupported language: ${language}`);
  }
};

export const runCodeInContainer = async (
  jobId: string,
  language: SUPPORTED_PROGRAMMING_LANGUAGES,
  code: string,
  stdin: string,
  timeoutMs = MAX_EXECUTION_TIME_IN_MS
): Promise<CodeExecutionResult> => {
  const { fileName, runCommand } = getLanguageExecutionConfig(language);

  // 1. Acquire a pre-warmed container. (Throws error if queue is exhausted, triggering BullMQ retry)
  const container = await poolManager.acquire(language);
  const executionStartedAt = Date.now();

  // 2. Construct the shell script.
  // We use bash "Here Documents" (cat << EOF) to write the user's code directly
  // into the container's blazing-fast RAM disk (/workspace) without touching the host hard drive.
  const shellScript = `
cat << 'EOF' > /workspace/${fileName}
${code}
EOF
cat << 'EOF' > /workspace/input.txt
${stdin}
EOF
${runCommand}
`;

  // 3. Execute using the try...finally pattern to prevent memory/container leaks
  try {
    return await new Promise((resolve, reject) => {
      // We use "exec" to run inside the ALREADY RUNNING warm container
      const child = spawn("docker", ["exec", "-i", container.name, "sh", "-c", shellScript]);

      let stdoutData = "";
      let stderrData = "";
      let outputTruncated = false;
      let timedOut = false;
      let isSettled = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
        settle({
          exitCode: null,
          signal: "SIGKILL"
        });
      }, timeoutMs);

      // eslint-disable-next-line no-undef
      const settle = ({ exitCode, signal }: { exitCode: number | null; signal: NodeJS.Signals | null }) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timeoutId);

        resolve({
          stdout: stdoutData.trim(),
          stderr: stderrData.trim(),
          exitCode,
          signal,
          timedOut,
          executionTimeMs: Date.now() - executionStartedAt,
          outputTruncated
        });
      };

      child.stdout.on("data", (data) => {
        stdoutData += data.toString();
        if (stdoutData.length > MAX_OUTPUT_LENGTH) {
          outputTruncated = true;
          child.kill("SIGKILL");
          stdoutData = stdoutData.substring(0, MAX_OUTPUT_LENGTH) + "\n...[Output Truncated]";
        }
      });

      child.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      child.on("close", (exitCode, signal) => {
        settle({ exitCode, signal });
      });

      child.on("error", (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Process Error: ${error.message}`));
      });
    });
  } finally {
    // 4. THE GUARANTEE: This runs no matter what happens above.
    // It safely releases the container so it can be scrubbed and given to the next user.
    void poolManager.release(container).catch((err) => {
      console.error(`[Job ${jobId}] Failed to release container ${container.name}:`, err);
    });
  }
};

export const runProgrammingLanguagesCode = async (jobId: string, language: SUPPORTED_PROGRAMMING_LANGUAGES, code: string, stdin: string): Promise<string> => {
  const result = await runCodeInContainer(jobId, language, code, stdin);

  if (result.timedOut) return `Execution Error: Time Limit Exceeded (${MAX_EXECUTION_TIME_IN_MS} milliseconds)`;

  // Preserve the old playground behavior: stderr wins, otherwise return stdout.
  if (result.stderr) return result.stderr;

  return result.stdout;
};
