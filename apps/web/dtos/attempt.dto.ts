export type AttemptStatusDto = "in_progress" | "submitted" | "timed_out";

export interface AttemptQuestionDto {
  questionId: string;
  order: number;
  pointsPossible: number;
  type: "single_choice" | "essay";
  content: string;
  options: string[] | null;
  choiceIndex: number | null;
  essayAnswer: string | null;
  correctIndex?: number | null;
  isCorrect?: boolean | null;
  pointsAwarded?: number | null;
  explanation?: string | null;
  answerGuide?: string | null;
}

export interface AttemptDetailDto {
  id: string;
  assignmentId: string;
  classId: string;
  title: string;
  status: AttemptStatusDto;
  startedAt: string;
  durationMinutes: number;
  endsAt: string;
  remainingMs: number;
  submittedAt: string | null;
  autoGradedScore: number | null;
  autoGradedMax: number | null;
  hasUngradedEssay: boolean;
  questions: AttemptQuestionDto[];
}

export interface AttemptSummaryDto {
  id: string;
  status: AttemptStatusDto;
  startedAt: string;
  submittedAt: string | null;
  autoGradedScore: number | null;
  autoGradedMax: number | null;
  hasUngradedEssay: boolean;
}

export interface AssignmentLobbyDto {
  assignmentId: string;
  classId: string;
  topicId: string;
  title: string;
  durationMinutes: number;
  openAt: string | null;
  attempts: AttemptSummaryDto[];
}

export interface SaveAttemptAnswersPayload {
  answers: Array<{
    questionId: string;
    choiceIndex?: number | null;
    essayAnswer?: string | null;
  }>;
}
