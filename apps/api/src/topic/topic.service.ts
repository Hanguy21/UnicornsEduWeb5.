import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActionHistoryService } from 'src/action-history/action-history.service';
import { CourseAccessService } from 'src/class/course-access.service';
import {
  TopicCreateDto,
  TopicUpdateDto,
  TopicResponseDto,
  ChapterCreateDto,
  ChapterUpdateDto,
  ChapterResponseDto,
  LectureCreateDto,
  LectureUpdateDto,
  LectureResponseDto,
  ClassContentCreateDto,
  ClassContentScheduleUpdateDto,
  ClassContentItemResponseDto,
  PRACTICE_DURATION_MIN_MINUTES,
  PRACTICE_DURATION_MAX_MINUTES,
  QuestionLinkCreateDto,
  QuestionLinkUpdateDto,
  QuestionLinkResponseDto,
  QuestionLinkSummaryDto,
  CourseTopicForClassDto,
} from 'src/dtos/topic.dto';
import { UserRole, TopicKind, StaffRole, ClassTimelineItemKind } from 'generated/enums';
import { appendClassTimelineItem, syncClassTimelineSortByTime } from 'src/class-timeline/append-timeline-item';

export interface ActionHistoryActor {
  userId: string;
  userEmail: string;
  roleType: UserRole;
}

@Injectable()
export class TopicService {
  private readonly logger = new Logger(TopicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistory: ActionHistoryService,
    private readonly courseAccess: CourseAccessService,
  ) {}

  // ─── Chapter CRUD ───

  async createChapter(
    dto: ChapterCreateDto,
    actor: ActionHistoryActor,
  ): Promise<ChapterResponseDto> {
    await this.validateCourseExists(dto.courseId);
    await this.assertCanManageCourseContent(actor, dto.courseId);

    const chapter = await this.prisma.chapter.create({
      data: {
        courseId: dto.courseId,
        title: dto.title,
      },
    });

    this.logger.log(
      `Chapter created: ${chapter.id} for course ${dto.courseId} by ${actor.userEmail}`,
    );

    return chapter;
  }

