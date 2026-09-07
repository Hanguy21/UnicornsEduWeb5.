import {
  BadRequestException,
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
} from 'src/dtos/topic.dto';

import { TopicKind } from 'generated/enums';

import {
  ActionHistoryActor,
  TopicSupportService,
} from './topic-support.service';

import { CourseTopicService } from './course-topic.service';

@Injectable()
export class ExamLibraryService extends TopicSupportService {
  protected readonly logger = new Logger(ExamLibraryService.name);

  constructor(
    prisma: PrismaService,
    actionHistory: ActionHistoryService,
    courseAccess: CourseAccessService,
    private readonly topics: CourseTopicService,
  ) {
    super(prisma, actionHistory, courseAccess);
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
    return this.topics.createTopic(
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
    return this.topics.updateTopic(topicId, dto, actor);
  }

  async deleteExamTopic(
    topicId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    await this.assertIsExamTopic(topicId, 'xóa');
    return this.topics.deleteTopic(topicId, actor);
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
}
