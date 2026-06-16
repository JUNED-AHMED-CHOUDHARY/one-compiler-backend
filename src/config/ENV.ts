import dotenv from "dotenv";

dotenv.config();
const currentEnvironment: "development" | "production" = process.env.NODE_ENV === "production" ? "production" : "development";

dotenv.config({ path: `.env.${currentEnvironment}` });

const ENV = {
  PORT: process.env.PORT,
  NODE_ENV: currentEnvironment,
  isRunningProd: currentEnvironment === "production",
  REDIS_URI: process.env.REDIS_URI as string,
  DATABASE_URL: process.env.DATABASE_URL as string,
  MONGODB_URI: process.env.MONGODB_URI as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  SHUTDOWN_TIMEOUT_IN_MS: Number(process.env.SHUTDOWN_TIMEOUT_IN_MS) || 7000
} as const;

export default ENV;
