import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import mongoose from "mongoose";
import pLimit from "p-limit";

import { GRIDFS_IO_CONCURRENCY } from "../../constants/databaseConstants";
import { HARNESS_CACHE_DIR } from "../../constants/middlewareConstants";
import TestCasesServices from "../../dbServices/mongo/testCasesServices";
import { streamToString } from "../../utilities/streamUtils";
import { logger } from "../logger";

export type HarnessCaseRefs = {
  testCaseNumber: number;
  inputGridFsId: mongoose.Types.ObjectId;
  expectedOutputGridFsId?: mongoose.Types.ObjectId | null;
};

export type BuiltHarnessFile = {
  absolutePath: string;
  testcaseCount: number;
  bytes: number;
};

/**
 * Builds harness stdin on disk from GridFS case files (ordered, concurrency-capped).
 * Avoids holding the full ~80MB+ payload as one giant JS string in RAM.
 */
export class HarnessPayloadBuilder {
  static async buildToTempFile(problemId: string, cases: HarnessCaseRefs[]): Promise<BuiltHarnessFile> {
    if (cases.length === 0) {
      throw new Error("Cannot build harness payload with zero testcases");
    }

    const ordered = [...cases].sort((a, b) => a.testCaseNumber - b.testCaseNumber);
    await fsPromises.mkdir(HARNESS_CACHE_DIR, { recursive: true });

    const absolutePath = path.join(HARNESS_CACHE_DIR, `${problemId}.harness.build.${process.pid}.${Date.now()}.tmp`);
    const startedAt = Date.now();
    const bucket = TestCasesServices.createBucketForTestCases();
    const writeStream = fs.createWriteStream(absolutePath, { highWaterMark: 1024 * 1024 });

    writeStream.write(`${ordered.length}\n`);

    let nextToWrite = 0;
    const ready = new Map<number, string>();

    const flush = () => {
      while (ready.has(nextToWrite)) {
        writeStream.write(ready.get(nextToWrite)!);
        ready.delete(nextToWrite);
        nextToWrite += 1;
      }
    };

    const limit = pLimit(GRIDFS_IO_CONCURRENCY);

    await Promise.all(
      ordered.map((tc, index) =>
        limit(async () => {
          if (!tc.expectedOutputGridFsId) {
            throw new Error(`Testcase ${tc.testCaseNumber} is missing expected output`);
          }

          const [inputRaw, expectedRaw] = await Promise.all([
            streamToString(bucket.openDownloadStream(tc.inputGridFsId)),
            streamToString(bucket.openDownloadStream(tc.expectedOutputGridFsId))
          ]);

          ready.set(index, `${inputRaw.replace(/\s+$/u, "")}\n${expectedRaw.trim()}\n`);
          flush();
        })
      )
    );

    flush();

    if (nextToWrite !== ordered.length) {
      await fsPromises.unlink(absolutePath).catch(() => undefined);
      throw new Error(`Harness build incomplete for ${problemId}: wrote ${nextToWrite}/${ordered.length} cases`);
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });

    const stat = await fsPromises.stat(absolutePath);
    logger.info(`[HarnessPayloadBuilder] Built temp harness for ${problemId}: ${ordered.length} cases, ${stat.size} bytes in ${Date.now() - startedAt}ms`);

    return {
      absolutePath,
      testcaseCount: ordered.length,
      bytes: stat.size
    };
  }

  static async uploadFileToGridFs(problemId: string, absolutePath: string): Promise<mongoose.Types.ObjectId> {
    const bucket = TestCasesServices.createBucketForTestCases();

    return await new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(`${problemId}.harness.in`, {
        metadata: { problem_id: problemId, kind: "harness_payload" },
        chunkSizeBytes: 2 * 1024 * 1024 // 2MB
      });

      uploadStream.on("error", reject);
      uploadStream.on("finish", () => resolve(uploadStream.id as mongoose.Types.ObjectId));

      const readStream = fs.createReadStream(absolutePath, { highWaterMark: 1024 * 1024 });
      readStream.on("error", reject);
      readStream.pipe(uploadStream);
    });
  }

  static async downloadGridFsToFile(harnessGridFsId: string, destinationPath: string): Promise<number> {
    const bucket = TestCasesServices.createBucketForTestCases();
    const tmpPath = `${destinationPath}.${process.pid}.${Date.now()}.tmp`;

    try {
      await pipeline(bucket.openDownloadStream(new mongoose.Types.ObjectId(harnessGridFsId)), fs.createWriteStream(tmpPath, { highWaterMark: 1024 * 1024 }));
      await fsPromises.rename(tmpPath, destinationPath);
    } catch (error) {
      await fsPromises.unlink(tmpPath).catch(() => undefined);
      throw error;
    }

    const stat = await fsPromises.stat(destinationPath);
    return stat.size;
  }
}
