/*
  Warnings:

  - The primary key for the `Companies` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Companies` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `name` on the `Companies` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(120)`.
  - You are about to alter the column `slug_name` on the `Companies` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(160)`.
  - You are about to alter the column `image` on the `Companies` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2048)`.
  - The primary key for the `ProblemCodeTemplates` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `ProblemCodeTemplates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `problem_id` on the `ProblemCodeTemplates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - The primary key for the `Problems` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Problems` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `problem_name` on the `Problems` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `problem_slug_name` on the `Problems` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(220)`.
  - The primary key for the `Submissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Submissions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `user_id` on the `Submissions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `problem_id` on the `Submissions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - The primary key for the `TopicTags` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `TopicTags` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `name` on the `TopicTags` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(80)`.
  - You are about to alter the column `slug_name` on the `TopicTags` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `description` on the `TopicTags` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - The primary key for the `Users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `email` on the `Users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(254)`.
  - You are about to alter the column `password_hash` on the `Users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `username` on the `Users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(40)`.
  - You are about to alter the column `name` on the `Users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `user_image` on the `Users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2048)`.
  - The primary key for the `author_problem_junction` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `author_problem_junction` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `problem_id` on the `author_problem_junction` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `user_id` on the `author_problem_junction` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - The primary key for the `problem_company_junction` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `problem_id` on the `problem_company_junction` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `company_id` on the `problem_company_junction` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - The primary key for the `problem_tag_junction` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `problem_id` on the `problem_tag_junction` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.
  - You are about to alter the column `tag_id` on the `problem_tag_junction` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(32)`.

*/
-- DropForeignKey
ALTER TABLE "ProblemCodeTemplates" DROP CONSTRAINT "ProblemCodeTemplates_problem_id_fkey";

-- DropForeignKey
ALTER TABLE "Submissions" DROP CONSTRAINT "Submissions_problem_id_fkey";

-- DropForeignKey
ALTER TABLE "Submissions" DROP CONSTRAINT "Submissions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "author_problem_junction" DROP CONSTRAINT "author_problem_junction_problem_id_fkey";

-- DropForeignKey
ALTER TABLE "author_problem_junction" DROP CONSTRAINT "author_problem_junction_user_id_fkey";

-- DropForeignKey
ALTER TABLE "problem_company_junction" DROP CONSTRAINT "problem_company_junction_company_id_fkey";

-- DropForeignKey
ALTER TABLE "problem_company_junction" DROP CONSTRAINT "problem_company_junction_problem_id_fkey";

-- DropForeignKey
ALTER TABLE "problem_tag_junction" DROP CONSTRAINT "problem_tag_junction_problem_id_fkey";

-- DropForeignKey
ALTER TABLE "problem_tag_junction" DROP CONSTRAINT "problem_tag_junction_tag_id_fkey";

-- AlterTable
ALTER TABLE "Companies" DROP CONSTRAINT "Companies_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(120),
ALTER COLUMN "slug_name" SET DATA TYPE VARCHAR(160),
ALTER COLUMN "image" SET DATA TYPE VARCHAR(2048),
ADD CONSTRAINT "Companies_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ProblemCodeTemplates" DROP CONSTRAINT "ProblemCodeTemplates_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "problem_id" SET DATA TYPE VARCHAR(32),
ADD CONSTRAINT "ProblemCodeTemplates_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Problems" DROP CONSTRAINT "Problems_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "problem_name" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "problem_slug_name" SET DATA TYPE VARCHAR(220),
ADD CONSTRAINT "Problems_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Submissions" DROP CONSTRAINT "Submissions_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "user_id" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "problem_id" SET DATA TYPE VARCHAR(32),
ADD CONSTRAINT "Submissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TopicTags" DROP CONSTRAINT "TopicTags_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(80),
ALTER COLUMN "slug_name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(500),
ADD CONSTRAINT "TopicTags_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Users" DROP CONSTRAINT "Users_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(254),
ALTER COLUMN "password_hash" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "username" SET DATA TYPE VARCHAR(40),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "user_image" SET DATA TYPE VARCHAR(2048),
ADD CONSTRAINT "Users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "author_problem_junction" DROP CONSTRAINT "author_problem_junction_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "problem_id" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "user_id" SET DATA TYPE VARCHAR(32),
ADD CONSTRAINT "author_problem_junction_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "problem_company_junction" DROP CONSTRAINT "problem_company_junction_pkey",
ALTER COLUMN "problem_id" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "company_id" SET DATA TYPE VARCHAR(32),
ADD CONSTRAINT "problem_company_junction_pkey" PRIMARY KEY ("problem_id", "company_id");

-- AlterTable
ALTER TABLE "problem_tag_junction" DROP CONSTRAINT "problem_tag_junction_pkey",
ALTER COLUMN "problem_id" SET DATA TYPE VARCHAR(32),
ALTER COLUMN "tag_id" SET DATA TYPE VARCHAR(32),
ADD CONSTRAINT "problem_tag_junction_pkey" PRIMARY KEY ("problem_id", "tag_id");

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
