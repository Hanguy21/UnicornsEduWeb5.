import { Injectable } from '@nestjs/common';
import { ActionHistoryService } from 'src/action-history/action-history.service';
import { CourseAccessService } from 'src/class/course-access.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClassContentService } from './class-content.service';
import { CourseChapterService } from './course-chapter.service';
import { CourseTopicService } from './course-topic.service';
import { ExamLibraryService } from './exam-library.service';
import { LectureService } from './lecture.service';
import { PracticeQuestionLinkService } from './practice-question-link.service';
import { TopicSupportService } from './topic-support.service';

export type { ActionHistoryActor } from './topic-support.service';
export { TopicSupportService } from './topic-support.service';

/**
 * Compat aggregator so existing unit tests and Attempt/UserProfile injectors
 * keep constructing one 3-arg service. Controllers inject the resource
 * services below; this class does not own business logic.
 */
@Injectable()
export class TopicService extends TopicSupportService {
  private readonly chapters: CourseChapterService;
  private readonly topics: CourseTopicService;
  private readonly exams: ExamLibraryService;
  private readonly lectures: LectureService;
  private readonly questions: PracticeQuestionLinkService;
  private readonly content: ClassContentService;

  constructor(
    prisma: PrismaService,
    actionHistory: ActionHistoryService,
    courseAccess: CourseAccessService,
  ) {
    super(prisma, actionHistory, courseAccess);
    this.chapters = new CourseChapterService(
      prisma,
      actionHistory,
      courseAccess,
    );
    this.topics = new CourseTopicService(prisma, actionHistory, courseAccess);
    this.exams = new ExamLibraryService(
      prisma,
      actionHistory,
      courseAccess,
      this.topics,
    );
    this.lectures = new LectureService(prisma, actionHistory, courseAccess);
    this.questions = new PracticeQuestionLinkService(
      prisma,
      actionHistory,
      courseAccess,
    );
    this.content = new ClassContentService(prisma, actionHistory, courseAccess);
  }

  createChapter(...args: Parameters<CourseChapterService['createChapter']>) {
    return this.chapters.createChapter(...args);
  }

  updateChapter(...args: Parameters<CourseChapterService['updateChapter']>) {
    return this.chapters.updateChapter(...args);
  }

  deleteChapter(...args: Parameters<CourseChapterService['deleteChapter']>) {
    return this.chapters.deleteChapter(...args);
  }

  getChaptersByCourseId(
    ...args: Parameters<CourseChapterService['getChaptersByCourseId']>
  ) {
    return this.chapters.getChaptersByCourseId(...args);
  }

  getChapterById(...args: Parameters<CourseChapterService['getChapterById']>) {
    return this.chapters.getChapterById(...args);
  }

  reorderChapters(
    ...args: Parameters<CourseChapterService['reorderChapters']>
  ) {
    return this.chapters.reorderChapters(...args);
  }

  createTopic(...args: Parameters<CourseTopicService['createTopic']>) {
    return this.topics.createTopic(...args);
  }

  updateTopic(...args: Parameters<CourseTopicService['updateTopic']>) {
    return this.topics.updateTopic(...args);
  }

  deleteTopic(...args: Parameters<CourseTopicService['deleteTopic']>) {
    return this.topics.deleteTopic(...args);
  }

  getTopicsByCourseId(
    ...args: Parameters<CourseTopicService['getTopicsByCourseId']>
  ) {
    return this.topics.getTopicsByCourseId(...args);
  }

  getTopicsByClassId(
    ...args: Parameters<CourseTopicService['getTopicsByClassId']>
  ) {
    return this.topics.getTopicsByClassId(...args);
  }

  getTopicById(...args: Parameters<CourseTopicService['getTopicById']>) {
    return this.topics.getTopicById(...args);
  }

  getTopicsForStudent(
    ...args: Parameters<CourseTopicService['getTopicsForStudent']>
  ) {
    return this.topics.getTopicsForStudent(...args);
  }

  reorderTopics(...args: Parameters<CourseTopicService['reorderTopics']>) {
    return this.topics.reorderTopics(...args);
  }

  getExamLibrary(...args: Parameters<ExamLibraryService['getExamLibrary']>) {
    return this.exams.getExamLibrary(...args);
  }

  createExamTopic(...args: Parameters<ExamLibraryService['createExamTopic']>) {
    return this.exams.createExamTopic(...args);
  }

  updateExamTopic(...args: Parameters<ExamLibraryService['updateExamTopic']>) {
    return this.exams.updateExamTopic(...args);
  }

  deleteExamTopic(...args: Parameters<ExamLibraryService['deleteExamTopic']>) {
    return this.exams.deleteExamTopic(...args);
  }

  reorderExamTopics(
    ...args: Parameters<ExamLibraryService['reorderExamTopics']>
  ) {
    return this.exams.reorderExamTopics(...args);
  }

  createLecture(...args: Parameters<LectureService['createLecture']>) {
    return this.lectures.createLecture(...args);
  }

  updateLecture(...args: Parameters<LectureService['updateLecture']>) {
    return this.lectures.updateLecture(...args);
  }

  deleteLecture(...args: Parameters<LectureService['deleteLecture']>) {
    return this.lectures.deleteLecture(...args);
  }

