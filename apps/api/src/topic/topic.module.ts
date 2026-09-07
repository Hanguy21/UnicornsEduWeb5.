import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ActionHistoryModule } from 'src/action-history/action-history.module';
import { ClassModule } from 'src/class/class.module';
import { ClassContentController } from './class-content.controller';
import { ClassContentService } from './class-content.service';
import { ClassTopicController } from './class-topic.controller';
import { CourseChapterController } from './course-chapter.controller';
import { CourseChapterService } from './course-chapter.service';
import { CourseTopicController } from './course-topic.controller';
import { CourseTopicService } from './course-topic.service';
import { CourseExamLibraryController } from './exam-library.controller';
import { ExamLibraryService } from './exam-library.service';
import { LectureController } from './lecture.controller';
import { LectureService } from './lecture.service';
import { PracticeTopicQuestionController } from './practice-topic-question.controller';
import { PracticeQuestionLinkService } from './practice-question-link.service';
import { TopicSupportService } from './topic-support.service';
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
  providers: [
    TopicSupportService,
    CourseChapterService,
    CourseTopicService,
    LectureService,
    ClassContentService,
    PracticeQuestionLinkService,
    ExamLibraryService,
    TopicService,
  ],
  exports: [
    TopicSupportService,
    CourseChapterService,
    CourseTopicService,
    LectureService,
    ClassContentService,
    PracticeQuestionLinkService,
    ExamLibraryService,
    TopicService,
  ],
})
export class TopicModule {}
