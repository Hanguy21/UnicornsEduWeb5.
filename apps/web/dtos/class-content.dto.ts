export interface ClassContentItemDto {
  id: string; // class_content_items.id
  topicId: string;
  kind: 'topic'; // future kinds will be added
  sortOrder: number;
  title: string;
  kindLabel: string; // e.g., 'Lý thuyết' | 'Luyện tập'
  source: 'course' | 'class'; // source badge
  chapterTitle?: string; // for course topics
  lectureCount?: number; // for theory topics
}

export interface ClassContentCreatePayload {
  topicId?: string; // add existing topic
  title?: string; // title for new topic (required when topicId is absent)
  kind?: 'theory' | 'practice'; // default 'theory'
}
