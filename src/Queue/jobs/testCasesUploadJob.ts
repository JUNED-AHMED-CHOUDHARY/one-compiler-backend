import fs from "node:fs";
import fsPromises from "node:fs/promises";
import { pipeline } from "node:stream/promises"; // Native backpressure management

import { Job, Processor } from "bullmq";
import mongoose from "mongoose";
import pLimit from "p-limit";
import unzipper, { type Entry } from "unzipper";

import { GRIDFS_IO_CONCURRENCY } from "../../constants/databaseConstants";
import TestCasesServices from "../../dbServices/mongo/testCasesServices";
import { PROBLEM_SELECTS } from "../../dbServices/problemSelects";
import ProblemServices from "../../dbServices/problemServices";
import { Testcase } from "../../models/testcases.model";
import { HarnessCaseRefs, HarnessPayloadBuilder } from "../../services/judge/buildHarnessPayload";
import { TestCaseCacheService } from "../../services/judge/TestCaseCacheService";
import { logger } from "../../services/logger";
import { createByteCountingTransform } from "../../utilities/streamUtils";

const REGEX_FOR_FILE_NAME_MATCH = /(input|expected)_(\d+)\.(in|out)$/;

interface MapValue {
  inputGridFsObjectId?: mongoose.Types.ObjectId;
  outputGridFsObjectId?: mongoose.Types.ObjectId;
  totalInputSize: number;
}

/**
 * Streams an unzipped entry straight into GridFS with backpressure handling
 */
const streamToGridFs = async (
  entry: Entry,
  bucket: mongoose.mongo.GridFSBucket,
  fileName: string
): Promise<{ gridFsObjectId: mongoose.Types.ObjectId; totalInputSize: number }> => {
  let totalInputSize = 0;

  const counter = createByteCountingTransform((total) => {
    totalInputSize = total;
  });

  // Balanced 255KB chunk sizes prevent bloated allocations for text tokens
  const uploadStream = bucket.openUploadStream(fileName, {
    chunkSizeBytes: 255 * 1024
  });

  // pipeline automatically returns a promise, clears listeners, and handles backpressure
  await pipeline(entry, counter, uploadStream);

  return {
    gridFsObjectId: uploadStream.id as mongoose.Types.ObjectId,
    totalInputSize
  };
};

const cleanupLocalFile = async (filePath: string | null | undefined) => {
  if (!filePath) return;
  await fsPromises.unlink(filePath).catch(() => undefined);
};

