import path from "node:path";

// multer constants...
export enum INSIDE_TEMP_DIR_NAMES {
  TEST_CASES = "testcases",
  HARNESS_CACHE = "harness-cache"
}

export const TEST_CASES_UPLOAD_DIR = path.join(process.cwd(), "temp", INSIDE_TEMP_DIR_NAMES.TEST_CASES);

export const HARNESS_CACHE_DIR = path.join(process.cwd(), "temp", INSIDE_TEMP_DIR_NAMES.HARNESS_CACHE);

export const CRYPTO_SUFFIX_LENGTH = 16;

export const MULTER_MAX_FILE_SIZE_LIMIT = 1024 * 1024 * 50; // 50MB

export const MULTER_UPLOAD_FIELD_NAME = "testcaseZipFile";
