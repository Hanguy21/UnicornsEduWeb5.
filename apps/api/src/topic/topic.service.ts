import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActionHistoryService } from 'src/action-history/action-history.service';
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
} from 'src/dtos/topic.dto';
import { UserRole, TopicKind } from 'generated/enums';

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
  ) {}

  // ─── Chapter CRUD ───

  async createChapter(
    dto: ChapterCreateDto,
    actor: ActionHistoryActor,
  ): Promise<ChapterResponseDto> {
    await this.validateCourseExists(dto.courseId);

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

  async reorderChapters(courseId: string, chapterIds: string[]): Promise<void> {
    await this.validateCourseExists(courseId);

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
    this.validateTopicOwnership(dto);

    if (dto.courseId) {
      await this.validateCourseExists(dto.courseId);
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
        videoUrl: dto.videoUrl ?? null,
        content: dto.content ?? null,
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
    }

    const topic = await this.prisma.topic.update({
      where: { id: topicId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl }),
        ...(dto.content !== undefined && { content: dto.content }),
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
    }

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
  ): Promise<TopicResponseDto> {
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

  async reorderTopics(topicIds: string[]): Promise<void> {
    const updates = topicIds.map((id, index) =>
      this.prisma.topic.update({
        where: { id },
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
    });
    if (!existing) {
      throw new NotFoundException(`Lecture ${lectureId} not found`);
    }

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
    });
    if (!existing) {
      throw new NotFoundException(`Lecture ${lectureId} not found`);
    }

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

  async reorderLectures(topicId: string, lectureIds: string[]): Promise<void> {
    await this.validateTopicExists(topicId);

    const updates = lectureIds.map((id, index) =>
      this.prisma.lecture.update({
        where: { id, topicId },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);
  }

  // ─── Validation helpers ───

  private validateTopicOwnership(dto: TopicCreateDto): void {
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

    if (hasCourse && !dto.chapterId) {
      throw new BadRequestException(
        'Chuyên đề thuộc Khoá học phải có Chủ đề (chapter)',
      );
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

  private async validateChapterExists(chapterId: string): Promise<void> {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
    });
    if (!chapter) {
      throw new NotFoundException(`Chapter ${chapterId} not found`);
    }
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

    const hasAssistantRole = await this.prisma.staffInfo.findFirst({
      where: { userId: actor.userId },
      select: { id: true },
    });

    if (!isTeacher && !hasAssistantRole) {
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
}
