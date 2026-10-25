import { ProgrammingLanguage } from "@prisma/client";
import { z } from "zod";

import { MAX_RUN_INPUT_LENGTH, MAX_RUN_TESTCASES } from "./variablesUsedInValidations";

/** POST /problems/:problemId/run — learner run on samples + custom testcases of a published problem. */
export const problemRunBodySchema = z.object({
  language: z.nativeEnum(ProgrammingLanguage),
  source_code: z.string().min(1, "Source code cannot be empty"),
  /** Raw input per testcase — one line per param (Problems.meta_data.params), exactly what the stub reads. */
  inputs: z
    .array(z.string().max(MAX_RUN_INPUT_LENGTH, `Testcase input must be at most ${MAX_RUN_INPUT_LENGTH} characters`))
    .min(1, "At least one testcase is required")
    .max(MAX_RUN_TESTCASES, `At most ${MAX_RUN_TESTCASES} testcases can be run at once`)
});

export type ProblemRunBody = z.infer<typeof problemRunBodySchema>;