  getLecturesByTopicId(
    ...args: Parameters<LectureService['getLecturesByTopicId']>
  ) {
    return this.lectures.getLecturesByTopicId(...args);
  }

  getLectureById(...args: Parameters<LectureService['getLectureById']>) {
    return this.lectures.getLectureById(...args);
  }

  reorderLectures(...args: Parameters<LectureService['reorderLectures']>) {
    return this.lectures.reorderLectures(...args);
  }

  linkQuizQuestions(...args: Parameters<LectureService['linkQuizQuestions']>) {
    return this.lectures.linkQuizQuestions(...args);
  }

  unlinkQuizQuestion(
    ...args: Parameters<LectureService['unlinkQuizQuestion']>
  ) {
    return this.lectures.unlinkQuizQuestion(...args);
  }

  getLectureQuizzes(...args: Parameters<LectureService['getLectureQuizzes']>) {
    return this.lectures.getLectureQuizzes(...args);
  }

  getLectureQuizzesForStudent(
    ...args: Parameters<LectureService['getLectureQuizzesForStudent']>
  ) {
    return this.lectures.getLectureQuizzesForStudent(...args);
  }

  submitQuizAnswers(...args: Parameters<LectureService['submitQuizAnswers']>) {
    return this.lectures.submitQuizAnswers(...args);
  }

  getQuizAnswers(...args: Parameters<LectureService['getQuizAnswers']>) {
    return this.lectures.getQuizAnswers(...args);
  }

  getQuestionsByTopicId(
    ...args: Parameters<PracticeQuestionLinkService['getQuestionsByTopicId']>
  ) {
    return this.questions.getQuestionsByTopicId(...args);
  }

  addQuestionToTopic(
    ...args: Parameters<PracticeQuestionLinkService['addQuestionToTopic']>
  ) {
    return this.questions.addQuestionToTopic(...args);
  }

  updateQuestionLink(
    ...args: Parameters<PracticeQuestionLinkService['updateQuestionLink']>
  ) {
    return this.questions.updateQuestionLink(...args);
  }

  removeQuestionFromTopic(
    ...args: Parameters<PracticeQuestionLinkService['removeQuestionFromTopic']>
  ) {
    return this.questions.removeQuestionFromTopic(...args);
  }

  reorderQuestionLinks(
    ...args: Parameters<PracticeQuestionLinkService['reorderQuestionLinks']>
  ) {
    return this.questions.reorderQuestionLinks(...args);
  }

  getQuestionLinkSummary(
    ...args: Parameters<PracticeQuestionLinkService['getQuestionLinkSummary']>
  ) {
    return this.questions.getQuestionLinkSummary(...args);
  }

  isTopicAssignedToClass(
    ...args: Parameters<PracticeQuestionLinkService['isTopicAssignedToClass']>
  ) {
    return this.questions.isTopicAssignedToClass(...args);
  }

  getTopicForStudent(
    ...args: Parameters<ClassContentService['getTopicForStudent']>
  ) {
    return this.content.getTopicForStudent(...args);
  }

  getAssignedTopicForStudent(
    ...args: Parameters<ClassContentService['getAssignedTopicForStudent']>
  ) {
    return this.content.getAssignedTopicForStudent(...args);
  }

  recordTheoryTopicViewForStudent(
    ...args: Parameters<ClassContentService['recordTheoryTopicViewForStudent']>
  ) {
    return this.content.recordTheoryTopicViewForStudent(...args);
  }

  getPracticeAssignmentForStudent(
    ...args: Parameters<ClassContentService['getPracticeAssignmentForStudent']>
  ) {
    return this.content.getPracticeAssignmentForStudent(...args);
  }

  createClassContentItem(
    ...args: Parameters<ClassContentService['createClassContentItem']>
  ) {
    return this.content.createClassContentItem(...args);
  }

  listClassContentItems(
    ...args: Parameters<ClassContentService['listClassContentItems']>
  ) {
    return this.content.listClassContentItems(...args);
  }

  getClassTheoryProgress(
    ...args: Parameters<ClassContentService['getClassTheoryProgress']>
  ) {
    return this.content.getClassTheoryProgress(...args);
  }

  reorderClassContentItems(
    ...args: Parameters<ClassContentService['reorderClassContentItems']>
  ) {
    return this.content.reorderClassContentItems(...args);
  }

  deleteClassContentItem(
    ...args: Parameters<ClassContentService['deleteClassContentItem']>
  ) {
    return this.content.deleteClassContentItem(...args);
  }

  restoreClassContentItem(
    ...args: Parameters<ClassContentService['restoreClassContentItem']>
  ) {
    return this.content.restoreClassContentItem(...args);
  }

  updateClassContentSchedule(
    ...args: Parameters<ClassContentService['updateClassContentSchedule']>
  ) {
    return this.content.updateClassContentSchedule(...args);
  }

  listClassContentForStudent(
    ...args: Parameters<ClassContentService['listClassContentForStudent']>
  ) {
    return this.content.listClassContentForStudent(...args);
  }

  listCourseTopicsForClass(
    ...args: Parameters<ClassContentService['listCourseTopicsForClass']>
  ) {
    return this.content.listCourseTopicsForClass(...args);
  }
}
