import prisma from "../config/prisma";
import { ID_PREFIXES } from "../constants/idPrefixes";
import { generateId } from "../utilities/commonFunctions";
import { ProblemIdInParam, UpsertProblemTemplatesBody } from "../zodValidations/problemValidations";

class ProblemCodeTemplateServices {
  static async upsertProblemTemplates(problemId: ProblemIdInParam["problemId"], templates: UpsertProblemTemplatesBody["templates"]) {
    const upsertPromises = templates.map((template) => {
      return prisma.problemCodeTemplates.upsert({
        where: {
          problem_id_language: {
            language: template.language,
            problem_id: problemId
          }
        },
        create: {
          id: generateId(ID_PREFIXES.PROBLEM_CODE_TEMPLATE),
          problem_id: problemId,
          ...template
        },
        update: {
          user_visible_code: template.user_visible_code,
          hidden_stub_code: template.hidden_stub_code
        }
      });
    });

    return await prisma.$transaction(upsertPromises);
  }
}

export default ProblemCodeTemplateServices;
