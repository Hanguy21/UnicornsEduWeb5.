-- CreateIndex
CREATE INDEX "lesson_task_status_due_date_idx" ON "lesson_task"("status", "due_date");

-- CreateIndex
CREATE INDEX "lesson_resources_updated_at_idx" ON "lesson_resources"("updated_at");
