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
