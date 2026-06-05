/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ProblemDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProblemContributionType" AS ENUM ('CREATOR', 'TESTER', 'EDITORIAL_WRITER');

-- CreateEnum
CREATE TYPE "ProblemCompanyTimePeriod" AS ENUM ('0-6_MONTHS', '6-12_MONTHS', '1-2_YEARS', 'OLDER');

-- CreateEnum
CREATE TYPE "ProgrammingLanguage" AS ENUM ('CPP', 'JAVASCRIPT', 'PYTHON');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('EXACT_MATCH', 'CUSTOM_CHECKER');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'RUNNING', 'ACCEPTED', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'MEMORY_LIMIT_EXCEEDED', 'TIME_LIMIT_EXCEEDED', 'WRONG_ANSWER');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "Companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug_name" TEXT NOT NULL,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicTags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug_name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicTags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_problem_junction" (
    "id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contribution_type" "ProblemContributionType" NOT NULL DEFAULT 'CREATOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "author_problem_junction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_company_junction" (
    "problem_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "frequency_score" INTEGER NOT NULL DEFAULT 1,
    "time_period" "ProblemCompanyTimePeriod",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_company_junction_pkey" PRIMARY KEY ("problem_id","company_id")
);

-- CreateTable
CREATE TABLE "problem_tag_junction" (
    "problem_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_tag_junction_pkey" PRIMARY KEY ("problem_id","tag_id")
);

-- CreateTable
CREATE TABLE "ProblemCodeTemplates" (
    "id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "language" "ProgrammingLanguage" NOT NULL,
    "user_visible_code" TEXT NOT NULL,
    "hidden_stub_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemCodeTemplates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problems" (
    "id" TEXT NOT NULL,
    "problem_name" TEXT NOT NULL,
    "problem_slug_name" TEXT NOT NULL,
    "problem_description" TEXT NOT NULL,
    "difficulty" "ProblemDifficulty" NOT NULL,
    "time_limit_ms" INTEGER NOT NULL,
    "memory_limit_kb" INTEGER NOT NULL,
    "total_submissions" INTEGER NOT NULL DEFAULT 0,
    "total_accepted" INTEGER NOT NULL DEFAULT 0,
    "status" "ProblemStatus" NOT NULL DEFAULT 'DRAFT',
    "reference_solution_code" TEXT NOT NULL,
    "reference_solution_language" "ProgrammingLanguage" NOT NULL,
    "evaluation_type" "EvaluationType" NOT NULL DEFAULT 'EXACT_MATCH',
    "custom_checker_code" TEXT,
    "meta_data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "language" "ProgrammingLanguage" NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "source_code" TEXT NOT NULL,
    "execution_time_ms" INTEGER,
    "memory_used_kb" INTEGER,
    "testcases_passed" INTEGER NOT NULL DEFAULT 0,
    "failed_testcase_index" INTEGER,
    "error_log" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "meta_data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Companies_name_key" ON "Companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Companies_slug_name_key" ON "Companies"("slug_name");

-- CreateIndex
CREATE UNIQUE INDEX "TopicTags_name_key" ON "TopicTags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TopicTags_slug_name_key" ON "TopicTags"("slug_name");

-- CreateIndex
CREATE INDEX "author_problem_junction_user_id_idx" ON "author_problem_junction"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "author_problem_junction_problem_id_user_id_contribution_typ_key" ON "author_problem_junction"("problem_id", "user_id", "contribution_type");

-- CreateIndex
CREATE INDEX "problem_company_junction_company_id_idx" ON "problem_company_junction"("company_id");

-- CreateIndex
CREATE INDEX "problem_tag_junction_tag_id_idx" ON "problem_tag_junction"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemCodeTemplates_problem_id_language_key" ON "ProblemCodeTemplates"("problem_id", "language");

-- CreateIndex
CREATE UNIQUE INDEX "Problems_problem_slug_name_key" ON "Problems"("problem_slug_name");

-- CreateIndex
CREATE INDEX "Submissions_user_id_idx" ON "Submissions"("user_id");

-- CreateIndex
CREATE INDEX "Submissions_problem_id_idx" ON "Submissions"("problem_id");

-- CreateIndex
CREATE INDEX "Submissions_status_idx" ON "Submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Users_username_key" ON "Users"("username");

-- AddForeignKey
ALTER TABLE "author_problem_junction" ADD CONSTRAINT "author_problem_junction_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "Problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_problem_junction" ADD CONSTRAINT "author_problem_junction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_company_junction" ADD CONSTRAINT "problem_company_junction_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "Problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_company_junction" ADD CONSTRAINT "problem_company_junction_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_tag_junction" ADD CONSTRAINT "problem_tag_junction_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "Problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_tag_junction" ADD CONSTRAINT "problem_tag_junction_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "TopicTags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemCodeTemplates" ADD CONSTRAINT "ProblemCodeTemplates_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "Problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submissions" ADD CONSTRAINT "Submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submissions" ADD CONSTRAINT "Submissions_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "Problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
