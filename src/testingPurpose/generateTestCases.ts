/**
 * Standalone script to generate load-test test cases and ZIP them.
 *
 * Usage:
 *   npm run generate:testcases
 *
 * Output:
 *   src/testingPurpose/verifypublishtestcases/   <- individual input_N.txt / expected_N.txt files
 *   src/testingPurpose/testcases.zip             <- ready-to-upload ZIP
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const NUM_TESTCASES = 10; // increase to 1000+ for extreme load
const OUTPUT_DIR = path.join(__dirname, "verifypublishtestcases");
const ZIP_PATH = path.join(__dirname, "testcases-small.zip");
// ──────────────────────────────────────────────────────────────────────────────

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateFiles() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Generating ${NUM_TESTCASES} test cases in ${OUTPUT_DIR}...`);

  for (let i = 1; i <= NUM_TESTCASES; i++) {
    let n: number;

    if (i <= 50) {
      n = getRandomInt(1, 100);
    } else if (i <= 200) {
      n = getRandomInt(100, 10_000);
    } else {
      n = getRandomInt(10_000, 100_000);
    }

    const arr: number[] = [];
    let expectedSum = 0n;

    for (let j = 0; j < n; j++) {
      const num = getRandomInt(-1_000_000, 1_000_000);
      arr.push(num);
      expectedSum += BigInt(num);
    }

    const inputData = `${n}\n${arr.join(" ")}`;
    const expectedData = expectedSum.toString();

    fs.writeFileSync(path.join(OUTPUT_DIR, `input_${i}.in`), inputData);
    fs.writeFileSync(path.join(OUTPUT_DIR, `expected_${i}.out`), expectedData);

    if (i % 50 === 0) console.log(`  Created ${i} / ${NUM_TESTCASES} test cases...`);
  }

  console.log(`\nDone generating files.`);
}

function createZip() {
  console.log(`\nZipping files → ${ZIP_PATH}`);

  // Remove existing ZIP so Compress-Archive doesn't prompt
  if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);

  execSync(`Compress-Archive -Path "${OUTPUT_DIR}\\*" -DestinationPath "${ZIP_PATH}"`, { shell: "powershell.exe", stdio: "inherit" });

  const sizeMB = (fs.statSync(ZIP_PATH).size / 1024 / 1024).toFixed(2);
  console.log(`ZIP created: ${sizeMB} MB`);
}

generateFiles();
createZip();
console.log(`\nAll done! ZIP is ready at:\n  ${ZIP_PATH}`);
console.log(`\nUpload via:\n  POST /problems/:problemId/testcases-upload`);
console.log(`  field name: testcaseZipFile`);
