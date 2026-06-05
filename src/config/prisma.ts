import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import ENV from "./ENV";
import { logger } from "../services/logger";

const adapter = new PrismaPg({ connectionString: ENV.DATABASE_URL });

const prisma = new PrismaClient({ adapter, log: ENV.isRunningProd ? ["error"] : ["warn", "error"] });

export const disconnectPrisma = async () => {
  await prisma.$disconnect();
};

export const connectPrisma = async () => {
  try {
    await prisma.$connect();
    logger.info("Connected to prisma client");
  } catch (error) {
    logger.error("Error connecting to database", { error });
    throw error;
  }
};

export default prisma;
