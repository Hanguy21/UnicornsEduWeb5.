import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  TopicCreateDto,
  TopicUpdateDto,
  TopicResponseDto,
} from 'src/dtos/topic.dto';
import {
  ActionHistoryActor,
  TopicSupportService,
} from './topic-support.service';

@Injectable()
export class CourseTopicService extends TopicSupportService {
  protected readonly logger = new Logger(CourseTopicService.name);

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
}
