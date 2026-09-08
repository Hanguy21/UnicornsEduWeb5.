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
  ExamLibraryItemDto,
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

  // ─── Exam Library (practice topics của khoá, nằm trong chương) ───
  //
  // Đề thi là `Topic(kind = practice)` thuộc một chương của khoá — CHECK
  // constraint `topics_owner_check` không cho topic cấp khoá đứng ngoài chương.
  // Thư viện gom đề của mọi chương lại một chỗ để quản lý tập trung.

  async getExamLibrary(
    courseId: string,
    params: {
      search?: string;
      chapterId?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: ExamLibraryItemDto[];
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
      ...(params.chapterId ? { chapterId: params.chapterId } : {}),
      ...(params.search
        ? { title: { contains: params.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.topic.findMany({
        where,
        include: {
          chapter: { select: { id: true, title: true, sortOrder: true } },
          _count: { select: { questionLinks: true } },
        },
        orderBy: [
          { chapter: { sortOrder: 'asc' } },
          { order: 'asc' },
          { title: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.topic.count({ where }),
    ]);

    const data: ExamLibraryItemDto[] = rows.map(
      ({ _count, chapter, ...topic }) => ({
        ...topic,
        chapter,
        questionCount: _count.questionLinks,
      }),
    );

    return { data, total, page, limit };
  }

  async createExamTopic(
    courseId: string,
    dto: TopicCreateDto,
    actor: ActionHistoryActor,
  ): Promise<TopicResponseDto> {
    // Kiểm quyền trước khi soi payload: người không thuộc đội giáo án phải nhận
    // 403, không phải 400 tiết lộ hình dạng dữ liệu hợp lệ.
    await this.validateCourseExists(courseId);
    await this.assertCanManageCourseContent(actor, courseId);

    if (!dto.chapterId) {
      throw new BadRequestException(
        'Đề thi phải thuộc một chương của khoá học.',
      );
    }
    const chapter = await this.validateChapterExists(dto.chapterId);
    if (chapter.courseId !== courseId) {
      throw new BadRequestException('Chương không thuộc khoá học này.');
    }

    return this.topics.createTopic(
      {
        kind: TopicKind.practice,
        courseId,
        chapterId: dto.chapterId,
        classId: null,
        title: dto.title,
      },
      actor,
    );
  }

  async updateExamTopic(
    courseId: string,
    topicId: string,
    dto: TopicUpdateDto,
    actor: ActionHistoryActor,
  ): Promise<TopicResponseDto> {
    await this.assertIsExamTopic(courseId, topicId, 'chỉnh sửa');
    return this.topics.updateTopic(topicId, dto, actor);
  }

  async deleteExamTopic(
    courseId: string,
    topicId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    await this.assertIsExamTopic(courseId, topicId, 'xóa');
    return this.topics.deleteTopic(topicId, actor);
  }

  private async assertIsExamTopic(
    courseId: string,
    topicId: string,
    action: string,
  ): Promise<void> {
    const existing = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!existing) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }
    if (
      existing.kind !== TopicKind.practice ||
      existing.courseId !== courseId
    ) {
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
        where: { id, courseId, kind: TopicKind.practice },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);
  }
}
