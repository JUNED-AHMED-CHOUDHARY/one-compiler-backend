import { Prisma, ProblemDifficulty, TopicTags } from "@prisma/client";

import prisma from "../config/prisma";
import { ID_PREFIXES } from "../constants/idPrefixes";
import { UserInRequest } from "../types/express";
import { generateId } from "../utilities/commonFunctions";
import { ProblemIdInParam } from "../zodValidations/problemValidations";

interface DraftProblemData {
  problem_name: string;
  problem_slug_name: string;
  difficulty: ProblemDifficulty;
  topicTags: TopicTags[];
  user: UserInRequest;
}

class ProblemServices {
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
