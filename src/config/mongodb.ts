import mongoose from "mongoose";

import { logger } from "../services/logger";
import { shutDownManager } from "../services/shutDownManager/shutDownManager";
import { ShutdownPriority } from "../types/services/shutdownManger";

import ENV from "./ENV";

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

shutDownManager.registerCleanupTask({
  name: "MongoDb",
  priority: ShutdownPriority.LOW,
  task: async () => {
    logger.info("Disconnecting MongoDB client");
    try {
      await disconnectMongoDB();
      logger.info("MongoDB disconnected successfully");
    } catch (error) {
      logger.error("Error disconnecting mongoDB", { error });
    }
  }
});
