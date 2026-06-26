import { ProgrammingLanguage } from "@prisma/client";

import { SUPPORTED_PROGRAMMING_LANGUAGES } from "../services/docker/dockerRunner";

type InstantiableError = new (message?: string) => Error;
const PRISMA_TO_RUNNER_LANGUAGE_MAP: Record<ProgrammingLanguage, SUPPORTED_PROGRAMMING_LANGUAGES> = {
  [ProgrammingLanguage.CPP]: "cpp",
  [ProgrammingLanguage.JAVASCRIPT]: "javascript",
  [ProgrammingLanguage.PYTHON]: "python"
};

export const getRunnerLanguageFromDBLanguage = (language: ProgrammingLanguage, ErrorClass: InstantiableError = Error): SUPPORTED_PROGRAMMING_LANGUAGES => {
  const mapped = PRISMA_TO_RUNNER_LANGUAGE_MAP[language];
  if (!mapped) throw new ErrorClass(`Unsupported programming language for execution: ${language}`);
  return mapped;
};
