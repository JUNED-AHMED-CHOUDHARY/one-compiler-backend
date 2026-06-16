import { EvaluationType, ProblemDifficulty, ProgrammingLanguage } from "@prisma/client";
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

export const UpsertProblemTemplatesBodySchema = z.object({
  templates: z
    .array(
      z.object({
        language: z.nativeEnum(ProgrammingLanguage),
        user_visible_code: z.string().min(1, "Code cannot be empty"),
        hidden_stub_code: z.string().min(1, "Stub cannot be empty")
      })
    )
    .min(1, "You must provide at least one code template")
});

export type UpsertProblemTemplatesBody = z.infer<typeof UpsertProblemTemplatesBodySchema>;

export const ProblemEvaluationSettingsBodySchema = z
  .object({
    evaluation_type: z.enum(EvaluationType),
    custom_checker_code: z.string().nullable().optional()
  })
  .superRefine((data, ctx) => {
    const { evaluation_type, custom_checker_code } = data;

    if (evaluation_type === EvaluationType.CUSTOM_CHECKER && !custom_checker_code) {
      ctx.addIssue({
        code: "custom",
        path: ["custom_checker_code"],
        message: "Custom checker code is required when evaluation type is custom checker"
      });
    }
  });

export type ProblemEvaluationSettingsBody = z.infer<typeof ProblemEvaluationSettingsBodySchema>;

export const ReferenceSolutionBodySchema = z
  .object({
    // either reference_solution_code or reference_solution_language will come in the body
    reference_solution_code: z.string().optional(),
    reference_solution_language: z.enum(ProgrammingLanguage).optional()
  })
  .superRefine((data, ctx) => {
    const { reference_solution_code, reference_solution_language } = data;

    if (!reference_solution_code && !reference_solution_language) {
      ctx.addIssue({
        code: "custom",
        path: ["reference_solution_code", "reference_solution_language"],
        message: "Either reference solution code or reference solution language is required"
      });
    }
  });

export type ReferenceSolutionBody = z.infer<typeof ReferenceSolutionBodySchema>;
