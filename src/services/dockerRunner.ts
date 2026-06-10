import { spawn } from "child_process";

import { MAX_EXECUTION_TIME_IN_MS, MAX_OUTPUT_LENGTH } from "../zodValidations/variablesUsedInValidations";

import { poolManager } from "./PoolManager"; // Make sure path is correct

export type SUPPORTED_PROGRAMMING_LANGUAGES = "cpp" | "javascript" | "python";

export const runProgrammingLanguagesCode = async (jobId: string, language: SUPPORTED_PROGRAMMING_LANGUAGES, code: string, stdin: string): Promise<string> => {
  // 1. Acquire a pre-warmed container. (Throws error if queue is exhausted, triggering BullMQ retry)
  const container = await poolManager.acquire(language);

  // 2. Map language to file names and commands using a clean switch statement
  let fileName = "";
  let runCommand = "";

  switch (language) {
    case "cpp":
      fileName = "main.cpp";
      runCommand = "g++ main.cpp -o main && chmod +x main && ./main < input.txt";
      break;

    case "javascript":
      fileName = "index.js";
      runCommand = "node index.js < input.txt";
      break;

    case "python":
      fileName = "main.py";
      runCommand = "python main.py < input.txt";
      break;

    default:
      // If language is unsupported, release the container immediately and throw
      await poolManager.release(container);
      throw new Error(`Unsupported language: ${language}`);
  }

  // 3. Construct the shell script.
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

  // 4. Execute using the try...finally pattern to prevent memory/container leaks
  try {
    return await new Promise((resolve, reject) => {
      // We use "exec" to run inside the ALREADY RUNNING warm container
      const child = spawn("docker", ["exec", "-i", container.name, "sh", "-c", shellScript]);

      let stdoutData = "";
      let stderrData = "";

      child.stdout.on("data", (data) => {
        stdoutData += data.toString();
        if (stdoutData.length > MAX_OUTPUT_LENGTH) {
          child.kill("SIGKILL");
          stdoutData = stdoutData.substring(0, MAX_OUTPUT_LENGTH) + "\n...[Output Truncated]";
        }
      });

      child.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      const timeoutId = setTimeout(() => {
        child.kill("SIGKILL");
        resolve(`Execution Error: Time Limit Exceeded (${MAX_EXECUTION_TIME_IN_MS} milliseconds)`);
      }, MAX_EXECUTION_TIME_IN_MS);

      child.on("close", () => {
        clearTimeout(timeoutId);

        if (stderrData) {
          // Runtime errors and compiler warnings go to stderr
          return resolve(stderrData.trim());
        }
        resolve(stdoutData.trim());
      });

      child.on("error", (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Process Error: ${error.message}`));
      });
    });
  } finally {
    // 5. THE GUARANTEE: This runs no matter what happens above.
    // It safely releases the container so it can be scrubbed and given to the next user.
    void poolManager.release(container).catch((err) => {
      console.error(`[Job ${jobId}] Failed to release container ${container.name}:`, err);
    });
  }
};
