import { ProblemDifficulty, TopicTags } from "@prisma/client";

import prisma from "../config/prisma";
import { ID_PREFIXES } from "../constants/idPrefixes";
import { UserInRequest } from "../types/express";
import { generateId } from "../utilities/commonFunctions";

interface DraftProblemData {
  problem_name: string;
  problem_slug_name: string;
  difficulty: ProblemDifficulty;
  topicTags: TopicTags[];
  user: UserInRequest;
}

class ProblemServices {
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
}

export default ProblemServices;
