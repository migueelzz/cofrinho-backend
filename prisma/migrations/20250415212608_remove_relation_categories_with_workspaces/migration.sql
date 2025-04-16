/*
  Warnings:

  - You are about to drop the column `workspaceId` on the `categories` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `categories` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_workspaceId_fkey";

-- DropIndex
DROP INDEX "categories_workspaceId_name_key";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "workspaceId";

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
