"use client";

import { KnowledgeTreeCard } from "@/components/course-workspace/KnowledgeTreeCard";

export function ContentTab({
  courseId,
  canEdit,
}: {
  courseId: string;
  canEdit: boolean;
}) {
  return <KnowledgeTreeCard courseId={courseId} canEdit={canEdit} />;
}
