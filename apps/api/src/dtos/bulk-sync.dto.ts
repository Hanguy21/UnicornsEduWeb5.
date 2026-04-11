import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID } from 'class-validator';

export class BulkSyncDto {
  @ApiProperty({
    description: 'List of session IDs to sync',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  sessionIds: string[];
}
