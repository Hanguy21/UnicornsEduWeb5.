"use client";

import { LessonManageDetailsPage } from "@/app/admin/lesson-manage-details/page";

export default function StaffLessonPlanManageDetailsPage() {
  return (
    <LessonManageDetailsPage
      basePagePath="/staff/lesson-plan-tasks"
      manageDetailsPath="/staff/lesson-plan-manage-details"
      participantMode
    />
  );
}
