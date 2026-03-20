/*
  Warnings:

  - You are about to drop the column `staffPaymentStatus` on the `lesson_outputs` table. All the data in the column will be lost.
  - You are about to drop the column `tag` on the `lesson_outputs` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[lesson_outputs_id]` on the table `lesson_task` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "lesson_outputs" DROP CONSTRAINT "lesson_outputs_staff_id_fkey";

-- AlterTable
ALTER TABLE "lesson_outputs" DROP COLUMN "staffPaymentStatus",
DROP COLUMN "tag",
ADD COLUMN     "tags" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "lesson_task" ADD COLUMN     "lesson_outputs_id" TEXT;

-- AlterTable
ALTER TABLE "staff_lesson_task" ADD COLUMN     "allowance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "staff_payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE UNIQUE INDEX "lesson_task_lesson_outputs_id_key" ON "lesson_task"("lesson_outputs_id");

-- AddForeignKey
ALTER TABLE "lesson_task" ADD CONSTRAINT "lesson_task_lesson_outputs_id_fkey" FOREIGN KEY ("lesson_outputs_id") REFERENCES "lesson_outputs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_task" ADD CONSTRAINT "lesson_task_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "staff_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;
