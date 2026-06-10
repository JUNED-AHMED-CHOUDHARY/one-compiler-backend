import { ProblemDifficulty } from "@prisma/client";
import { z } from "zod";

import { ID_PREFIXES } from "../constants/idPrefixes";
import { createIdSchema } from "../utilities/commonFunctions";

import { MAX_EXECUTION_TIME_IN_MS, MAX_MEMORY_LIMIT_KB, MINIMUM_PROBLEM_NAME_SLUG_LENGTH } from "./variablesUsedInValidations";

// params zodValidations
export const problemIdInParamSchema = z.object({
  problemId: createIdSchema(ID_PREFIXES.PROBLEM)
});

export type ProblemIdInParam = z.infer<typeof problemIdInParamSchema>;

// body zodValidations
export const createDraftProblemBodySchema = z.object({
  problem_name: z.string().min(MINIMUM_PROBLEM_NAME_SLUG_LENGTH),
  problem_slug_name: z.string().min(MINIMUM_PROBLEM_NAME_SLUG_LENGTH),
  difficulty: z.enum(ProblemDifficulty),
  tag_links: z.array(z.string())
});

export type CreateDraftProblemBody = z.infer<typeof createDraftProblemBodySchema>;

export const UpdateContentBodySchema = z.object({
  problem_description: z.string(),
  time_limit_ms: z.number().max(MAX_EXECUTION_TIME_IN_MS, `Time limit must be less than or equal to ${MAX_EXECUTION_TIME_IN_MS} milliseconds`),
  memory_limit_kb: z.number().max(MAX_MEMORY_LIMIT_KB, `Memory limit must be less than or equal to ${MAX_MEMORY_LIMIT_KB} KB`)
});

export type UpdateContentBody = z.infer<typeof UpdateContentBodySchema>;
