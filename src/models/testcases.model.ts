import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

import { TEST_CASE_MODEL_NAME } from "../constants/databaseConstants";

const testcaseSchema = new Schema(
  {
    problem_id: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
      index: true
    },
    is_hidden: {
      type: Boolean,
      required: true,
      default: true
    },
    payload_size_bytes: {
      type: Number,
      required: true,
      min: 0
    },
    test_case_number: {
      type: Number,
      required: true,
      min: 1
    },
    // grid fs reference
    input_data_gridfs_id: {
      type: Schema.Types.ObjectId,
      required: true
    },
    expected_output_gridfs_id: {
      type: Schema.Types.ObjectId,
      default: null
    }
  },
  {
    collection: "Testcases",
    timestamps: true,
    versionKey: false
  }
);

testcaseSchema.index({ problem_id: 1, test_case_number: 1 });

testcaseSchema.index({ problem_id: 1, is_hidden: 1 });

export type Testcase = InferSchemaType<typeof testcaseSchema>;

const Testcases: Model<Testcase> = models[TEST_CASE_MODEL_NAME] || model<Testcase>(TEST_CASE_MODEL_NAME, testcaseSchema);

export default Testcases;
