export type TopicKind = "theory" | "practice";

/** Chủ đề — nhóm chuyên đề bên trong một Khoá học. */
export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Chuyên đề — nhóm nội dung cấp cao nhất. */
export interface Topic {
  id: string;
  kind: TopicKind;
  courseId: string | null;
  chapterId: string | null;
  classId: string | null;
  title: string;
  order: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Bài học — đơn vị nội dung bên trong chuyên đề lý thuyết. */
export interface Lecture {
  id: string;
  topicId: string;
  title: string;
  videoUrl: string | null;
  content: string | null;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Cây tri thức gộp: chapter chứa topics, topic theory chứa lectures. */
export interface KnowledgeTreeNode {
  chapter: Chapter;
  topics: Array<{
    topic: Topic;
    lectures: Lecture[];
  }>;
}

// --- Create/Update payloads ---

export interface CreateChapterPayload {
  title: string;
}

export interface UpdateChapterPayload {
  title?: string;
}

export interface CreateTopicPayload {
  kind: TopicKind;
  title: string;
}

export interface UpdateTopicPayload {
  title?: string;
}

export interface CreateLecturePayload {
  title: string;
  videoUrl?: string | null;
  content?: string | null;
}

export interface UpdateLecturePayload {
  title?: string;
  videoUrl?: string | null;
  content?: string | null;
}

// --- Question Link types (Practice Topic / Đề) ---

export interface QuestionLinkQuestion {
  id: string;
  courseId: string;
  chapterId: string;
  difficultyLevelId: string;
  type: string;
  content: string;
  options: unknown;
  correctIndex: number | null;
  explanation: string | null;
  answerGuide: string | null;
}

export interface QuestionLink {
  id: string;
  topicId: string;
  questionId: string;
  order: number | null;
  points: number | null;
  question: QuestionLinkQuestion;
}

export interface QuestionLinkSummary {
  totalQuestions: number;
  totalPoints: number;
}

export interface CreateQuestionLinkPayload {
  questionId: string;
  order?: number | null;
  points?: number | null;
}

export interface UpdateQuestionLinkPayload {
  order?: number | null;
  points?: number | null;
}

// --- Lecture Quiz ---

export interface LectureQuizQuestion {
  id: string;
  lectureId: string;
  questionId: string;
  order: number;
  question: {
    id: string;
    type: string;
    content: string;
    options: string[] | null;
    correctIndex: number | null;
    explanation: string | null;
    answerGuide: string | null;
  };
}

export interface LectureQuizAnswer {
  id: string;
  lectureId: string;
  questionId: string;
  studentId: string;
  choiceIndex: number | null;
  essayAnswer: string | null;
  createdAt: string;
  updatedAt: string;
  question: {
    id: string;
    type: string;
    content: string;
    options: string[] | null;
    correctIndex: number | null;
    explanation: string | null;
    answerGuide: string | null;
  };
}

export interface SubmitQuizAnswerPayload {
  questionId: string;
  choiceIndex?: number | null;
  essayAnswer?: string | null;
}

/** Chuyên đề từ khoá học — dùng cho panel chọn nội dung lớp. */
export interface CourseTopicForClassDto {
  id: string;
  title: string;
  kind: TopicKind;
  chapterTitle: string;
  chapterId: string;
  lectureCount: number;
  alreadyAdded: boolean;
}
