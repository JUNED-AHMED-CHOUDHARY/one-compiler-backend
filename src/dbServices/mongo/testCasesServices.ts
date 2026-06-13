import mongoose from "mongoose";

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

  static async deleteTestCasesGridFsByProblemId(problemId: string) {
    const bucket = this.createBucketForTestCases();
    const existingTestCases = await Testcases.find({ problem_id: problemId });
    const bucketPromises = [];
    for (const tc of existingTestCases) {
      if (tc.input_data_gridfs_id) {
        bucketPromises.push(bucket.delete(tc.input_data_gridfs_id));
      }
      if (tc.expected_output_gridfs_id) {
        bucketPromises.push(bucket.delete(tc.expected_output_gridfs_id));
      }
    }

    await Promise.all(bucketPromises);
  }
}

export default TestCasesServices;
