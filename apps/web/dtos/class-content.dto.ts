export interface ClassContentItemDto {
  id: string; // class_content_items.id
  topicId: string;
  kind: "topic";
  topicKind: "theory" | "practice";
  sortOrder: number;
  title: string;
  kindLabel: string; // e.g., 'Lý thuyết' | 'Luyện tập'
  source: "course" | "class";
  chapterTitle?: string;
  lectureCount?: number;
  openAt: string | null;
  durationMinutes: number | null;
  isOpen: boolean;
}

export interface ClassContentCreatePayload {
  topicId?: string;
  title?: string;
  kind?: "theory" | "practice";
  openAt?: string;
  durationMinutes?: number;
}

export interface ClassContentScheduleUpdatePayload {
  openAt: string;
  durationMinutes: number;
}