const testCasesUploadJob: Processor = async (job: Job) => {
  const startedAt = Date.now();
  const { problemId, filePath } = job.data;

  const newlyUploadedGridFsIds: mongoose.Types.ObjectId[] = [];
  let uploadedHarnessId: mongoose.Types.ObjectId | null = null;
  let harnessTempPath: string | null = null;
  let mongoCommitted = false;

  try {
    logger.info(`[BullMQ] Starting parallelized test cases upload for problem ${problemId}`, { filePath });

    const problem = await ProblemServices.getProblemById(problemId, PROBLEM_SELECTS.harness);
    if (!problem) throw new Error(`Problem ${problemId} not found`);

    const previousHarnessId = problem.harness_payload_gridfs_id;
    const previousTestcases = await TestCasesServices.getTestcasesByQuery({ problem_id: problemId });
    const previousCaseGridFsIds = previousTestcases.flatMap((tc) => [tc.input_data_gridfs_id, tc.expected_output_gridfs_id]);

    const bucket = TestCasesServices.createBucketForTestCases();
    const testCasesMap = new Map<number, MapValue>();

    const limit = pLimit(GRIDFS_IO_CONCURRENCY);
    const uploadPromises: Promise<void>[] = [];

    // Process the ZIP sequentially as a streaming transaction
    const zipReadStream = fs.createReadStream(filePath);

    await new Promise<void>((resolve, reject) => {
      zipReadStream
        .pipe(unzipper.Parse())
        .on("entry", (entry: Entry) => {
          const match = entry.path.match(REGEX_FOR_FILE_NAME_MATCH);

          if (!match || entry.type === "Directory") {
            entry.autodrain(); // Keep memory clear from unused objects
            return;
          }

          const index = parseInt(match[2], 10);
          const extension = match[3] as "in" | "out";
          const fileName = `${problemId}_${index}.${extension}`;

          // Add asynchronous wrapper task to queue pool
          const task = limit(async () => {
            try {
              const { totalInputSize, gridFsObjectId } = await streamToGridFs(entry, bucket, fileName);
              newlyUploadedGridFsIds.push(gridFsObjectId);

              // Thread-safe mutating within JavaScript engine execution loop
              if (!testCasesMap.has(index)) {
                testCasesMap.set(index, { totalInputSize: 0 });
              }
              const row = testCasesMap.get(index)!;
              row.totalInputSize += totalInputSize;

              if (extension === "in") row.inputGridFsObjectId = gridFsObjectId;
              else row.outputGridFsObjectId = gridFsObjectId;
            } catch (err) {
              entry.autodrain();
              throw err;
            }
          });

          uploadPromises.push(task);
        })
        .on("close", () => resolve())
        .on("error", (err) => reject(err));
    });

    await Promise.all(uploadPromises);

    const mongoDocs: Omit<Testcase, "createdAt" | "updatedAt">[] = [];
    const harnessCaseRefs: HarnessCaseRefs[] = [];

    for (const [index, mapValue] of testCasesMap.entries()) {
      if (!mapValue.inputGridFsObjectId) continue;

      mongoDocs.push({
        problem_id: problemId,
        input_data_gridfs_id: mapValue.inputGridFsObjectId,
        expected_output_gridfs_id: mapValue.outputGridFsObjectId,
        is_hidden: true,
        payload_size_bytes: mapValue.totalInputSize,
        test_case_number: index
      });

      harnessCaseRefs.push({
        testCaseNumber: index,
        inputGridFsId: mapValue.inputGridFsObjectId,
        expectedOutputGridFsId: mapValue.outputGridFsObjectId
      });
    }

    if (mongoDocs.length === 0) {
      throw new Error("No valid testcases found in ZIP");
    }

    const built = await HarnessPayloadBuilder.buildToTempFile(problemId, harnessCaseRefs);
    harnessTempPath = built.absolutePath;
    uploadedHarnessId = await HarnessPayloadBuilder.uploadFileToGridFs(problemId, built.absolutePath);

    logger.info(`[BullMQ] Pre-built harness uploaded for ${problemId}: ${built.testcaseCount} cases, ${built.bytes} bytes`);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await TestCasesServices.deleteManyTestCasesByProblemId(problemId, session);
      await TestCasesServices.insertManyTestCases(mongoDocs, session);
      await session.commitTransaction();
      mongoCommitted = true;
    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    } finally {
      await session.endSession();
    }

    await ProblemServices.updateProblemById(problemId, { harness_payload_gridfs_id: uploadedHarnessId.toHexString() }, { select: { id: true } });

    await TestCasesServices.deleteGridFsFilesByIds(previousCaseGridFsIds);
    if (previousHarnessId) {
      await TestCasesServices.deleteGridFsFileById(previousHarnessId);
    }

    await TestCaseCacheService.invalidate(problemId);
    await cleanupLocalFile(harnessTempPath);
    harnessTempPath = null;
    uploadedHarnessId = null;

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    logger.info(`[BullMQ] Test cases uploaded for problem ${problemId} successfully in ${Date.now() - startedAt}ms`);
  } catch (error) {
    if (!mongoCommitted) {
      await TestCasesServices.deleteGridFsFilesByIds(newlyUploadedGridFsIds);
      if (uploadedHarnessId) {
        await TestCasesServices.deleteGridFsFileById(uploadedHarnessId);
      }
    } else if (uploadedHarnessId) {
      const latest = await ProblemServices.getProblemById(problemId, PROBLEM_SELECTS.harness).catch(() => null);
      if (latest && latest.harness_payload_gridfs_id !== uploadedHarnessId.toHexString()) {
        await TestCasesServices.deleteGridFsFileById(uploadedHarnessId);
      }
    }

    await cleanupLocalFile(harnessTempPath);

    const maxAttempts = job.opts.attempts || 1;
    const currentAttempt = job.attemptsMade + 1;
    logger.error(`[BullMQ] Attempt ${currentAttempt}/${maxAttempts} failed for problem ${problemId}`, { error });

    if (currentAttempt >= maxAttempts && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    throw error;
  }
};

export default testCasesUploadJob;
