import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ActionHistoryModule } from 'src/action-history/action-history.module';
import { ClassModule } from 'src/class/class.module';
import {
  CourseChapterController,
  CourseTopicController,
  ClassTopicController,
  LectureController,
  ClassContentController,
  PracticeTopicQuestionController,
  CourseExamLibraryController,
} from './topic.controller';
import { TopicService } from './topic.service';

@Module({
  imports: [PrismaModule, ActionHistoryModule, ClassModule],
  controllers: [
    CourseChapterController,
    CourseTopicController,
    ClassTopicController,
    LectureController,
    ClassContentController,
    PracticeTopicQuestionController,
    CourseExamLibraryController,
  ],
  providers: [TopicService],
  exports: [TopicService],
})
export class TopicModule {}
