import { Module } from '@nestjs/common';
import { ActionHistoryModule } from '../action-history/action-history.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';

@Module({
  imports: [PrismaModule, ActionHistoryModule],
  controllers: [LessonController],
  providers: [LessonService],
  exports: [LessonService],
})
export class LessonModule {}
