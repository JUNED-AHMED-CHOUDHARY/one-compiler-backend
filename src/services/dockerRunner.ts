import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";

export const runCppCode = async (jobId: string, code: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. Define paths inside your existing project root
    const jobDir = path.resolve(__dirname, "../temp", jobId); // Adjust '../temp' based on where this file is
    const filePath = path.join(jobDir, "main.cpp");

    // 2. Setup the temporary directory
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }
    fs.writeFileSync(filePath, code);

    console.log(`[Job ${jobId}] Code written to ${filePath}. Starting Docker...`);

    // 3. Construct the Docker command
    const dockerCmd = `docker run --rm -v "${jobDir}:/app" -w /app gcc:13 sh -c "g++ main.cpp -o main && ./main"`;

    // 4. Execute the container
    exec(dockerCmd, (error, stdout, stderr) => {
      // Clean up the directory immediately after execution
      fs.rmSync(jobDir, { recursive: true, force: true });
      console.log(`[Job ${jobId}] Cleaned up workspace.`);

      if (error) {
        return reject(`Execution Error: ${error.message}`);
      }
      if (stderr) {
        return resolve(`Compiler/Runtime Stderr:\n${stderr}`);
      }

      resolve(stdout);
    });
  });
};
