import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class GradeEssayAnswerDto {
  @ApiProperty({
    description: 'Điểm chấm cho câu tự luận này (0..pointsPossible của câu)',
  })
  @IsInt()
  @Min(0)
  pointsAwarded: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Nhận xét của gia sư cho học sinh về câu này',
  })
  @IsOptional()
  @IsString()
  feedback?: string | null;
}

/** Một câu tự luận đang chờ chấm trong hàng đợi (thuộc lượt làm mới nhất của học sinh). */
export interface EssayGradingQueueItemDto {
  attemptAnswerId: string;
  attemptId: string;
  studentId: string;
  studentName: string;
  /** Tổng số lượt học sinh đã làm cho lần giao này (để hiển thị banner "làm N lượt"). */
  studentAttemptCount: number;
  /** Mốc thời gian lượt mới nhất (submittedAt, fallback startedAt). */
  attemptSubmittedAt: Date;
  /** Vị trí câu trong đề (1-based) để hiển thị "Câu N/Total". */
  questionOrder: number;
  totalQuestions: number;
  questionContent: string;
  /** Tên mức độ khó của câu (CourseDifficultyLevel.name). */
  difficultyLabel: string;
  pointsPossible: number;
  answerGuide: string | null;
  essayAnswer: string | null;
}

export interface EssayGradingQueueDto {
  classId: string;
  assignmentId: string;
  title: string;
  totalPending: number;
  items: EssayGradingQueueItemDto[];
}

export class SaveAttemptAnswerItemDto {
  @ApiProperty({ description: 'Question id' })
  @IsString()
  questionId: string;

  @ApiPropertyOptional({ nullable: true, description: 'MCQ choice index' })
  @IsOptional()
  @IsInt()
  @Min(0)
  choiceIndex?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Essay text' })
  @IsOptional()
  @IsString()
  essayAnswer?: string | null;
}

export class SaveAttemptAnswersDto {
  @ApiProperty({ type: [SaveAttemptAnswerItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveAttemptAnswerItemDto)
  answers: SaveAttemptAnswerItemDto[];
}

export interface AttemptQuestionDto {
  questionId: string;
  order: number;
  pointsPossible: number;
  type: 'single_choice' | 'essay';
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
  status: 'in_progress' | 'submitted' | 'timed_out';
  startedAt: Date;
  durationMinutes: number;
  endsAt: Date;
  remainingMs: number;
  submittedAt: Date | null;
  autoGradedScore: number | null;
  autoGradedMax: number | null;
  hasUngradedEssay: boolean;
  questions: AttemptQuestionDto[];
}

export interface AttemptSummaryDto {
  id: string;
  status: 'in_progress' | 'submitted' | 'timed_out';
  startedAt: Date;
  submittedAt: Date | null;
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
  openAt: Date | null;
  attempts: AttemptSummaryDto[];
}
