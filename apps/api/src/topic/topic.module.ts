import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ActionHistoryModule } from 'src/action-history/action-history.module';
import {
  CourseChapterController,
  CourseTopicController,
  ClassTopicController,
  LectureController,
  ClassContentController,
  PracticeTopicQuestionController,
} from './topic.controller';
import { TopicService } from './topic.service';

@Module({
  imports: [PrismaModule, ActionHistoryModule],
  controllers: [
    CourseChapterController,
    CourseTopicController,
    ClassTopicController,
    LectureController,
    ClassContentController,
    PracticeTopicQuestionController,
  ],
  providers: [TopicService],
  exports: [TopicService],
})
export class TopicModule {}
