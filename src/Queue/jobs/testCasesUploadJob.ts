import fs from "node:fs";

import { Job, Processor } from "bullmq";
import mongoose from "mongoose";
import unzipper, { type Entry } from "unzipper";

import TestCasesServices from "../../dbServices/mongo/testCasesServices";
import { Testcase } from "../../models/testcases.model";
import { logger } from "../../services/logger";

const REGEX_FOR_FILE_NAME_MATCH = /(\d+)\.(in|out)$/;

interface MapValue {
  inputGridFsObjectId?: mongoose.Types.ObjectId;
  outputGridFsObjectId?: mongoose.Types.ObjectId;
  totalInputSize: number;
}

const streamToGridFs = async (
  entry: Entry,
  bucket: mongoose.mongo.GridFSBucket,
  fileName: string
): Promise<{ gridFsObjectId: mongoose.Types.ObjectId; totalInputSize: number }> => {
  return new Promise((resolve, reject) => {
    const bucketUploadStream = bucket.openUploadStream(fileName);
    let totalInputSize = 0;

    entry.on("data", (chunk) => (totalInputSize += chunk.length));

    entry
      .pipe(bucketUploadStream)
      .on("finish", () => resolve({ gridFsObjectId: bucketUploadStream.id, totalInputSize }))
      .on("error", reject);
  });
};

const testCasesUploadJob: Processor = async (job: Job) => {
  // add time for debug how much it takes to upload test cases
  const startTime = Date.now();
  const { problemId, filePath } = job.data;
  const bucket = TestCasesServices.createBucketForTestCases();

  const testCasesMap = new Map<number, MapValue>();
  try {
    logger.info(`[BullMQ] Starting test cases upload for problem ${problemId}`, { filePath });

    const directory = await unzipper.Open.file(filePath);
    for (const file of directory.files) {
      if (file.type === "Directory") continue;

      const match = file.path.match(REGEX_FOR_FILE_NAME_MATCH);
      if (!match) continue;

      const index = parseInt(match[1], 10);
      const extension = match[2] as "in" | "out";

      const { totalInputSize, gridFsObjectId } = await streamToGridFs(file.stream(), bucket, `${problemId}_${index}.${extension}`);

      if (!testCasesMap.has(index)) testCasesMap.set(index, { totalInputSize: 0 });

      const testCaseMutableMapValue = testCasesMap.get(index)!;
      testCaseMutableMapValue.totalInputSize += totalInputSize;

      switch (extension) {
        case "in":
          testCaseMutableMapValue.inputGridFsObjectId = gridFsObjectId;
          break;
        case "out":
          testCaseMutableMapValue.outputGridFsObjectId = gridFsObjectId;
          break;
        default:
          throw new Error(`Invalid extension: ${extension}`);
      }
    }

    const mongoDocs: Omit<Testcase, "createdAt" | "updatedAt">[] = [];

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
    }

    await TestCasesServices.deleteTestCasesGridFsByProblemId(problemId);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await TestCasesServices.deleteManyTestCasesByProblemId(problemId, session);
      await TestCasesServices.insertManyTestCases(mongoDocs, session);

      await session.commitTransaction();
    } catch (transactionError) {
      await session.abortTransaction();
      logger.error(`[BullMQ] Transaction failed for problem ${problemId}`, { error: transactionError });
      throw transactionError;
    } finally {
      await session.endSession();
    }
    const endTime = Date.now();
    const duration = endTime - startTime;
    logger.info(`[BullMQ] Test cases uploaded for problem ${problemId} successfully in ${duration}ms in seconds ${duration / 1000}`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    const maxAttempts = job.opts.attempts || 1;
    const currentAttempt = job.attemptsMade + 1; // + 1 because first attempt goes to 0 thats why
    logger.error(`[BullMQ] Attempt ${currentAttempt}/${maxAttempts} failed for problem ${problemId}`);
    if (currentAttempt >= maxAttempts) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    throw error;
  }
};

export default testCasesUploadJob;
