import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config();

const currentEnvironment = process.env.NODE_ENV === "production" ? "production" : "development";

dotenv.config({ path: `.env.${currentEnvironment}`, override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});
