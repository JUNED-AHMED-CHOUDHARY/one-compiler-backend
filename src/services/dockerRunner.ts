import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

export type SUPPORTED_PROGRAMMING_LANGUAGES = "cpp" | "javaScript" | "python";

export const runProgrammingLanguagesCode = async (jobId: string, language: SUPPORTED_PROGRAMMING_LANGUAGES, code: string, stdin: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. Define paths inside your existing project root
    const jobDir = path.resolve(__dirname, "../temp", jobId); // Adjust '../temp' based on where this file is

    // 2. Setup the temporary directory
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }
    let fileName = "";
    let dockerImage = "";
    let runCommand = "";
    // 🛡️ THE SHIELD: No internet, max 256 RAM, max half a CPU core
    const securityArgs = ["--rm", "--network", "none", "--memory", "256m", "--cpus", "0.5", "--pids-limit", "64", "-v", `${jobDir}:/app`, "-w", "/app"];

    switch (language) {
      case "cpp":
        fileName = "main.cpp";
        dockerImage = "gcc:13";
        runCommand = "g++ main.cpp -o main && ./main < input.txt";
        break;

      case "javaScript":
        fileName = "index.js";
        dockerImage = "node:20-alpine";
        runCommand = "node index.js < input.txt";
        break;

      case "python":
        fileName = "main.py";
        dockerImage = "python:3.11-alpine";
        runCommand = "python main.py < input.txt";
        break;

      default:
        fs.rmSync(jobDir, { recursive: true, force: true });
        return reject(`Unsupported language: ${language}`);
    }

    // Write the code file
    fs.writeFileSync(path.join(jobDir, fileName), code);
    fs.writeFileSync(path.join(jobDir, "input.txt"), stdin);
    console.log(`[Job ${jobId}] Running ${language} code. Starting Docker...`);

    // Build the final array of arguments for spawn
    const dockerArgs = ["run", ...securityArgs, dockerImage, "sh", "-c", runCommand];

    const child = spawn("docker", dockerArgs);
    // 4. Execute the container
    let stdoutData = "";
    let stderrData = "";

    // 🛡️ Output truncation limit (e.g., 500 KB)
    const MAX_OUTPUT_LENGTH = 500 * 1024;

    child.stdout.on("data", (data) => {
      stdoutData += data.toString();
      if (stdoutData.length > MAX_OUTPUT_LENGTH) {
        child.kill("SIGKILL"); // Kill process if output is too large
        stdoutData = stdoutData.substring(0, MAX_OUTPUT_LENGTH) + "\n...[Output Truncated]";
      }
    });

    child.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    // ⏱️ Timeout handling
    const timeoutId = setTimeout(() => {
      child.kill("SIGKILL"); // Kill the Node.js child process
      // Note: If Docker daemon hangs, the container might still exist.
      // A robust system runs a separate cleanup cron job for orphaned containers.
      resolve(`Execution Error: Time Limit Exceeded (7 seconds)`);
    }, 7000);

    child.on("close", () => {
      clearTimeout(timeoutId); // Clear timeout since execution finished

      // Robust cleanup: Wrap in try/catch in case file locks cause issues
      try {
        if (fs.existsSync(jobDir)) {
          fs.rmSync(jobDir, { recursive: true, force: true });
          console.log(`[Job ${jobId}] Cleaned up workspace.`);
        }
      } catch (cleanupError) {
        console.error(`[Job ${jobId}] Failed to clean up:`, cleanupError);
      }

      // Return results
      if (stderrData) {
        // Some compilers write to stderr even on success, but runtime errors also go here.
        return resolve(stderrData.trim());
      }

      resolve(stdoutData.trim());
    });

    child.on("error", (error) => {
      clearTimeout(timeoutId);
      reject(`Process Error: ${error.message}`);
    });
  });
};
