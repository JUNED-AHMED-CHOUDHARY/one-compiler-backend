import { model, models, Schema, type InferSchemaType, type Model } from "mongoose";

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
    input_data: {
      type: String,
      required: true
    },
    expected_output: {
      type: String,
      default: null
    }
  },
  {
    collection: "Testcases",
    timestamps: true,
    versionKey: false
  }
);

testcaseSchema.index({ problem_id: 1, is_hidden: 1 });

export type Testcase = InferSchemaType<typeof testcaseSchema>;

const Testcases: Model<Testcase> = models.Testcases || model<Testcase>("Testcases", testcaseSchema);

export default Testcases;
