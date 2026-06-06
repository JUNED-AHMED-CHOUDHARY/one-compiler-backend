import mongoose from "mongoose";
import ENV from "./ENV";
import { logger } from "../services/logger";

export const connectMongoDB = async () => {
  if (!ENV.MONGODB_URI?.trim()) {
    logger.error("MONGODB_URI is missing. Please set it in your environment.");
    throw new Error("MONGODB_URI is missing");
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(ENV.MONGODB_URI);

  logger.info("✅ Connected to MongoDB");
};

export const disconnectMongoDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
