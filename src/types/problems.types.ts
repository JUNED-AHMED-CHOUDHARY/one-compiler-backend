import { Prisma, Problems } from "@prisma/client";

import { ProblemIdInParam } from "../zodValidations/problemValidations";

export type InferProblemReturn<T extends Prisma.ProblemsSelect | undefined> = T extends Prisma.ProblemsSelect ? Prisma.ProblemsGetPayload<{ select: T }> : Problems;

export interface IGetProblemBySlugName {
  <T extends Prisma.ProblemsSelect | undefined = undefined>(slugName: string, select?: T): Promise<InferProblemReturn<T> | null>;
}

export interface IGetProblemById {
  <T extends Prisma.ProblemsSelect | undefined = undefined>(problemId: ProblemIdInParam["problemId"], select?: T): Promise<InferProblemReturn<T> | null>;
}

export interface IGetProblemByIdWithInclude {
  <T extends Prisma.ProblemsInclude>(problemId: ProblemIdInParam["problemId"], include: T): Promise<Prisma.ProblemsGetPayload<{ include: T }> | null>;
}

export interface IUpdateProblemById {
  <T extends Prisma.ProblemsSelect | undefined = undefined>(
    problemId: ProblemIdInParam["problemId"],
    payload: Prisma.ProblemsUpdateInput,
    options?: { select?: T }
  ): Promise<InferProblemReturn<T>>;
}
