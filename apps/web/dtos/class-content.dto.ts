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
  hiddenAt: string | null;
  hiddenByStaffId: string | null;
}

export interface ClassContentCreatePayload {
  topicId?: string;
  title?: string;
  kind?: "theory" | "practice";
  /** ISO 8601. Omit for practice to default openAt to server time when the item is added. */
  openAt?: string;
  /** Required for practice. Integer 1–720. */
  durationMinutes?: number;
}

export interface ClassContentScheduleUpdatePayload {
  openAt: string;
  /** Integer 1–720. */
  durationMinutes: number;
}
