import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";


import { logger } from "../services/logger";
import { shutDownManager } from "../services/shutDownManager/shutDownManager";
import { ShutdownPriority } from "../types/services/shutdownManger";

import ENV from "./ENV";

const adapter = new PrismaPg({ connectionString: ENV.DATABASE_URL });

const prisma = new PrismaClient({ adapter, log: ENV.isRunningProd ? ["error"] : ["warn", "error"] });

export const connectPrisma = async () => {
  try {
    await prisma.$connect();
    logger.info("✅ Connected to prisma client");
  } catch (error) {
    logger.error("Error connecting to database", { error });
    throw error;
  }
};

export const disconnectPrisma = async () => {
  await prisma.$disconnect();
};

shutDownManager.registerCleanupTask({
  name: "PrismaClient PG",
  priority: ShutdownPriority.LOW,
  task: async () => {
    logger.info("Disconnecting prisma query engine from postgres");
    try {
      await disconnectPrisma();
      logger.info("prisma disconnected successfully");
    } catch (error) {
      logger.error("Error disconnecting prisma", { error });
    }
  }
});

export default prisma;
