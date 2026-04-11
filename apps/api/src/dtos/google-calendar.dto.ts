import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';

export class CalendarEventResponseDto {
  @ApiProperty({
    description: 'Session ID (UUID)',
    example: '770e8400-e29b-41d4-a716-446655440002',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Class name',
    example: 'Lớp Toán 10A',
  })
  className: string;

  @ApiProperty({
    description: 'Teacher full name',
    example: 'Nguyễn Văn An',
  })
  teacherName: string;

  @ApiProperty({
    description: 'Session date in YYYY-MM-DD format',
    example: '2026-04-15',
  })
  date: string;

  @ApiPropertyOptional({
    description: 'Session start time in HH:mm:ss format',
    example: '19:00:00',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Session end time in HH:mm:ss format',
    example: '20:30:00',
  })
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Google Meet link',
    example: 'https://meet.google.com/abc-defg-hij',
  })
  meetLink?: string;

  @ApiPropertyOptional({
    description: 'Google Calendar event ID',
    example: 'abc123def456@google.com',
  })
  calendarEventId?: string;

  @ApiPropertyOptional({
    description: 'Last sync timestamp (ISO 8601)',
    example: '2026-04-15T10:30:00.000Z',
  })
  syncedAt?: string;
}

export class CalendarSessionUpdateDto {
  @ApiPropertyOptional({
    description: 'Session date in YYYY-MM-DD format',
    example: '2026-04-15',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must use YYYY-MM-DD format',
  })
  date?: string;

  @ApiPropertyOptional({
    description: 'Session start time in HH:mm:ss format',
    example: '19:00:00',
  })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, {
    message: 'startTime must use HH:mm:ss format',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Session end time in HH:mm:ss format',
    example: '20:30:00',
  })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, {
    message: 'endTime must use HH:mm:ss format',
  })
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Session notes',
    example: 'Giải trình bài tập',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Class ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({
    description: 'Teacher/Staff ID (UUID)',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  teacherId?: string;
}

export class CalendarSyncPayload {
  @ApiProperty({
    description: 'Session ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  sessionId: string;
}

export class CalendarEventFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by class ID (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({
    description: 'Filter by teacher/staff ID (UUID format)',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @ApiProperty({
    description: 'Start date in YYYY-MM-DD format',
    example: '2026-04-01',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must use YYYY-MM-DD format',
  })
  startDate: string;

  @ApiProperty({
    description: 'End date in YYYY-MM-DD format',
    example: '2026-04-30',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must use YYYY-MM-DD format',
  })
  endDate: string;
}

export class ResyncResponseDto {
  @ApiProperty({
    description: 'Whether the resync operation succeeded',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Google Meet link after resync',
    example: 'https://meet.google.com/xyz-uvw-rst',
  })
  meetLink?: string;

  @ApiPropertyOptional({
    description: 'Error message if resync failed',
    example: 'Teacher email not found',
  })
  error?: string;
}
