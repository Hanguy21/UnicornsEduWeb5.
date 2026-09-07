import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  TopicResponseDto,
  ClassContentCreateDto,
  ClassContentScheduleUpdateDto,
  ClassContentItemResponseDto,
  PRACTICE_DURATION_MIN_MINUTES,
  PRACTICE_DURATION_MAX_MINUTES,
  CourseTopicForClassDto,
} from 'src/dtos/topic.dto';
import { TopicKind, ClassTimelineItemKind } from 'generated/enums';
import {
  appendClassTimelineItem,
  syncClassTimelineSortByTime,
} from 'src/class-timeline/append-timeline-item';
import {
  ActionHistoryActor,
  TopicSupportService,
} from './topic-support.service';

const CLASS_CONTENT_CREATE_TRANSACTION_TIMEOUT_MS = 15_000;

@Injectable()
export class ClassContentService extends TopicSupportService {
  protected readonly logger = new Logger(ClassContentService.name);

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

    let topicKind: string;

    if (dto.topicId) {
      const topic = await this.prisma.topic.findUnique({
        where: { id: dto.topicId },
      });
      if (!topic) {
        throw new NotFoundException(`Topic ${dto.topicId} not found`);
      }
      topicKind = topic.kind;
    } else {
      if (!dto.title?.trim()) {
        throw new BadRequestException(
          'Title is required when creating a new topic',
        );
      }
      const kind =
        dto.kind === TopicKind.practice ? TopicKind.practice : TopicKind.theory;
      await this.validateTopicOwnership({
        kind,
        classId,
        title: dto.title.trim(),
      });
      await this.validateClassExists(classId);
      topicKind = kind;
    }

    const schedule = this.parsePracticeSchedule(topicKind, dto, false);

    const item = await this.prisma.$transaction(
      async (tx) => {
        let topicId: string;

        if (dto.topicId) {
          const existing = await tx.classContentItem.findUnique({
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
        } else {
          const created = await tx.topic.create({
            data: {
              kind:
                dto.kind === TopicKind.practice
                  ? TopicKind.practice
                  : TopicKind.theory,
              classId,
              title: dto.title!.trim(),
              createdBy: actor.userId,
              updatedBy: actor.userId,
            },
          });
          topicId = created.id;
        }

        const maxSort = await tx.classContentItem.aggregate({
          where: { classId },
          _max: { sortOrder: true },
        });
        const nextSort = (maxSort._max.sortOrder ?? -1) + 1;

        const createdItem = await tx.classContentItem.create({
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

        await appendClassTimelineItem(tx, {
          classId,
          kind: ClassTimelineItemKind.content_item,
          classContentItemId: createdItem.id,
        });

        return createdItem;
      },
      { timeout: CLASS_CONTENT_CREATE_TRANSACTION_TIMEOUT_MS },
    );

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
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.classContentItem.update({
        where: { id: itemId },
        data: {
          openAt: schedule.openAt,
          durationMinutes: schedule.durationMinutes,
        },
        include: {
          topic: { include: { chapter: true, lectures: true } },
        },
      });
      await syncClassTimelineSortByTime(tx, classId);
      return next;
    });
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
