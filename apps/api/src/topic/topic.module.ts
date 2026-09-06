import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ActionHistoryModule } from 'src/action-history/action-history.module';
import {
  TopicController,
  CourseChapterController,
  CourseTopicController,
  ClassTopicController,
  LectureController,
} from './topic.controller';
import { TopicService } from './topic.service';

@Module({
  imports: [PrismaModule, ActionHistoryModule],
  controllers: [
    TopicController,
    CourseChapterController,
    CourseTopicController,
    ClassTopicController,
    LectureController,
  ],
  providers: [TopicService],
  exports: [TopicService],
})
export class TopicModule {}