  async updateChapter(
    chapterId: string,
    dto: ChapterUpdateDto,
    actor: ActionHistoryActor,
  ): Promise<ChapterResponseDto> {
    const existing = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
    });
    if (!existing) {
      throw new NotFoundException(`Chapter ${chapterId} not found`);
    }
    await this.assertCanManageCourseContent(actor, existing.courseId);

    const chapter = await this.prisma.chapter.update({
      where: { id: chapterId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
      },
    });

    this.logger.log(`Chapter updated: ${chapterId} by ${actor.userEmail}`);
    return chapter;
  }

  async deleteChapter(
    chapterId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    const existing = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
    });
    if (!existing) {
      throw new NotFoundException(`Chapter ${chapterId} not found`);
    }
    await this.assertCanManageCourseContent(actor, existing.courseId);

    const chapterTopics = await this.prisma.topic.findMany({
      where: { chapterId },
      select: { id: true },
    });
    await this.assertTopicsNotUsedByClasses(
      chapterTopics.map((t) => t.id),
      'Chủ đề',
    );

    await this.prisma.chapter.delete({ where: { id: chapterId } });
    this.logger.log(`Chapter deleted: ${chapterId} by ${actor.userEmail}`);
  }

  async getChaptersByCourseId(courseId: string): Promise<ChapterResponseDto[]> {
    await this.validateCourseExists(courseId);

    return this.prisma.chapter.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getChapterById(chapterId: string): Promise<ChapterResponseDto> {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
    });
    if (!chapter) {
      throw new NotFoundException(`Chapter ${chapterId} not found`);
    }
    return chapter;
  }

  async reorderChapters(
    courseId: string,
    chapterIds: string[],
    actor: ActionHistoryActor,
  ): Promise<void> {
    await this.validateCourseExists(courseId);
    await this.assertCanManageCourseContent(actor, courseId);

    const updates = chapterIds.map((id, index) =>
      this.prisma.chapter.update({
        where: { id, courseId },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);
  }

  // ─── Topic CRUD ───

  async createTopic(
    dto: TopicCreateDto,
    actor: ActionHistoryActor,
  ): Promise<TopicResponseDto> {
    await this.validateTopicOwnership(dto);

    if (dto.courseId) {
      await this.validateCourseExists(dto.courseId);
      await this.assertCanManageCourseContent(actor, dto.courseId);
      if (dto.chapterId) {
        await this.validateChapterExists(dto.chapterId);
      }
    }

    if (dto.classId) {
      await this.validateClassExists(dto.classId);
      await this.validateStaffClassAccess(dto.classId, actor);
    }

    const topic = await this.prisma.topic.create({
      data: {
        kind: dto.kind,
        courseId: dto.courseId ?? null,
        chapterId: dto.chapterId ?? null,
        classId: dto.classId ?? null,
        title: dto.title,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    this.logger.log(
      `Topic created: ${topic.id} (${dto.kind}) by ${actor.userEmail}`,
    );

    return topic;
  }

  async updateTopic(
    topicId: string,
    dto: TopicUpdateDto,
    actor: ActionHistoryActor,
  ): Promise<TopicResponseDto> {
    const existing = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!existing) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }

    if (existing.classId) {
      await this.validateStaffClassAccess(existing.classId, actor);
    } else if (existing.courseId) {
      await this.assertCanManageCourseContent(actor, existing.courseId);
    }

    const topic = await this.prisma.topic.update({
      where: { id: topicId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        updatedBy: actor.userId,
      },
    });

    this.logger.log(`Topic updated: ${topicId} by ${actor.userEmail}`);
    return topic;
  }

  async deleteTopic(topicId: string, actor: ActionHistoryActor): Promise<void> {
    const existing = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!existing) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }

    if (existing.classId) {
      await this.validateStaffClassAccess(existing.classId, actor);
    } else if (existing.courseId) {
      await this.assertCanManageCourseContent(actor, existing.courseId);
    }

    await this.assertTopicsNotUsedByClasses([topicId], 'Chuyên đề');

    await this.prisma.topic.delete({ where: { id: topicId } });
    this.logger.log(`Topic deleted: ${topicId} by ${actor.userEmail}`);
  }

  async getTopicsByCourseId(
    courseId: string,
    chapterId?: string,
  ): Promise<TopicResponseDto[]> {
    await this.validateCourseExists(courseId);

    return this.prisma.topic.findMany({
      where: {
        courseId,
        ...(chapterId ? { chapterId } : { chapterId: null }),
      },
      orderBy: { order: 'asc' },
    });
  }

  async getTopicsByClassId(
    classId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: TopicResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.validateClassExists(classId);

    const [data, total] = await Promise.all([
      this.prisma.topic.findMany({
        where: { classId },
        orderBy: { order: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.topic.count({ where: { classId } }),
    ]);

    return { data, total, page, limit };
  }

  async getTopicById(topicId: string): Promise<TopicResponseDto> {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!topic) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }
    return topic;
  }

  async getTopicsForStudent(
    classId: string,
    studentId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: TopicResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.validateClassExists(classId);
    await this.validateStudentClassAccess(classId, studentId);

    const [data, total] = await Promise.all([
      this.prisma.topic.findMany({
        where: { classId },
        orderBy: { order: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.topic.count({ where: { classId } }),
    ]);

    return { data, total, page, limit };
  }

  async getTopicForStudent(
    topicId: string,
    studentId: string,
    classId?: string,
  ): Promise<TopicResponseDto> {
    if (classId) {
      return this.getAssignedTopicForStudent(classId, topicId, studentId);
    }

    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!topic) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }

    if (topic.classId) {
      await this.validateStudentClassAccess(topic.classId, studentId);
    }

    return topic;
  }

  /**
   * Student may open a topic only through a lần giao on this class.
   * Practice assignments stay closed until `openAt`.
   */
  async getAssignedTopicForStudent(
    classId: string,
    topicId: string,
    studentId: string,
  ): Promise<TopicResponseDto> {
    await this.validateStudentClassAccess(classId, studentId);

    const item = await this.prisma.classContentItem.findUnique({
      where: { classId_topicId: { classId, topicId } },
      include: { topic: true },
    });
    if (!item?.topic) {
      throw new NotFoundException('Topic not found');
    }
    this.assertClassContentVisibleToStudent(item.hiddenAt);

    this.assertPracticeAssignmentOpen(item.topic.kind, item.openAt);
    return item.topic;
  }

  /**
   * Practice lần giao the student may start/resume. Reuses enrollment expiry (#49)
   * and openAt (#59) — callers must not re-implement those checks.
   */
  async getPracticeAssignmentForStudent(
    classId: string,
    assignmentId: string,
    studentId: string,
  ) {
    await this.validateStudentClassAccess(classId, studentId);

    const item = await this.prisma.classContentItem.findFirst({
      where: { id: assignmentId, classId },
      include: { topic: true },
    });
    if (!item?.topic) {
      throw new NotFoundException('Assignment not found');
    }
    this.assertClassContentVisibleToStudent(item.hiddenAt);
    if (item.topic.kind !== TopicKind.practice) {
      throw new BadRequestException(
        'Attempts are only for practice assignments',
      );
    }
    this.assertPracticeAssignmentOpen(item.topic.kind, item.openAt);
    if (item.durationMinutes == null || item.durationMinutes < 1) {
      throw new BadRequestException('Assignment has no duration');
    }
    return item;
  }

  async reorderTopics(
    topicIds: string[],
    opts: { chapterId?: string; classId?: string },
    actor: ActionHistoryActor,
  ): Promise<void> {
    if (opts.chapterId) {
      const chapter = await this.validateChapterExists(opts.chapterId);
      await this.assertCanManageCourseContent(actor, chapter.courseId);
    }
    if (opts.classId) {
      await this.validateClassExists(opts.classId);
      await this.validateStaffClassAccess(opts.classId, actor);
    }

    const updates = topicIds.map((id, index) =>
      this.prisma.topic.update({
        where: {
          id,
          ...(opts.chapterId ? { chapterId: opts.chapterId } : {}),
          ...(opts.classId ? { classId: opts.classId } : {}),
        },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);
  }

  // ─── Exam Library (practice topics at course level, chapterId null) ───

  async getExamLibrary(
    courseId: string,
    params: { search?: string; page?: number; limit?: number },
  ): Promise<{
    data: TopicResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.validateCourseExists(courseId);
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const where = {
      courseId,
      kind: TopicKind.practice,
      chapterId: null,
      ...(params.search
        ? { title: { contains: params.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.topic.findMany({
        where,
        orderBy: { order: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.topic.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createExamTopic(
    courseId: string,
    dto: TopicCreateDto,
    actor: ActionHistoryActor,
  ): Promise<TopicResponseDto> {
    return this.createTopic(
      {
        kind: TopicKind.practice,
        courseId,
        chapterId: null,
        classId: null,
        title: dto.title,
      },
      actor,
    );
  }

  async updateExamTopic(
    topicId: string,
    dto: TopicUpdateDto,
    actor: ActionHistoryActor,
  ): Promise<TopicResponseDto> {
    await this.assertIsExamTopic(topicId, 'chỉnh sửa');
    return this.updateTopic(topicId, dto, actor);
  }

  async deleteExamTopic(
    topicId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    await this.assertIsExamTopic(topicId, 'xóa');
    return this.deleteTopic(topicId, actor);
  }

  private async assertIsExamTopic(
    topicId: string,
    action: string,
  ): Promise<void> {
    const existing = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!existing) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }
    if (existing.kind !== TopicKind.practice || existing.chapterId !== null) {
      throw new BadRequestException(
        `Chỉ đề thi trong thư viện mới ${action} được`,
      );
    }
  }

  async reorderExamTopics(
    courseId: string,
    topicIds: string[],
    actor: ActionHistoryActor,
  ): Promise<void> {
    await this.validateCourseExists(courseId);
    await this.assertCanManageCourseContent(actor, courseId);

    const updates = topicIds.map((id, index) =>
      this.prisma.topic.update({
        where: { id, courseId, chapterId: null },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);
  }

  // ─── Lecture CRUD ───

  async createLecture(
    topicId: string,
    dto: LectureCreateDto,
    actor: ActionHistoryActor,
  ): Promise<LectureResponseDto> {
    const topic = await this.validateTopicExists(topicId);
    await this.assertCanManageOwnedAcademicContent(actor, topic);

    if (topic.kind !== TopicKind.theory) {
      throw new BadRequestException('Chỉ chuyên đề lý thuyết mới có bài học');
    }

    const lecture = await this.prisma.lecture.create({
      data: {
        topicId,
        title: dto.title,
        videoUrl: dto.videoUrl ?? null,
        content: dto.content ?? null,
      },
    });

    this.logger.log(
      `Lecture created: ${lecture.id} for topic ${topicId} by ${actor.userEmail}`,
    );

    return lecture;
  }

  async updateLecture(
    lectureId: string,
    dto: LectureUpdateDto,
    actor: ActionHistoryActor,
  ): Promise<LectureResponseDto> {
    const existing = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { topic: { select: { courseId: true, classId: true } } },
    });
    if (!existing) {
      throw new NotFoundException(`Lecture ${lectureId} not found`);
    }
    await this.assertCanManageOwnedAcademicContent(actor, existing.topic);

    const lecture = await this.prisma.lecture.update({
      where: { id: lectureId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl }),
        ...(dto.content !== undefined && { content: dto.content }),
      },
    });

    this.logger.log(`Lecture updated: ${lectureId} by ${actor.userEmail}`);
    return lecture;
  }

  async deleteLecture(
    lectureId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    const existing = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { topic: { select: { courseId: true, classId: true } } },
    });
    if (!existing) {
      throw new NotFoundException(`Lecture ${lectureId} not found`);
    }
    await this.assertCanManageOwnedAcademicContent(actor, existing.topic);

    await this.assertTopicsNotUsedByClasses([existing.topicId], 'Bài học');

    await this.prisma.lecture.delete({ where: { id: lectureId } });
    this.logger.log(`Lecture deleted: ${lectureId} by ${actor.userEmail}`);
  }

  async getLecturesByTopicId(topicId: string): Promise<LectureResponseDto[]> {
    await this.validateTopicExists(topicId);

    return this.prisma.lecture.findMany({
      where: { topicId },
      orderBy: { order: 'asc' },
    });
  }

  async getLectureById(lectureId: string): Promise<LectureResponseDto> {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
    });
    if (!lecture) {
      throw new NotFoundException(`Lecture ${lectureId} not found`);
    }
    return lecture;
  }

  async reorderLectures(
    topicId: string,
    lectureIds: string[],
    actor: ActionHistoryActor,
  ): Promise<void> {
    const topic = await this.validateTopicExists(topicId);
    await this.assertCanManageOwnedAcademicContent(actor, topic);

    const updates = lectureIds.map((id, index) =>
      this.prisma.lecture.update({
        where: { id, topicId },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);
  }

  // ─── Lecture Quiz ───

  async linkQuizQuestions(
    lectureId: string,
    questionIds: string[],
    actor: ActionHistoryActor,
  ): Promise<void> {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { topic: { select: { courseId: true, classId: true } } },
    });
    if (!lecture) {
      throw new NotFoundException(`Lecture ${lectureId} not found`);
    }
    await this.assertCanManageOwnedAcademicContent(actor, lecture.topic);

    // Validate questions belong to the same course
    if (lecture.topic.courseId) {
      const questions = await this.prisma.question.findMany({
        where: {
          id: { in: questionIds },
          courseId: lecture.topic.courseId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (questions.length !== questionIds.length) {
        throw new BadRequestException(
          'Một số câu hỏi không thuộc khoá học này',
        );
      }
    }

    // Get current max order
    const maxOrder = await this.prisma.lectureQuiz.aggregate({
      where: { lectureId },
      _max: { order: true },
    });
    let nextOrder = (maxOrder._max.order ?? -1) + 1;

    await this.prisma.$transaction(async (tx) => {
      for (const questionId of questionIds) {
        // Skip if already linked
        const existing = await tx.lectureQuiz.findUnique({
          where: { lectureId_questionId: { lectureId, questionId } },
        });
        if (!existing) {
          await tx.lectureQuiz.create({
            data: { lectureId, questionId, order: nextOrder++ },
          });
        }
      }

      await this.actionHistory.recordCreate(tx, {
        entityType: 'lecture_quiz',
        entityId: lectureId,
        actor,
        afterValue: { lectureId, questionIds },
      });
    });

    this.logger.log(
      `Quiz questions linked to lecture ${lectureId} by ${actor.userEmail}`,
    );
  }

  async unlinkQuizQuestion(
    lectureId: string,
    questionId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { topic: { select: { courseId: true, classId: true } } },
    });
    if (!lecture) {
      throw new NotFoundException(`Lecture ${lectureId} not found`);
    }
    await this.assertCanManageOwnedAcademicContent(actor, lecture.topic);

    const link = await this.prisma.lectureQuiz.findUnique({
      where: { lectureId_questionId: { lectureId, questionId } },
    });
    if (!link) {
      throw new NotFoundException('Câu hỏi chưa được gắn vào bài học này');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.lectureQuiz.delete({
        where: { lectureId_questionId: { lectureId, questionId } },
      });

      await this.actionHistory.recordDelete(tx, {
        entityType: 'lecture_quiz',
        entityId: lectureId,
        actor,
        beforeValue: link,
      });
    });

    this.logger.log(
      `Quiz question ${questionId} unlinked from lecture ${lectureId} by ${actor.userEmail}`,
    );
  }

  async getLectureQuizzes(lectureId: string, actor: ActionHistoryActor) {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { topic: { select: { courseId: true, classId: true } } },
    });
    if (!lecture) {
      throw new NotFoundException(`Lecture ${lectureId} not found`);
    }
    await this.assertCanManageOwnedAcademicContent(actor, lecture.topic);

    return this.prisma.lectureQuiz.findMany({
      where: { lectureId },
      orderBy: { order: 'asc' },
      include: {
        question: {
          select: {
            id: true,
            type: true,
            content: true,
            options: true,
            correctIndex: true,
            explanation: true,
            answerGuide: true,
          },
        },
      },
    });
  }

  async getLectureQuizzesForStudent(lectureId: string) {
    await this.getLectureById(lectureId); // validate exists

    // Students see questions without correctIndex (revealed only after submission)
    const quizzes = await this.prisma.lectureQuiz.findMany({
      where: { lectureId },
      orderBy: { order: 'asc' },
      include: {
        question: {
          select: {
            id: true,
            type: true,
            content: true,
            options: true,
            explanation: true,
            answerGuide: true,
          },
        },
      },
    });

    return quizzes.map((q) => ({
      ...q,
      question: { ...q.question, correctIndex: null },
    }));
  }

  async submitQuizAnswers(
    lectureId: string,
    studentId: string,
    answers: {
      questionId: string;
      choiceIndex?: number | null;
      essayAnswer?: string | null;
    }[],
  ) {
    await this.getLectureById(lectureId); // validate exists

    // Verify all questions are linked to this lecture
    const linkedQuestionIds = (
      await this.prisma.lectureQuiz.findMany({
        where: { lectureId },
        select: { questionId: true },
      })
    ).map((q) => q.questionId);

    const invalid = answers.filter(
      (a) => !linkedQuestionIds.includes(a.questionId),
    );
    if (invalid.length) {
      throw new BadRequestException('Một số câu hỏi không thuộc bài học này');
    }

    // Upsert answers
    await this.prisma.$transaction(
      answers.map((a) =>
        this.prisma.lectureQuizAnswer.upsert({
          where: {
            lectureId_questionId_studentId: {
              lectureId,
              questionId: a.questionId,
              studentId,
            },
          },
          create: {
            lectureId,
            questionId: a.questionId,
            studentId,
            choiceIndex: a.choiceIndex ?? null,
            essayAnswer: a.essayAnswer ?? null,
          },
          update: {
            choiceIndex: a.choiceIndex ?? null,
            essayAnswer: a.essayAnswer ?? null,
          },
        }),
      ),
    );

    // Return answers with correctIndex for review
    return this.prisma.lectureQuizAnswer.findMany({
      where: { lectureId, studentId },
      include: {
        question: {
          select: {
            id: true,
            type: true,
            content: true,
            options: true,
            correctIndex: true,
            explanation: true,
            answerGuide: true,
          },
        },
      },
    });
  }

  async getQuizAnswers(lectureId: string, studentId: string) {
    return this.prisma.lectureQuizAnswer.findMany({
      where: { lectureId, studentId },
      include: {
        question: {
          select: {
            id: true,
            type: true,
            content: true,
            options: true,
            correctIndex: true,
            explanation: true,
            answerGuide: true,
          },
        },
      },
    });
  }

  async findStudentIdByUserId(userId: string): Promise<string | null> {
    const studentInfo = await this.prisma.studentInfo.findFirst({
      where: { userId },
      select: { id: true },
    });
    return studentInfo?.id ?? null;
  }

  // ─── Question Link CRUD (Practice Topic / Đề) ───

  private async validatePracticeTopic(topicId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!topic) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }
    if (topic.kind !== TopicKind.practice) {
      throw new BadRequestException(
        'Chỉ chuyên đề luyện tập mới có danh sách câu hỏi',
      );
    }
    let courseId = topic.courseId;
    if (!courseId) {
      if (!topic.classId) {
        throw new BadRequestException(
          'Chuyên đề luyện tập phải thuộc một khoá học hoặc một lớp',
        );
      }
      const cls = await this.prisma.class.findUnique({
        where: { id: topic.classId },
        select: { courseId: true },
      });
      if (!cls) {
        throw new NotFoundException(`Class ${topic.classId} not found`);
      }
      courseId = cls.courseId;
    }
    return { topic, courseId };
  }

  /**
   * Course-level đề / cây Kiến thức: assertCanManageCourse — dạy lớp ≠ soạn giáo án.
   * Class-owned practice: staff who can access that class (incl. gia sư).
   */
  private async assertCanLinkPracticeQuestions(
    topic: { classId: string | null; courseId: string | null },
    courseId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    if (topic.classId) {
      await this.validateStaffClassAccess(topic.classId, actor);
      return;
    }
    await this.assertCanManageCourseContent(actor, courseId);
  }

  async getQuestionsByTopicId(
    topicId: string,
    actor: ActionHistoryActor,
  ): Promise<QuestionLinkResponseDto[]> {
    const { topic, courseId } = await this.validatePracticeTopic(topicId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    const links = await this.prisma.questionLink.findMany({
      where: { topicId },
      orderBy: { order: 'asc' },
      include: {
        question: {
          select: {
            id: true,
            courseId: true,
            chapterId: true,
            difficultyLevelId: true,
            type: true,
            content: true,
            options: true,
            correctIndex: true,
            explanation: true,
            answerGuide: true,
          },
        },
      },
    });

    return links.map((link) => ({
      id: link.id,
      topicId: link.topicId,
      questionId: link.questionId,
      order: link.order,
      points: link.points,
      question: link.question,
    }));
  }

  async addQuestionToTopic(
    topicId: string,
    dto: QuestionLinkCreateDto,
    actor: ActionHistoryActor,
  ): Promise<QuestionLinkResponseDto> {
    const { topic, courseId } = await this.validatePracticeTopic(topicId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    // Validate question exists and belongs to same course
    const question = await this.prisma.question.findUnique({
      where: { id: dto.questionId },
    });
    if (!question || question.deletedAt) {
      throw new NotFoundException(`Question ${dto.questionId} not found`);
    }
    if (question.courseId !== courseId) {
      throw new BadRequestException(
        'Câu hỏi phải thuộc cùng khoá học với chuyên đề',
      );
    }

    // Check duplicate
    const existing = await this.prisma.questionLink.findUnique({
      where: { topicId_questionId: { topicId, questionId: dto.questionId } },
    });
    if (existing) {
      throw new BadRequestException('Câu hỏi đã được thêm vào chuyên đề này');
    }

    // Determine order: append at end
    const maxOrder = await this.prisma.questionLink.aggregate({
      where: { topicId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const link = await this.prisma.questionLink.create({
      data: {
        topicId,
        questionId: dto.questionId,
        order: dto.order ?? nextOrder,
        points: dto.points ?? null,
      },
      include: {
        question: {
          select: {
            id: true,
            courseId: true,
            chapterId: true,
            difficultyLevelId: true,
            type: true,
            content: true,
            options: true,
            correctIndex: true,
            explanation: true,
            answerGuide: true,
          },
        },
      },
    });

    this.logger.log(
      `Question linked to topic: question ${dto.questionId} → topic ${topicId} by ${actor.userEmail}`,
    );

    return {
      id: link.id,
      topicId: link.topicId,
      questionId: link.questionId,
      order: link.order,
      points: link.points,
      question: link.question,
    };
  }

  async updateQuestionLink(
    topicId: string,
    linkId: string,
    dto: QuestionLinkUpdateDto,
    actor: ActionHistoryActor,
  ): Promise<QuestionLinkResponseDto> {
    const { topic, courseId } = await this.validatePracticeTopic(topicId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    const link = await this.prisma.questionLink.findUnique({
      where: { id: linkId },
    });
    if (!link || link.topicId !== topicId) {
      throw new NotFoundException('Question link not found');
    }

    const updated = await this.prisma.questionLink.update({
      where: { id: linkId },
      data: {
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.points !== undefined && { points: dto.points }),
      },
      include: {
        question: {
          select: {
            id: true,
            courseId: true,
            chapterId: true,
            difficultyLevelId: true,
            type: true,
            content: true,
            options: true,
            correctIndex: true,
            explanation: true,
            answerGuide: true,
          },
        },
      },
    });

    this.logger.log(`Question link updated: ${linkId} by ${actor.userEmail}`);

    return {
      id: updated.id,
      topicId: updated.topicId,
      questionId: updated.questionId,
      order: updated.order,
      points: updated.points,
      question: updated.question,
    };
  }

  async removeQuestionFromTopic(
    topicId: string,
    linkId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    const { topic, courseId } = await this.validatePracticeTopic(topicId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    const link = await this.prisma.questionLink.findUnique({
      where: { id: linkId },
    });
    if (!link || link.topicId !== topicId) {
      throw new NotFoundException('Question link not found');
    }

    await this.prisma.questionLink.delete({ where: { id: linkId } });
    this.logger.log(
      `Question unlinked from topic: link ${linkId} from topic ${topicId} by ${actor.userEmail}`,
    );
  }

  async reorderQuestionLinks(
    topicId: string,
    linkIds: string[],
    actor: ActionHistoryActor,
  ): Promise<void> {
    const { topic, courseId } = await this.validatePracticeTopic(topicId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    // Verify all links belong to this topic
    const owned = await this.prisma.questionLink.findMany({
      where: { id: { in: linkIds }, topicId },
      select: { id: true },
    });
    if (owned.length !== linkIds.length) {
      throw new BadRequestException(
        'Some IDs do not belong to this topic or do not exist',
      );
    }

    await this.prisma.$transaction(
      linkIds.map((id, index) =>
        this.prisma.questionLink.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    this.logger.log(
      `Question links reordered for topic ${topicId} by ${actor.userEmail}`,
    );
  }

  async getQuestionLinkSummary(
    topicId: string,
  ): Promise<QuestionLinkSummaryDto> {
    await this.validatePracticeTopic(topicId);

    const result = await this.prisma.questionLink.aggregate({
      where: { topicId },
      _count: { id: true },
      _sum: { points: true },
    });

    return {
      totalQuestions: result._count.id,
      totalPoints: result._sum.points ?? 0,
    };
  }

  async isTopicAssignedToClass(topicId: string): Promise<boolean> {
    const count = await this.prisma.classContentItem.count({
      where: { topicId },
    });
    return count > 0;
  }

  // ─── Validation helpers ───

  private async validateTopicOwnership(dto: TopicCreateDto): Promise<void> {
    const hasCourse = Boolean(dto.courseId);
    const hasClass = Boolean(dto.classId);

    if (hasCourse && hasClass) {
      throw new BadRequestException(
        'Chuyên đề chỉ thuộc Khoá học HOẶC Lớp học, không được cả hai',
      );
    }

    if (!hasCourse && !hasClass) {
      throw new BadRequestException(
        'Chuyên đề phải thuộc một Khoá học hoặc một Lớp học',
      );
    }

    if (hasCourse && !dto.chapterId && dto.kind !== TopicKind.practice) {
      throw new BadRequestException(
        'Chuyên đề thuộc Khoá học phải có Chủ đề (chapter)',
      );
    }

    // practice topics at course level (exam library) can have chapterId null
    if (hasCourse && dto.chapterId) {
      const chapter = await this.prisma.chapter.findUnique({
        where: { id: dto.chapterId },
      });
      if (!chapter || chapter.courseId !== dto.courseId) {
        throw new BadRequestException(
          `Chapter ${dto.chapterId} không thuộc Course ${dto.courseId}`,
        );
      }
    }
  }

  private async validateTopicExists(topicId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!topic) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }
    return topic;
  }

  private async validateCourseExists(courseId: string): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }
  }

  /**
   * Soạn nội dung cấp khoá (cây Kiến thức, thư viện đề, đáp án).
   * Không dùng assertCanWriteCourseQuestions — quyền đó chỉ cho ngân hàng câu hỏi.
   */
  private async assertCanManageCourseContent(
    actor: ActionHistoryActor,
    courseId: string,
  ): Promise<void> {
    const courseActor = await this.courseAccess.resolveActor(
      actor.userId,
      actor.roleType,
    );
    await this.courseAccess.assertCanManageCourse(courseActor, courseId);
  }

  /** Course-owned academic content vs class-owned (gia sư lớp). */
  private async assertCanManageOwnedAcademicContent(
    actor: ActionHistoryActor,
    owner: { courseId: string | null; classId: string | null },
  ): Promise<void> {
    if (owner.classId) {
      await this.validateStaffClassAccess(owner.classId, actor);
      return;
    }
    if (owner.courseId) {
      await this.assertCanManageCourseContent(actor, owner.courseId);
    }
  }

  private async validateChapterExists(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
    });
    if (!chapter) {
      throw new NotFoundException(`Chapter ${chapterId} not found`);
    }
    return chapter;
  }

  private async validateClassExists(classId: string): Promise<void> {
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      throw new NotFoundException(`Class ${classId} not found`);
    }
  }

  private async validateStaffClassAccess(
    classId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    if (actor.roleType === UserRole.admin) return;

    const staffInfo = await this.prisma.staffInfo.findFirst({
      where: { userId: actor.userId },
    });
    if (!staffInfo) {
      throw new ForbiddenException('Staff profile not found');
    }

    const isTeacher = await this.prisma.classTeacher.findFirst({
      where: { classId, teacherId: staffInfo.id, status: 'active' },
    });

    const isAssistant = staffInfo.roles.includes(StaffRole.assistant);

    if (!isTeacher && !isAssistant) {
      throw new ForbiddenException('You do not have access to this class');
    }
  }

  private async validateStudentClassAccess(
    classId: string,
    studentId: string,
  ): Promise<void> {
    const enrollment = await this.prisma.studentClass.findFirst({
      where: { classId, studentId, status: 'active' },
      include: { class: { select: { contentAccessExpiresAt: true } } },
    });
    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this class');
    }
    if (
      enrollment.class.contentAccessExpiresAt &&
      enrollment.class.contentAccessExpiresAt < new Date()
    ) {
      throw new ForbiddenException('This class has expired');
    }
  }

  private assertClassContentVisibleToStudent(hiddenAt: Date | null): void {
    if (hiddenAt) {
      throw new NotFoundException('Topic not found');
    }
  }

  private async resolveHiddenByStaffId(
    actor: ActionHistoryActor,
  ): Promise<string | null> {
    const staff = await this.prisma.staffInfo.findFirst({
      where: { userId: actor.userId },
      select: { id: true },
    });
    return staff?.id ?? null;
  }

  /**
   * Block course-level Chapter/Topic/Lecture deletes while any class still
   * references the topic via ClassContentItem (including hidden items).
   */
  private async assertTopicsNotUsedByClasses(
    topicIds: string[],
    entityLabel: 'Chủ đề' | 'Chuyên đề' | 'Bài học',
  ): Promise<void> {
    if (topicIds.length === 0) return;
    const used = await this.prisma.classContentItem.groupBy({
      by: ['classId'],
      where: { topicId: { in: topicIds } },
    });
    if (used.length > 0) {
      throw new ConflictException(
        `${entityLabel} đang được ${used.length} lớp sử dụng`,
      );
    }
  }

  // ---------- Class Content ----------
  //
  // Finding #8 — dual source of truth note:
  // `Topic.classId` (scalar FK on the topics table) and `class_content_items.class_id`
  // serve different purposes. Topic.classId marks a topic as "owned by" a class (created
  // inline for that class). class_content_items is the ordered list of topics shown in
  // the class content tab — it can reference both class-owned topics AND course topics.
  // When creating a new topic for a class, we write BOTH: Topic.classId = classId (so
  // the topic is recognizably class-scoped) AND a class_content_items row (so it appears
  // in the ordered content list). When adding an existing course topic, only a
  // class_content_items row is created — the topic's courseId/chapterId stay untouched.

  /**
   * Map a raw Prisma ClassContentItem (with included topic/chapter/lectures) to the
   * frontend DTO shape expected by ClassContentManager.
   */
  private mapClassContentItem(item: {
    id: string;
    topicId: string | null;
    kind: string;
    sortOrder: number;
    classId: string;
    openAt?: Date | null;
    durationMinutes?: number | null;
    hiddenAt?: Date | null;
    hiddenByStaffId?: string | null;
    topic?: {
      title: string;
      kind: string;
      classId: string | null;
      chapter?: { title: string } | null;
      lectures?: unknown[];
    } | null;
  }): ClassContentItemResponseDto {
    const topic = item.topic;
    const topicKind: 'theory' | 'practice' =
      topic?.kind === 'practice' ? 'practice' : 'theory';
    const kindLabel = topicKind === 'practice' ? 'Luyện tập' : 'Lý thuyết';
    const source: 'course' | 'class' =
      item.kind === 'topic' && topic?.classId === item.classId
        ? 'class'
        : 'course';
    const lectureCount = Array.isArray(topic?.lectures)
      ? topic.lectures.length
      : undefined;
    const openAt = item.openAt ?? null;
    const durationMinutes = item.durationMinutes ?? null;
    return {
      id: item.id,
      topicId: item.topicId ?? '',
      kind: item.kind as 'topic',
      topicKind,
      sortOrder: item.sortOrder,
      title: topic?.title ?? '(Chuyên đề đã xoá)',
      kindLabel,
      source,
      chapterTitle: topic?.chapter?.title,
      lectureCount,
      openAt,
      durationMinutes,
      isOpen: this.isPracticeAssignmentOpen(topicKind, openAt),
      hiddenAt: item.hiddenAt ?? null,
      hiddenByStaffId: item.hiddenByStaffId ?? null,
    };
  }

  private isPracticeAssignmentOpen(
    topicKind: string,
    openAt: Date | string | null,
  ): boolean {
    if (topicKind !== 'practice') return true;
    if (!openAt) return false;
    return new Date(openAt).getTime() <= Date.now();
  }

  private assertPracticeAssignmentOpen(
    topicKind: string,
    openAt: Date | string | null,
  ): void {
    if (!this.isPracticeAssignmentOpen(topicKind, openAt)) {
      throw new ForbiddenException('Chưa tới thời điểm mở bài');
    }
  }

  private parsePracticeSchedule(
    topicKind: string,
    dto: { openAt?: string; durationMinutes?: number },
    required: boolean,
  ):
    | { openAt: Date; durationMinutes: number }
    | { openAt: null; durationMinutes: null } {
    if (topicKind !== 'practice') {
      return { openAt: null, durationMinutes: null };
    }

    const durationMinutes = dto.durationMinutes;
    if (
      durationMinutes == null ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < PRACTICE_DURATION_MIN_MINUTES ||
      durationMinutes > PRACTICE_DURATION_MAX_MINUTES
    ) {
      throw new BadRequestException(
        durationMinutes == null
          ? 'Practice assignments require durationMinutes'
          : `durationMinutes must be an integer from ${PRACTICE_DURATION_MIN_MINUTES} to ${PRACTICE_DURATION_MAX_MINUTES}`,
      );
    }

    const rawOpenAt = dto.openAt?.trim() ? dto.openAt.trim() : undefined;
    let openAt: Date;
    if (rawOpenAt == null) {
      if (required) {
        throw new BadRequestException(
          'Practice assignments require openAt and durationMinutes',
        );
      }
      openAt = new Date();
    } else {
      openAt = new Date(rawOpenAt);
      if (Number.isNaN(openAt.getTime())) {
        throw new BadRequestException('openAt is not a valid date');
      }
    }

    const closeAtMs = openAt.getTime() + durationMinutes * 60_000;
    if (openAt.getTime() >= closeAtMs) {
      throw new BadRequestException(
        'openAt must not be later than assignment close time',
      );
    }

    return { openAt, durationMinutes };
  }

  async createClassContentItem(
    classId: string,
    dto: ClassContentCreateDto,
    actor: ActionHistoryActor,
  ): Promise<ClassContentItemResponseDto> {
    await this.validateStaffClassAccess(classId, actor);

    let topicId: string;
    let topicKind: string;

    if (dto.topicId) {
      // Mode A: add an existing topic (from a course) into this class's content list
      const topic = await this.prisma.topic.findUnique({
        where: { id: dto.topicId },
      });
      if (!topic) {
        throw new NotFoundException(`Topic ${dto.topicId} not found`);
      }
      // Prevent duplicates
      const existing = await this.prisma.classContentItem.findUnique({
        where: { classId_topicId: { classId, topicId: dto.topicId } },
      });
      if (existing) {
        if (existing.hiddenAt) {
          throw new BadRequestException(
            'Chuyên đề đang bị ẩn trong lớp này. Hãy khôi phục thay vì thêm lại.',
          );
        }
        throw new BadRequestException(
          'Topic is already in this class content list',
        );
      }
      topicId = dto.topicId;
      topicKind = topic.kind;
    } else {
      // Mode B: create a new topic scoped to this class
      if (!dto.title?.trim()) {
        throw new BadRequestException(
          'Title is required when creating a new topic',
        );
      }
      const created = await this.createTopic(
        {
          kind:
            dto.kind === TopicKind.practice
              ? TopicKind.practice
              : TopicKind.theory,
          classId,
          title: dto.title.trim(),
        },
        actor,
      );
      topicId = created.id;
      topicKind = created.kind;
    }

    const schedule = this.parsePracticeSchedule(topicKind, dto, false);

    // Determine sortOrder: append at the end
    const maxSort = await this.prisma.classContentItem.aggregate({
      where: { classId },
      _max: { sortOrder: true },
    });
    const nextSort = (maxSort._max.sortOrder ?? -1) + 1;

    const item = await this.prisma.classContentItem.create({
      data: {
        classId,
        topicId,
        kind: 'topic',
        sortOrder: nextSort,
        openAt: schedule.openAt,
        durationMinutes: schedule.durationMinutes,
      },
      include: {
        topic: { include: { chapter: true, lectures: true } },
      },
    });

    await appendClassTimelineItem(this.prisma, {
      classId,
      kind: ClassTimelineItemKind.content_item,
      classContentItemId: item.id,
    });

    this.logger.log(
      `Class content item created: ${item.id} for class ${classId} by ${actor.userEmail}`,
    );

    return this.mapClassContentItem(item);
  }

  async listClassContentItems(
    classId: string,
    actor: ActionHistoryActor,
  ): Promise<ClassContentItemResponseDto[]> {
    await this.validateStaffClassAccess(classId, actor);
    const items = await this.prisma.classContentItem.findMany({
      where: { classId },
      orderBy: { sortOrder: 'asc' },
      include: {
        topic: { include: { chapter: true, lectures: true } },
      },
    });
    return items.map((item) => this.mapClassContentItem(item));
  }

  async reorderClassContentItems(
    classId: string,
    orderedIds: string[],
    actor: ActionHistoryActor,
  ): Promise<ClassContentItemResponseDto[]> {
    await this.validateStaffClassAccess(classId, actor);

    // Finding #4: verify ALL IDs belong to this class before updating
    const owned = await this.prisma.classContentItem.findMany({
      where: { id: { in: orderedIds }, classId },
      select: { id: true },
    });
    if (owned.length !== orderedIds.length) {
      throw new BadRequestException(
        'Some IDs do not belong to this class or do not exist',
      );
    }

    await this.prisma.$transaction(
      orderedIds.map((id, idx) =>
        this.prisma.classContentItem.update({
          where: { id },
          data: { sortOrder: idx },
        }),
      ),
    );
    return this.listClassContentItems(classId, actor);
  }

  async deleteClassContentItem(
    classId: string,
    itemId: string,
    actor: ActionHistoryActor,
  ): Promise<ClassContentItemResponseDto[]> {
    await this.validateStaffClassAccess(classId, actor);
    const item = await this.prisma.classContentItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.classId !== classId) {
      throw new NotFoundException('Class content item not found');
    }
    const hiddenAt = item.hiddenAt ?? new Date();
    const hiddenByStaffId = await this.resolveHiddenByStaffId(actor);
    await this.prisma.$transaction([
      this.prisma.classContentItem.update({
        where: { id: itemId },
        data: { hiddenAt, hiddenByStaffId },
      }),
      this.prisma.classTimelineItem.updateMany({
        where: { classContentItemId: itemId },
        data: { hiddenAt, hiddenByStaffId },
      }),
    ]);
    this.logger.log(
      `Class content item hidden: ${itemId} for class ${classId} by ${actor.userEmail}`,
    );
    return this.listClassContentItems(classId, actor);
  }

  async restoreClassContentItem(
    classId: string,
    itemId: string,
    actor: ActionHistoryActor,
  ): Promise<ClassContentItemResponseDto[]> {
    await this.validateStaffClassAccess(classId, actor);
    const item = await this.prisma.classContentItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.classId !== classId) {
      throw new NotFoundException('Class content item not found');
    }
    await this.prisma.$transaction([
      this.prisma.classContentItem.update({
        where: { id: itemId },
        data: { hiddenAt: null, hiddenByStaffId: null },
      }),
      this.prisma.classTimelineItem.updateMany({
        where: { classContentItemId: itemId },
        data: { hiddenAt: null, hiddenByStaffId: null },
      }),
    ]);
    this.logger.log(
      `Class content item restored: ${itemId} for class ${classId} by ${actor.userEmail}`,
    );
    return this.listClassContentItems(classId, actor);
  }

  async updateClassContentSchedule(
    classId: string,
    itemId: string,
    dto: ClassContentScheduleUpdateDto,
    actor: ActionHistoryActor,
  ): Promise<ClassContentItemResponseDto> {
    await this.validateStaffClassAccess(classId, actor);
    const item = await this.prisma.classContentItem.findUnique({
      where: { id: itemId },
      include: { topic: { include: { chapter: true, lectures: true } } },
    });
    if (!item || item.classId !== classId) {
      throw new NotFoundException('Class content item not found');
    }
    const topicKind = item.topic?.kind ?? 'theory';
    if (topicKind !== 'practice') {
      throw new BadRequestException(
        'Only practice assignments have openAt and durationMinutes',
      );
    }
    const schedule = this.parsePracticeSchedule(topicKind, dto, true);
    const updated = await this.prisma.classContentItem.update({
      where: { id: itemId },
      data: {
        openAt: schedule.openAt,
        durationMinutes: schedule.durationMinutes,
      },
      include: {
        topic: { include: { chapter: true, lectures: true } },
      },
    });
    await syncClassTimelineSortByTime(this.prisma, classId);
    this.logger.log(
      `Assignment schedule updated: ${itemId} for class ${classId} by ${actor.userEmail}`,
    );
    return this.mapClassContentItem(updated);
  }

  async listClassContentForStudent(
    classId: string,
    studentId: string,
  ): Promise<ClassContentItemResponseDto[]> {
    const classInfo = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!classInfo) {
      throw new NotFoundException('Class not found');
    }
    const enrollment = await this.prisma.studentClass.findFirst({
      where: { classId, studentId },
    });
    if (!enrollment) {
      throw new ForbiddenException('Student not a member of the class');
    }
    if (
      classInfo.contentAccessExpiresAt &&
      classInfo.contentAccessExpiresAt < new Date()
    ) {
      throw new ForbiddenException('Content access period has expired');
    }
    const items = await this.prisma.classContentItem.findMany({
      where: { classId, hiddenAt: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        topic: { include: { chapter: true, lectures: true } },
      },
    });
    return items.map((item) => this.mapClassContentItem(item));
  }

  async listCourseTopicsForClass(
    classId: string,
    actor: ActionHistoryActor,
  ): Promise<CourseTopicForClassDto[]> {
    await this.validateStaffClassAccess(classId, actor);

    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { courseId: true },
    });
    if (!cls) throw new NotFoundException(`Class ${classId} not found`);

    const [courseTopics, existingItemTopicIds] = await Promise.all([
      this.prisma.topic.findMany({
        where: { courseId: cls.courseId, classId: null },
        include: {
          chapter: { select: { id: true, title: true } },
          lectures: { select: { id: true } },
        },
        orderBy: [{ chapter: { sortOrder: 'asc' } }, { order: 'asc' }],
      }),
      this.prisma.classContentItem.findMany({
        where: { classId },
        select: { topicId: true },
      }),
    ]);

    const addedSet = new Set(existingItemTopicIds.map((i) => i.topicId));

    return courseTopics.map((t) => ({
      id: t.id,
      title: t.title,
      kind: t.kind,
      chapterTitle: t.chapter?.title ?? 'Thư viện đề thi',
      chapterId: t.chapter?.id ?? '',
      lectureCount: t.lectures.length,
      alreadyAdded: addedSet.has(t.id),
    }));
  }
}
