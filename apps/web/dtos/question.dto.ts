export enum QuestionTypeDto {
  single_choice = "single_choice",
  essay = "essay",
}

export interface Question {
  id: string;
  courseId: string;
  chapterId: string;
  difficultyLevelId: string;
  type: QuestionTypeDto;
  content: string;
  options: string[] | null;
  correctIndex: number | null;
  explanation: string | null;
  answerGuide: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionInput {
  courseId: string;
  chapterId: string;
  difficultyLevelId: string;
  type: QuestionTypeDto;
  content: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  answerGuide?: string;
}

export type UpdateQuestionInput = Partial<
  Omit<CreateQuestionInput, "courseId" | "chapterId" | "difficultyLevelId" | "type">
>;

export interface QuestionFilter {
  chapterId?: string;
  difficultyLevelId?: string;
  type?: QuestionTypeDto;
  search?: string;
}

// --- AI Import types -------------------------------------------------------

/** Raw item from AI-generated JSON (difficulty is a name, not UUID) */
export interface AiQuestionItem {
  type: QuestionTypeDto;
  content: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  answerGuide?: string;
  difficulty: string;
}

/** Validated item with resolved difficultyLevelId */
export interface ValidatedAiQuestion extends Omit<AiQuestionItem, "difficulty"> {
  difficultyLevelId: string;
  difficultyName: string;
  _valid: boolean;
  _errors: string[];
}

/** Payload sent to backend bulk create */
export interface BulkCreateQuestionInput {
  courseId: string;
  chapterId: string;
  questions: Array<{
    type: QuestionTypeDto;
    content: string;
    options?: string[];
    correctIndex?: number;
    explanation?: string;
    answerGuide?: string;
    difficultyLevelId: string;
  }>;
}

export interface BulkCreateResponse {
  count: number;
  questions: Question[];
}
