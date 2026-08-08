import { Prisma, ProblemDifficulty, ProblemStatus, TopicTags } from "@prisma/client";

import prisma from "../config/prisma";
import { ID_PREFIXES } from "../constants/idPrefixes";
import { UserInRequest } from "../types/express";
import { IGetProblemById, IGetProblemByIdWithInclude, IGetProblemBySlugName, IUpdateProblemById } from "../types/problems.types";
import { generateId } from "../utilities/commonFunctions";
import { toOffsetPaginationMeta, toOffsetSkip } from "../utilities/prismaPagination";
import { ListProblemsQuery, ProblemIdInParam } from "../zodValidations/problemValidations";

import { PROBLEM_SELECTS } from "./problemSelects";

interface DraftProblemData {
  problem_name: string;
  problem_slug_name: string;
  difficulty: ProblemDifficulty;
  topicTags: TopicTags[];
  user: UserInRequest;
}

class ProblemServices {
  static async listPublishedProblems({ page, limit, difficulty, tag }: ListProblemsQuery) {
    const where: Prisma.ProblemsWhereInput = {
      status: ProblemStatus.PUBLISHED,
      difficulty,
      tag_links: tag ? { some: { tag: { slug_name: tag } } } : undefined
    };

    const [problems, total] = await prisma.$transaction([
      prisma.problems.findMany({
        where,
        select: PROBLEM_SELECTS.list,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        skip: toOffsetSkip(page, limit),
        take: limit
      }),
      prisma.problems.count({ where })
    ]);

    return {
      problems,
      pagination: toOffsetPaginationMeta(page, limit, total)
    };
  }

  static getProblemBySlugName: IGetProblemBySlugName = async (slugName, select?) => {
    return prisma.problems.findFirst({
      where: { problem_slug_name: slugName },
      ...(select ? { select } : {})
    }) as any;
  };

  static getProblemById: IGetProblemById = async (problemId, select?) => {
    return prisma.problems.findUnique({
      where: { id: problemId },
      ...(select ? { select } : {})
    }) as any;
  };

  static getProblemByIdWithInclude: IGetProblemByIdWithInclude = async (problemId, include) => {
    return prisma.problems.findUnique({
      where: { id: problemId },
      include
    });
  };

  static async createDraftProblem(draftData: DraftProblemData) {
    const { problem_name, problem_slug_name, difficulty, topicTags, user } = draftData;

    const problemId = generateId(ID_PREFIXES.PROBLEM);
    const authorLinkId = generateId(ID_PREFIXES.AUTHOR);

    return prisma.problems.create({
      data: {
        id: problemId,
        problem_name,
        problem_slug_name,
        difficulty,
        tag_links: {
          createMany: {
            data: topicTags?.map((tag) => ({
              tag_id: tag.id
            }))
          }
        },
        author_links: {
          create: {
            id: authorLinkId,
            user_id: user.id
          }
        }
      }
    });
  }

  static async updateProblemContent(problemId: ProblemIdInParam["problemId"], payload: Prisma.ProblemsUpdateInput) {
    return prisma.problems.update({
      where: { id: problemId },
      data: payload
    });
  }

  static updateProblemById: IUpdateProblemById = async (problemId, payload, options?) => {
    return prisma.problems.update({
      where: { id: problemId },
      data: payload,
      ...(options?.select ? { select: options.select } : {})
    }) as any;
  };
}

export default ProblemServices;
