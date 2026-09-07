import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StaffOperationsModule } from 'src/staff-ops/staff-operations.module';
import { TopicModule } from 'src/topic/topic.module';
import { StudentAttemptController } from './attempt.controller';
import {
  StaffAttemptGradingController,
  StaffAttemptStatsController,
} from './staff-attempt.controller';
import { AttemptService } from './attempt.service';

@Module({
  imports: [PrismaModule, TopicModule, StaffOperationsModule],
  controllers: [
    StudentAttemptController,
    StaffAttemptGradingController,
    StaffAttemptStatsController,
  ],
  providers: [AttemptService],
  exports: [AttemptService],
})
export class AttemptModule {}
