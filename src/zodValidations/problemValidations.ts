import { ProblemDifficulty } from "@prisma/client";
import { z } from "zod";

import { MINIMUM_PROBLEM_NAME_SLUG_LENGTH } from "./variablesUsedInValidations";

export const createDraftProblemBodySchema = z.object({
  problem_name: z.string().min(MINIMUM_PROBLEM_NAME_SLUG_LENGTH),
  problem_slug_name: z.string().min(MINIMUM_PROBLEM_NAME_SLUG_LENGTH),
  difficulty: z.enum(ProblemDifficulty),
  tag_links: z.array(z.string())
});

export type CreateDraftProblemBody = z.infer<typeof createDraftProblemBodySchema>;
