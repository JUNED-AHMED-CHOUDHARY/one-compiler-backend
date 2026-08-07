import { Prisma, ProblemDifficulty, ProblemStatus, TopicTags } from "@prisma/client";

import prisma from "../config/prisma";
import { ID_PREFIXES } from "../constants/idPrefixes";
import { UserInRequest } from "../types/express";
import { generateId } from "../utilities/commonFunctions";
import { toOffsetPaginationMeta, toOffsetSkip } from "../utilities/prismaPagination";
import { ListProblemsQuery, ProblemIdInParam } from "../zodValidations/problemValidations";

interface DraftProblemData {
  problem_name: string;
  problem_slug_name: string;
  difficulty: ProblemDifficulty;
  topicTags: TopicTags[];
  user: UserInRequest;
}

export const PROBLEM_LIST_SELECT = {
  id: true,
  problem_name: true,
  problem_slug_name: true,
  difficulty: true,
  total_submissions: true,
  total_accepted: true,
  tag_links: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          slug_name: true
        }
      }
    }
  }
} satisfies Prisma.ProblemsSelect;

export type ProblemListRow = Prisma.ProblemsGetPayload<{ select: typeof PROBLEM_LIST_SELECT }>;

class ProblemServices {
  static async listPublishedProblems({ page, limit, difficulty, tag }: ListProblemsQuery) {
    const where: Prisma.ProblemsWhereInput = {
      status: ProblemStatus.PUBLISHED,
      difficulty,
      tag_links: tag ? { some: { tag: { slug_name: tag } } } : undefined
    };

    const [items, total] = await prisma.$transaction([
      prisma.problems.findMany({
        where,
        select: PROBLEM_LIST_SELECT,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        skip: toOffsetSkip(page, limit),
        take: limit
      }),
      prisma.problems.count({ where })
    ]);

    return {
      items,
      pagination: toOffsetPaginationMeta(page, limit, total)
    };
  }

  static async getProblemById(problemId: ProblemIdInParam["problemId"]) {
    return await prisma.problems.findUnique({
      where: {
        id: problemId
      }
    });
  }

  /** Lightweight fetch for judge/upload paths that only need harness GridFS identity. */
  static async getProblemHarnessMeta(problemId: ProblemIdInParam["problemId"]) {
    return await prisma.problems.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        harness_payload_gridfs_id: true
      }
    });
  }
  static async getProblemByIdWithInclude<T extends Prisma.ProblemsInclude>(problemId: ProblemIdInParam["problemId"], include: T) {
    return await prisma.problems.findUnique({
      where: {
        id: problemId
      },
      include
    });
  }
  static async getProblemBySlugName(slugName: string) {
    return await prisma.problems.findFirst({
      where: {
        problem_slug_name: slugName
      }
    });
  }

  static async createDraftProblem(draftData: DraftProblemData) {
    const { problem_name, problem_slug_name, difficulty, topicTags, user } = draftData;

    const problemId = generateId(ID_PREFIXES.PROBLEM);
    const authorLinkId = generateId(ID_PREFIXES.AUTHOR);
    return await prisma.problems.create({
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
    return await prisma.problems.update({
      where: {
        id: problemId
      },
      data: payload
    });
  }

  static async updateProblemById<T extends Prisma.ProblemsSelect | undefined = undefined>(
    problemId: ProblemIdInParam["problemId"],
    payload: Prisma.ProblemsUpdateInput,
    options?: { select?: T }
  ) {
    return await prisma.problems.update({
      where: {
        id: problemId
      },
      data: payload,
      ...(options?.select ? { select: options.select } : {})
    });
  }
}

export default ProblemServices;
