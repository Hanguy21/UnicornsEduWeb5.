import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CalendarSessionUpdateDto {
  @ApiPropertyOptional({
    description: 'Session date in YYYY-MM-DD format',
    example: '2026-04-15',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must use YYYY-MM-DD format',
  })
  date?: string;

  @ApiPropertyOptional({
    description: 'Session start time in HH:mm:ss format',
    example: '19:00:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}:\d{2}$/, {
    message: 'startTime must use HH:mm:ss format',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Session end time in HH:mm:ss format',
    example: '20:30:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}:\d{2}$/, {
    message: 'endTime must use HH:mm:ss format',
  })
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Session notes',
    example: 'Ghi chú buổi học',
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
    description: 'Teacher ID (UUID)',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  teacherId?: string;
}
