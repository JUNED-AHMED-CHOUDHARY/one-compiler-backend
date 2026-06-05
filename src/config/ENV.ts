import dotenv from "dotenv";

dotenv.config();
const currentEnvironment: "development" | "production" = process.env.NODE_ENV === "production" ? "production" : "development";

dotenv.config({ path: `.env.${currentEnvironment}` });

const ENV = {
  PORT: process.env.PORT,
  NODE_ENV: currentEnvironment,
  isRunningProd: currentEnvironment === "production",
  REDIS_URI: process.env.REDIS_URI as string,
  DATABASE_URL: process.env.DATABASE_URL as string
} as const;

export default ENV;
