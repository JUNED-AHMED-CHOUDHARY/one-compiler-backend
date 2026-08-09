import { ProgrammingLanguage } from "@prisma/client";
import { z } from "zod";

/** POST /problems/:problemId/run — learner custom-input run on a published problem. */
export const problemRunBodySchema = z.object({
  language: z.nativeEnum(ProgrammingLanguage),
  source_code: z.string().min(1, "Source code cannot be empty"),
  stdin: z.string().default("")
});

export type ProblemRunBody = z.infer<typeof problemRunBodySchema>;
