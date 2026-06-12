import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { StatusCodes } from "http-status-codes";
import multer from "multer";

import { CRYPTO_SUFFIX_LENGTH, MULTER_MAX_FILE_SIZE_LIMIT, TEST_CASES_UPLOAD_DIR } from "../constants/middlewareConstants";
import CustomError from "../exceptions/custom-error";

if (!fs.existsSync(TEST_CASES_UPLOAD_DIR)) {
  fs.mkdirSync(TEST_CASES_UPLOAD_DIR, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEST_CASES_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const cryptoSuffix = crypto.randomBytes(CRYPTO_SUFFIX_LENGTH).toString("hex") + "-" + Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${cryptoSuffix}${ext?.toLowerCase() || ""}`);
  }
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!file.originalname.endsWith(".zip")) return cb(new CustomError("Invalid file type", StatusCodes.BAD_REQUEST));

  cb(null, true);
};

export const uploadMulterTestCaseZip = multer({
  storage: multerStorage,
  limits: {
    fileSize: MULTER_MAX_FILE_SIZE_LIMIT
  },
  fileFilter
});
