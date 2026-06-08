-- AlterTable
ALTER TABLE "Problems" ALTER COLUMN "problem_description" DROP NOT NULL,
ALTER COLUMN "time_limit_ms" SET DEFAULT 2000,
ALTER COLUMN "memory_limit_kb" SET DEFAULT 256000,
ALTER COLUMN "reference_solution_code" DROP NOT NULL,
ALTER COLUMN "reference_solution_language" DROP NOT NULL;
