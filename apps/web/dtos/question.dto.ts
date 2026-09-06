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
