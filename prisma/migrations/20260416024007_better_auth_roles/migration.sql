/*
  Warnings:

  - You are about to drop the column `privilege` on the `Privilege` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Status` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `Privilege` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Status` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Privilege` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `Privilege` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `Status` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `Status` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Privilege_privilege_key";

-- DropIndex
DROP INDEX "Role_role_key";

-- DropIndex
DROP INDEX "Status_status_key";

-- AlterTable
ALTER TABLE "Privilege" DROP COLUMN "privilege",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "label" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "role",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "label" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Status" DROP COLUMN "status",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "label" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Privilege_code_key" ON "Privilege"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Status_code_key" ON "Status"("code");
