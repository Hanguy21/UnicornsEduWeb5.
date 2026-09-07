import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { TopicKind } from 'generated/enums';

export class TopicCreateDto {
  @ApiProperty({
    description: 'Loại chuyên đề',
    enum: TopicKind,
    example: TopicKind.theory,
  })
  @IsEnum(TopicKind)
  kind: TopicKind;

  @ApiPropertyOptional({
    description:
      'ID khoá học (bắt buộc khi kind = theory hoặc practice ở cấp khoá)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  courseId?: string | null;

  @ApiPropertyOptional({
    description: 'ID chủ đề (bắt buộc khi thuộc khoá học)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  chapterId?: string | null;

  @ApiPropertyOptional({
    description:
      'ID lớp học (bắt buộc khi chuyên đề gắn lớp, loại trừ courseId+chapterId)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  classId?: string | null;

  @ApiProperty({
    description: 'Tiêu đề chuyên đề',
    example: 'Chuyên đề Đại số tuyến tính',
  })
  @IsString()
  title: string;
}

export class TopicUpdateDto {
  @ApiPropertyOptional({ description: 'Tiêu đề chuyên đề' })
  @IsOptional()
  @IsString()
  title?: string;
}

export interface TopicResponseDto {
  id: string;
  kind: TopicKind;
  courseId: string | null;
  chapterId: string | null;
  classId: string | null;
  title: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// --- Chapter DTOs ---

export class ChapterCreateDto {
  @ApiProperty({
    description: 'ID khoá học',
  })
  @IsString()
  courseId: string;

  @ApiProperty({
    description: 'Tiêu đề chủ đề',
    example: 'Chương 1: Đại số tuyến tính',
  })
  @IsString()
  title: string;
}

export class ChapterUpdateDto {
  @ApiPropertyOptional({ description: 'Tiêu đề chủ đề' })
  @IsOptional()
  @IsString()
  title?: string;
}

export interface ChapterResponseDto {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// --- Lecture DTOs ---

export class LectureCreateDto {
  @ApiProperty({
    description: 'Tiêu đề bài học',
    example: 'Bài 1: Giới thiệu về Ma trận',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Link video YouTube nhúng',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  videoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Nội dung bài học (HTML rich text)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  content?: string | null;
}

export class LectureUpdateDto {
  @ApiPropertyOptional({ description: 'Tiêu đề bài học' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Link video YouTube nhúng',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  videoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Nội dung bài học (HTML rich text)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  content?: string | null;
}

export interface LectureResponseDto {
  id: string;
  topicId: string;
  title: string;
  videoUrl: string | null;
  content: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// --- Class Content DTOs ---

export class ClassContentCreateDto {
  @ApiPropertyOptional({
    description:
      'ID chuyên đề có sẵn từ khoá để thêm vào lớp. Nếu bỏ trống thì tạo topic mới cho lớp.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  topicId?: string;

  @ApiPropertyOptional({
    description: 'Tiêu đề topic mới (bắt buộc khi tạo topic mới cho lớp)',
    example: 'Chuyên đề bổ trợ: Phương trình bậc 2',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Loại chuyên đề (mặc định theory)',
    enum: TopicKind,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(TopicKind)
  kind?: TopicKind;

  @ApiPropertyOptional({
    description:
      'Thời điểm mở bài của lần giao (ISO 8601). Bắt buộc khi chuyên đề luyện tập.',
    example: '2026-09-07T13:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  openAt?: string;

  @ApiPropertyOptional({
    description:
      'Thời lượng làm bài (phút) của lần giao. Bắt buộc khi chuyên đề luyện tập. 1–720.',
    example: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  durationMinutes?: number;
}

export class ClassContentScheduleUpdateDto {
  @ApiProperty({
    description: 'Thời điểm mở bài của lần giao (ISO 8601). Không đụng đề.',
    example: '2026-09-07T13:00:00.000Z',
  })
  @IsDateString()
  openAt: string;

  @ApiProperty({
    description:
      'Thời lượng làm bài (phút) của lần giao. 1–720. Không đụng đề.',
    example: 90,
  })
  @IsInt()
  @Min(1)
  @Max(720)
  durationMinutes: number;
}

export interface ClassContentItemResponseDto {
  id: string;
  topicId: string;
  kind: 'topic';
  topicKind: 'theory' | 'practice';
  sortOrder: number;
  title: string;
  kindLabel: string;
  source: 'course' | 'class';
  chapterTitle?: string;
  lectureCount?: number;
  openAt: Date | string | null;
  durationMinutes: number | null;
  isOpen: boolean;
  hiddenAt: Date | string | null;
  hiddenByStaffId: string | null;
}

// --- QuestionLink DTOs (Practice Topic / Đề) ---

export class QuestionLinkCreateDto {
  @ApiProperty({ description: 'ID câu hỏi từ ngân hàng câu hỏi' })
  @IsString()
  questionId: string;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number | null;

  @ApiPropertyOptional({
    description: 'Điểm của câu hỏi',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number | null;
}

export class QuestionLinkUpdateDto {
  @ApiPropertyOptional({ description: 'Thứ tự hiển thị', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number | null;

  @ApiPropertyOptional({
    description: 'Điểm của câu hỏi',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number | null;
}

export class ReorderQuestionLinksDto {
  @ApiProperty({
    description: 'Danh sách ID theo thứ tự mới',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  linkIds: string[];
}

export interface QuestionLinkResponseDto {
  id: string;
  topicId: string;
  questionId: string;
  order: number | null;
  points: number | null;
  question: {
    id: string;
    courseId: string;
    chapterId: string;
    difficultyLevelId: string;
    type: string;
    content: string;
    options: unknown;
  };
}

// --- Lecture Quiz DTOs ---

export class LectureQuizLinkDto {
  @ApiProperty({
    description: 'Danh sách ID câu hỏi từ ngân hàng cần gắn vào bài học',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  questionIds: string[];
}

export class LectureQuizAnswerDto {
  @ApiProperty({ description: 'ID câu hỏi' })
  @IsString()
  questionId: string;

  @ApiPropertyOptional({
    description: 'Chỉ số đáp án chọn (0-based, cho trắc nghiệm)',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  choiceIndex?: number | null;

  @ApiPropertyOptional({
    description: 'Nội dung trả lời (cho tự luận)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  essayAnswer?: string | null;
}

export interface LectureQuizResponseDto {
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

export interface QuestionLinkSummaryDto {
  totalQuestions: number;
  totalPoints: number;
}

export interface LectureQuizAnswerResponseDto {
  id: string;
  lectureId: string;
  questionId: string;
  studentId: string;
  choiceIndex: number | null;
  essayAnswer: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseTopicForClassDto {
  id: string;
  title: string;
  kind: TopicKind;
  chapterTitle: string;
  chapterId: string;
  lectureCount: number;
  alreadyAdded: boolean;
}
