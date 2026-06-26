import { dockerExecutor } from "../../utilities/dockerUtils";
import { MAX_EXECUTION_TIME_IN_MS } from "../../zodValidations/variablesUsedInValidations";

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

  // 2. Construct the shell script.
  // We use bash "Here Documents" (cat << EOF) to write the user's code directly
  // into the container's blazing-fast RAM disk (/workspace) without touching the host hard drive.
  //   const shellScript = `
  // cat << 'EOF' > /workspace/${fileName}
  // ${code}
  // EOF
  // cat << 'EOF' > /workspace/input.txt
  // ${stdin}
  // EOF
  // ${runCommand}
  // `;

  // 3. Execute using the try...finally pattern to prevent memory/container leaks
  try {
    await Promise.all([
      dockerExecutor({
        container,
        command: `cat > /workspace/${fileName}`,
        stdin: code
      }),

      dockerExecutor({
        container,
        command: "cat > /workspace/input.txt",
        stdin
      })
    ]);
    return await dockerExecutor({
      container,
      command: runCommand,
      timeoutMs
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
