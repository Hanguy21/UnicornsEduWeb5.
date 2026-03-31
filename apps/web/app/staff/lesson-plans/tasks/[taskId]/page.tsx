"use client";

import { useQuery } from "@tanstack/react-query";
import { LessonTaskDetailPage } from "@/app/admin/lesson-plans/tasks/[taskId]/page";
import { getFullProfile } from "@/lib/apis/auth.api";
import { resolveStaffLessonWorkspace } from "@/lib/staff-lesson-workspace";

export default function StaffLessonTaskDetailPage() {
  const { data: profile } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });
  const { canAccessTaskDetail, isAssistant, participantMode } =
    resolveStaffLessonWorkspace(profile);

  if (!canAccessTaskDetail) {
    return null;
  }

  return (
    <LessonTaskDetailPage
      workspaceBasePath="/staff/lesson-plans"
      participantMode={participantMode}
      allowDelete={isAssistant}
    />
  );
}
