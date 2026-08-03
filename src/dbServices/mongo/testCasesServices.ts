import mongoose, { QueryFilter } from "mongoose";

import { TEST_CASES_BUCKET_NAME } from "../../constants/databaseConstants";
import Testcases, { Testcase } from "../../models/testcases.model";

class TestCasesServices {
  static createBucketForTestCases() {
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db!, {
      bucketName: TEST_CASES_BUCKET_NAME
    });
  }

  static async deleteManyTestCasesByProblemId(problemId: string, session: mongoose.ClientSession) {
    return await Testcases.deleteMany({ problem_id: problemId }, { session });
  }

  static async insertManyTestCases(testCases: Omit<Testcase, "createdAt" | "updatedAt">[], session: mongoose.ClientSession) {
    return await Testcases.insertMany(testCases, { session });
  }

  static async deleteGridFsFileById(fileId: string | mongoose.Types.ObjectId) {
    const bucket = this.createBucketForTestCases();
    const objectId = typeof fileId === "string" ? new mongoose.Types.ObjectId(fileId) : fileId;
    try {
      await bucket.delete(objectId);
    } catch {
      /* already deleted / missing */
    }
  }

  static async deleteGridFsFilesByIds(fileIds: Array<string | mongoose.Types.ObjectId | undefined | null>) {
    const unique = [...new Set(fileIds.filter(Boolean).map((id) => String(id)))];
    await Promise.all(unique.map((id) => this.deleteGridFsFileById(id)));
  }

  static async checkExistsByQuery(query: QueryFilter<Testcase>) {
    return await Testcases.exists(query);
  }

  static async getTestcasesByQuery(query: QueryFilter<Testcase>) {
    return await Testcases.find(query).sort({ test_case_number: 1 }).lean();
  }
}

export default TestCasesServices;
