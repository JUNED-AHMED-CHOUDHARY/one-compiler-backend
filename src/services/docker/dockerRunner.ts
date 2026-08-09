import { MAX_EXECUTION_TIME_IN_MS } from "../../zodValidations/variablesUsedInValidations";
import { logger } from "../logger";

import { dockerExecutor } from "./containerExecutor";
import { poolManager } from "./PoolManager";
import { SUPPORTED_PROGRAMMING_LANGUAGES } from "./types";

export type { SUPPORTED_PROGRAMMING_LANGUAGES };

interface LanguageExecutionConfig {
  fileName: string;
  // Playground: runs solution and returns stdout directly
  playgroundRunCommand: string;
  // Optional compile step (compiled languages only). Run once before any test execution.
  compileCommand?: string;
  // Judge single testcase: runs against input.txt, diffs against expected.txt inside container
  judgeRunCommand: string;
  // Harness judge: reads N + (input, expected)*N from stdin; prints SUCCESS:ALL_PASSED or FAIL:...
  batchRunCommand: string;
}

const DIFF_NORMALIZE = "diff -w /workspace/actual.txt /workspace/expected.txt";

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  executionTimeMs: number;
  outputTruncated: boolean;
}

export const getLanguageExecutionConfig = (language: SUPPORTED_PROGRAMMING_LANGUAGES): LanguageExecutionConfig => {
  switch (language) {
    case "cpp":
      return {
        fileName: "main.cpp",
        playgroundRunCommand: "g++ main.cpp -o main && chmod +x main && ./main < input.txt",
        compileCommand: "g++ -O2 /workspace/main.cpp -o /workspace/main",
        judgeRunCommand: `sh -c '/workspace/main < /workspace/input.txt > /workspace/actual.txt && ${DIFF_NORMALIZE}'`,
        batchRunCommand: "/workspace/main"
      };

    case "javascript":
      return {
        fileName: "index.js",
        playgroundRunCommand: "node index.js < input.txt",
        judgeRunCommand: `node index.js < input.txt > actual.txt && ${DIFF_NORMALIZE}`,
        batchRunCommand: "node /workspace/index.js"
      };

    case "python":
      return {
        fileName: "main.py",
        playgroundRunCommand: "python main.py < input.txt",
        judgeRunCommand: `python main.py < input.txt > actual.txt && ${DIFF_NORMALIZE}`,
        batchRunCommand: "python /workspace/main.py"
      };

    default:
      throw new Error(`Unsupported language: ${language}`);
  }
};

export const formatCodeExecutionOutput = (result: CodeExecutionResult, timeoutMs: number): string => {
  if (result.timedOut) return `Execution Error: Time Limit Exceeded (${timeoutMs} milliseconds)`;
  if (result.stderr) return result.stderr;
  return result.stdout;
};

export const runCodeInContainer = async (
  jobId: string,
  language: SUPPORTED_PROGRAMMING_LANGUAGES,
  code: string,
  stdin: string,
  timeoutMs = MAX_EXECUTION_TIME_IN_MS
): Promise<CodeExecutionResult> => {
  const { fileName, playgroundRunCommand } = getLanguageExecutionConfig(language);

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
      command: playgroundRunCommand,
      timeoutMs
    });
  } finally {
    void poolManager.release(container).catch((err) => {
      logger.error(`[Job ${jobId}] Failed to release container ${container.name}:`, err);
    });
  }
};

export const runProgrammingLanguagesCode = async (jobId: string, language: SUPPORTED_PROGRAMMING_LANGUAGES, code: string, stdin: string): Promise<string> => {
  const result = await runCodeInContainer(jobId, language, code, stdin);

  return formatCodeExecutionOutput(result, MAX_EXECUTION_TIME_IN_MS);
};
