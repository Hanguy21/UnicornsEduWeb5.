import { redirect } from "next/navigation";

export default async function StaffLessonPlannerTaskDetailRedirectPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  redirect(`/staff/lesson-plans/tasks/${encodeURIComponent(taskId)}`);
}
