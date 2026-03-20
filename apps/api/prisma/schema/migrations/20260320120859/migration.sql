-- AlterTable
ALTER TABLE "lesson_resources" ADD COLUMN     "lessonTaskId" TEXT;

-- AddForeignKey
ALTER TABLE "lesson_resources" ADD CONSTRAINT "lesson_resources_lessonTaskId_fkey" FOREIGN KEY ("lessonTaskId") REFERENCES "lesson_task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
