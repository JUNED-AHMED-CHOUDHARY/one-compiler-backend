import { EvaluationType, Prisma, ProblemStatus } from "@prisma/client";
import { UnrecoverableError } from "bullmq";

import TestCasesServices from "../../dbServices/mongo/testCasesServices";
import { ProblemIdInParam } from "../../zodValidations/problemValidations";

export const verifyProblemToBePublishedBasicChecks = (problem: Prisma.ProblemsGetPayload<{ include: { code_templates: true } }>) => {
  const { status, code_templates, evaluation_type, reference_solution_language, reference_solution_code, custom_checker_code, problem_description } = problem;

  if (status !== ProblemStatus.DRAFT) throw new UnrecoverableError("Problem is not in draft status");

  if (!problem_description) throw new UnrecoverableError("Problem description is required for publishing");

  if (!code_templates || code_templates.length === 0) throw new UnrecoverableError("Code templates are required");

  const isCodeTemplatesValid = code_templates.every((template) => template.hidden_stub_code && template.user_visible_code);

  if (!isCodeTemplatesValid) throw new UnrecoverableError("Code templates are not valid, hidden stub code and user visible code are required");

  if (!reference_solution_language || !reference_solution_code) throw new UnrecoverableError("Reference solution is not valid");

  const atLeastOneTemplateHasReferenceSolution = code_templates.some((template) => template.language === reference_solution_language);

  if (!atLeastOneTemplateHasReferenceSolution) throw new UnrecoverableError("There must be a code template for the reference solution language");

  if (evaluation_type === EvaluationType.CUSTOM_CHECKER && !custom_checker_code) throw new UnrecoverableError("Custom checker code is not valid");
};

export const verifyMongoChecks = async (problemId: ProblemIdInParam["problemId"], evaluation_type: EvaluationType) => {
  // check if at least one test case is present
  const hasAtLeastOneTestcaseInMongo = await TestCasesServices.checkExistsByQuery({ problem_id: problemId });
  if (!hasAtLeastOneTestcaseInMongo) throw new UnrecoverableError("At least one test case is required for publishing");

  // check if evaluation type is exact match then check there should'nt be any testcase where expected_output_gridfs_id is null
  if (evaluation_type === EvaluationType.EXACT_MATCH) {
    const nullExpectedOutputTestcases = await TestCasesServices.checkExistsByQuery({ problem_id: problemId, expected_output_gridfs_id: null });
    if (nullExpectedOutputTestcases) throw new UnrecoverableError(`Expected output is required for evaluation type ${EvaluationType.EXACT_MATCH}`);
  }
};
