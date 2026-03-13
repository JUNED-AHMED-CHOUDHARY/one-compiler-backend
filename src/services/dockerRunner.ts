import { exec } from "child_process";
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
    let dockerCmd = "";

    // 🛡️ THE SHIELD: No internet, max 256 RAM, max half a CPU core
    const securityFlags = `--rm --network none --memory="256m" --cpus="0.5" -v "${jobDir}:/app" -w /app`;

    switch (language) {
      case "cpp":
        fileName = "main.cpp";
        dockerCmd = `docker run ${securityFlags} gcc:13 sh -c "g++ main.cpp -o main && ./main < input.txt"`;
        break;

      case "javaScript":
        fileName = "index.js";
        dockerCmd = `docker run ${securityFlags} node:20-alpine sh -c "node index.js < input.txt"`;
        break;

      case "python":
        fileName = "main.py";
        dockerCmd = `docker run ${securityFlags} python:3.11-alpine sh -c "python main.py < input.txt"`;
        break;

      default:
        fs.rmSync(jobDir, { recursive: true, force: true });
        return reject(`Unsupported language: ${language}`);
    }

    // Write the code file
    fs.writeFileSync(path.join(jobDir, fileName), code);
    // Write the stdin file (even if it's empty, we create it so the '< input.txt' command doesn't crash)
    fs.writeFileSync(path.join(jobDir, "input.txt"), stdin);
    console.log(`[Job ${jobId}] Running ${language} code. Starting Docker...`);

    // 4. Execute the container
    exec(dockerCmd, { timeout: 7000 }, (error, stdout, stderr) => {
      // Clean up the directory immediately after execution
      fs.rmSync(jobDir, { recursive: true, force: true });
      console.log(`[Job ${jobId}] Cleaned up workspace.`);

      if (error) {
        // If Node.js killed the process because of the timeout
        if (error.killed) {
          return resolve(`Execution Error: Time Limit Exceeded (7 seconds)`);
        }
        return reject(`Execution Error: ${error.message}`);
      }
      if (stderr) {
        return resolve(`Compiler/Runtime Stderr:\n${stderr}`);
      }

      resolve(stdout);
    });
  });
};
