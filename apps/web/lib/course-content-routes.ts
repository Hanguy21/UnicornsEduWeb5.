import type { CourseWorkspaceRouteBase } from "@/dtos/course-workspace.dto";

export function courseDetailHref(
  routeBase: CourseWorkspaceRouteBase,
  courseId: string,
  query?: { tab?: string; chapter?: string | null },
): string {
  const params = new URLSearchParams();
  if (query?.tab) params.set("tab", query.tab);
  if (query?.chapter) params.set("chapter", query.chapter);
  const qs = params.toString();
  return `${routeBase}/courses/${courseId}${qs ? `?${qs}` : ""}`;
}

export function chapterTopicsHref(
  routeBase: CourseWorkspaceRouteBase,
  courseId: string,
  chapterId: string,
): string {
  return courseDetailHref(routeBase, courseId, {
    tab: "noi-dung",
    chapter: chapterId,
  });
}

export function newTopicHref(
  routeBase: CourseWorkspaceRouteBase,
  courseId: string,
  chapterId: string,
): string {
  return `${routeBase}/courses/${courseId}/chapters/${chapterId}/topics/new`;
}

export function topicHref(
  routeBase: CourseWorkspaceRouteBase,
  courseId: string,
  chapterId: string,
  topicId: string,
  lectureId?: string,
): string {
  const base = `${routeBase}/courses/${courseId}/chapters/${chapterId}/topics/${topicId}`;
  if (!lectureId) return base;
  return `${base}?lecture=${encodeURIComponent(lectureId)}`;
}
