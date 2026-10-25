import { Prisma } from "@prisma/client";

/** Problems.meta_data — catch-all JSON for evolving problem config (no new columns). */
export type SampleTestcase = { input: string; expected: string };

export type ProblemMetaData = {
  /** Param names in stdin line order, e.g. ["nums", "target"] — labels for the learner's testcase boxes. */
  params?: string[];
  /** Visible examples, extracted from `sample_*` files in the testcases zip. */
  sample_testcases?: SampleTestcase[];
};

export const getProblemMetaData = (metaData: Prisma.JsonValue): ProblemMetaData => (metaData ?? {}) as ProblemMetaData;

export const mergeProblemMetaData = (metaData: Prisma.JsonValue, patch: ProblemMetaData): Prisma.InputJsonObject =>
  ({ ...getProblemMetaData(metaData), ...patch }) as Prisma.InputJsonObject;
