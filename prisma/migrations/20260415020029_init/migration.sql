/*
  Warnings:

  - You are about to drop the column `priority` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Task` table. All the data in the column will be lost.
  - Added the required column `privilegeId` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusId` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Task" DROP COLUMN "priority",
DROP COLUMN "status",
ADD COLUMN     "privilegeId" INTEGER NOT NULL,
ADD COLUMN     "statusId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Status" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Privilege" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "Privilege_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Status_code_key" ON "Status"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Privilege_code_key" ON "Privilege"("code");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_privilegeId_fkey" FOREIGN KEY ("privilegeId") REFERENCES "Privilege"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
