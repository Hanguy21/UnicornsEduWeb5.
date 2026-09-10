import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ChapterCreateDto,
  ChapterUpdateDto,
  ChapterResponseDto,
} from 'src/dtos/topic.dto';
import {
  ActionHistoryActor,
  TopicSupportService,
} from './topic-support.service';

@Injectable()
export class CourseChapterService extends TopicSupportService {
  protected readonly logger = new Logger(CourseChapterService.name);

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

    const chapters = await this.prisma.chapter.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { topics: true } } },
    });
    return chapters.map(({ _count, ...chapter }) => ({
      ...chapter,
      topicCount: _count.topics,
    }));
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
}
