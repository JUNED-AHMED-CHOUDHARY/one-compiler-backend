export const MINIMUM_PASSWORD_LENGTH = 8;
export const MAXIMUM_PASSWORD_LENGTH = 128;
export const MINIMUM_NAME_LENGTH = 2;
export const MINIMUM_PROBLEM_NAME_SLUG_LENGTH = 3;

/** Learner problem list defaults (query params). */
export const DEFAULT_PROBLEMS_LIST_PAGE = 1;
export const DEFAULT_PROBLEMS_LIST_LIMIT = 20;
export const MAX_PROBLEMS_LIST_LIMIT = 100;

// execution
export const MAX_EXECUTION_TIME_IN_MS = 7000; // 7 seconds
export const MAX_OUTPUT_LENGTH = 500 * 1024; // 500KB
export const MAX_MEMORY_LIMIT_KB = 256000; // 256MB
/** Hard ceiling for full harness suite runs (prevents worker hangs on huge N * time_limit). */
export const MAX_HARNESS_SUITE_TIMEOUT_MS = 120_000; // 2 minutes
/** Cap stderr collection inside docker exec to avoid RAM blowups. */
export const MAX_STDERR_LENGTH = 256 * 1024; // 256KB
