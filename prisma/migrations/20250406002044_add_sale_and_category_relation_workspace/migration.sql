/*
  Warnings:

  - A unique constraint covering the columns `[workspaceId,name]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `workspaceId` to the `categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspace_id` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "categories_name_key";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "workspaceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "workspace_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "categories_workspaceId_name_key" ON "categories"("workspaceId", "name");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
