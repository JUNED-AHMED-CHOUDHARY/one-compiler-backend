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
import { mergeProblemMetaData, SampleTestcase } from "../../utilities/problemMetaData";
import { createByteCountingTransform, streamToString } from "../../utilities/streamUtils";
import { MAX_RUN_INPUT_LENGTH } from "../../zodValidations/variablesUsedInValidations";

// `sample_input_3.in` / `sample_expected_3.out` → testcase 3 is also shown to learners as an example.
const REGEX_FOR_FILE_NAME_MATCH = /(sample_)?(input|expected)_(\d+)\.(in|out)$/;

interface MapValue {
  inputGridFsObjectId?: mongoose.Types.ObjectId;
  outputGridFsObjectId?: mongoose.Types.ObjectId;
  totalInputSize: number;
  isSample: boolean;
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

const readSampleTestcases = (bucket: mongoose.mongo.GridFSBucket, refs: HarnessCaseRefs[]): Promise<SampleTestcase[]> =>
  Promise.all(
    [...refs]
      .sort((a, b) => a.testCaseNumber - b.testCaseNumber)
      .map(async ({ inputGridFsId, expectedOutputGridFsId }) => {
        const [input, expected] = await Promise.all([
          streamToString(bucket.openDownloadStream(inputGridFsId)),
          expectedOutputGridFsId ? streamToString(bucket.openDownloadStream(expectedOutputGridFsId)) : ""
        ]);
        return { input: input.trim(), expected: expected.trim() };
      })
  );

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
    const seenFileKeys = new Set<string>();
    const duplicateFilePaths: string[] = [];

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

          const isSample = Boolean(match[1]);
          const index = parseInt(match[3], 10);
          const extension = match[4] as "in" | "out";
          const fileName = `${problemId}_${index}.${extension}`;

          // input_3.in + sample_input_3.in would silently overwrite each other (and leak a GridFS file)
          const fileKey = `${index}.${extension}`;
          if (seenFileKeys.has(fileKey)) {
            duplicateFilePaths.push(entry.path);
            entry.autodrain();
            return;
          }
          seenFileKeys.add(fileKey);

          // Add asynchronous wrapper task to queue pool
          const task = limit(async () => {
            try {
              const { totalInputSize, gridFsObjectId } = await streamToGridFs(entry, bucket, fileName);
              newlyUploadedGridFsIds.push(gridFsObjectId);

              // Thread-safe mutating within JavaScript engine execution loop
              if (!testCasesMap.has(index)) {
                testCasesMap.set(index, { totalInputSize: 0, isSample: false });
              }
              const row = testCasesMap.get(index)!;
              row.totalInputSize += totalInputSize;
              row.isSample ||= isSample;

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

    if (duplicateFilePaths.length > 0) {
      throw new Error(`Duplicate testcase numbers in ZIP: ${duplicateFilePaths.join(", ")}`);
    }

    const mongoDocs: Omit<Testcase, "createdAt" | "updatedAt">[] = [];
    const harnessCaseRefs: HarnessCaseRefs[] = [];
    const sampleCaseRefs: HarnessCaseRefs[] = [];

    for (const [index, mapValue] of testCasesMap.entries()) {
      if (!mapValue.inputGridFsObjectId) continue;

      mongoDocs.push({
        problem_id: problemId,
        input_data_gridfs_id: mapValue.inputGridFsObjectId,
        expected_output_gridfs_id: mapValue.outputGridFsObjectId,
        is_hidden: !mapValue.isSample,
        payload_size_bytes: mapValue.totalInputSize,
        test_case_number: index
      });

      const caseRefs: HarnessCaseRefs = {
        testCaseNumber: index,
        inputGridFsId: mapValue.inputGridFsObjectId,
        expectedOutputGridFsId: mapValue.outputGridFsObjectId
      };
      harnessCaseRefs.push(caseRefs);

      if (!mapValue.isSample) continue;
      if (mapValue.totalInputSize > MAX_RUN_INPUT_LENGTH) {
        throw new Error(`Sample testcase ${index} is too large (input + expected must be <= ${MAX_RUN_INPUT_LENGTH} bytes)`);
      }
      sampleCaseRefs.push(caseRefs);
    }

    if (mongoDocs.length === 0) {
      throw new Error("No valid testcases found in ZIP");
    }

    const sampleTestcases = await readSampleTestcases(bucket, sampleCaseRefs);

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

    // re-read meta_data right before the merge-patch so a concurrent setter edit (e.g. params) isn't clobbered
    const latestMetaData = await ProblemServices.getProblemById(problemId, { meta_data: true });
    await ProblemServices.updateProblemById(
      problemId,
      {
        harness_payload_gridfs_id: uploadedHarnessId.toHexString(),
        meta_data: mergeProblemMetaData(latestMetaData?.meta_data ?? {}, { sample_testcases: sampleTestcases })
      },
      { select: { id: true } }
    );

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
