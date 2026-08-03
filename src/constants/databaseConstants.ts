export const TEST_CASE_MODEL_NAME = "Testcases" as const;

export const TEST_CASES_BUCKET_NAME = "Testcases_bucket_gridfs" as const;

/** Cap parallel GridFS reads/writes so the Mongo pool is not starved. */
export const GRIDFS_IO_CONCURRENCY = 15;
