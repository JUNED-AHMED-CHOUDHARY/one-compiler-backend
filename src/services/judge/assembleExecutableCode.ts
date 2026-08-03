import { ProblemCodeTemplates, ProgrammingLanguage } from "@prisma/client";

import { USER_CODE_REPLACE_PLACEHOLDER_IN_HIDDEN_STUB_CODE } from "../../dbServices/problemCodeTemplateServices";

export const findTemplateForLanguage = (templates: ProblemCodeTemplates[], language: ProgrammingLanguage): ProblemCodeTemplates | undefined =>
  templates.find((template) => template.language === language);

/**
 * Injects user/reference solution into the problem's hidden harness stub.
 */
export const assembleExecutableCode = (hiddenStubCode: string, userOrReferenceCode: string): string => {
  if (!hiddenStubCode.includes(USER_CODE_REPLACE_PLACEHOLDER_IN_HIDDEN_STUB_CODE)) {
    throw new Error(`Hidden stub is missing placeholder ${USER_CODE_REPLACE_PLACEHOLDER_IN_HIDDEN_STUB_CODE}`);
  }

  return hiddenStubCode.replace(USER_CODE_REPLACE_PLACEHOLDER_IN_HIDDEN_STUB_CODE, userOrReferenceCode);
};
