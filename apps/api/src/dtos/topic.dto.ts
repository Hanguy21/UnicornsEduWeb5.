import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
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

  @ApiPropertyOptional({
    description:
      'Link video YouTube nhúng (legacy, dùng Lecture cho nội dung mới)',
    example: 'https://youtube.com/watch?v=abc123',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  videoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Nội dung chuyên đề (legacy, dùng Lecture cho nội dung mới)',
    example: '<p>Nội dung bài học...</p>',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  content?: string | null;
}

export class TopicUpdateDto {
  @ApiPropertyOptional({ description: 'Tiêu đề chuyên đề' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Link video YouTube nhúng (legacy)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  videoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Nội dung chuyên đề (legacy)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  content?: string | null;
}

export interface TopicResponseDto {
  id: string;
  kind: TopicKind;
  courseId: string | null;
  chapterId: string | null;
  classId: string | null;
  title: string;
  videoUrl: string | null;
  content: string | null;
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
