import path from "node:path";

// multer constants...
export enum INSIDE_TEMP_DIR_NAMES {
  TEST_CASES = "testcases"
}

export const TEST_CASES_UPLOAD_DIR = path.join(process.cwd(), "temp", INSIDE_TEMP_DIR_NAMES.TEST_CASES);

export const CRYPTO_SUFFIX_LENGTH = 16;

export const MULTER_MAX_FILE_SIZE_LIMIT = 1024 * 1024 * 50; // 50MB

export const MULTER_UPLOAD_FIELD_NAME = "testcaseZipFile";
