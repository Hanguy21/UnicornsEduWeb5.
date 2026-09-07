import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassTimelineItemKind } from '../../generated/enums';
import { Prisma } from '../../generated/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { StaffOperationsAccessService } from 'src/staff-ops/staff-operations-access.service';
import type { ActionHistoryActor } from 'src/topic/topic.service';
import type {
  ClassTimelineItemDto,
  ClassTimelinePageDto,
} from 'src/dtos/class-timeline.dto';

const TIMELINE_INCLUDE = {
  session: {
    include: {
      teacher: {
        include: { user: { select: { first_name: true, last_name: true } } },
      },
      attendance: true,
    },
  },
  classSurvey: {
    include: {
      survey: true,
    },
  },
  classContentItem: {
    include: {
      topic: true,
    },
  },
};

function findTimelineItems(
  prisma: PrismaService,
  args: Omit<Prisma.ClassTimelineItemFindManyArgs, 'include'>,
) {
  return prisma.classTimelineItem.findMany({
    ...args,
    include: TIMELINE_INCLUDE,
  });
}

type TimelineRow = Awaited<ReturnType<typeof findTimelineItems>>[number];

@Injectable()
export class ClassTimelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffAccess: StaffOperationsAccessService,
  ) {}

  async listForStaff(
    classId: string,
    actor: ActionHistoryActor,
  ): Promise<ClassTimelineItemDto[]> {
    await this.validateStaffClassAccess(classId, actor);
    const rows = await findTimelineItems(this.prisma, {
      where: { classId },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((row) => this.mapItem(row, null));
  }

  async listForStudent(
    classId: string,
    studentId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<ClassTimelinePageDto> {
    await this.validateStudentClassAccess(classId, studentId);
    const take = Math.min(Math.max(limit, 1), 50);
    let sortCursor = -1;
    if (cursor) {
      const last = await this.prisma.classTimelineItem.findFirst({
        where: { id: cursor, classId },
        select: { sortOrder: true },
      });
      if (!last) {
        throw new BadRequestException('Invalid timeline cursor');
      }
      sortCursor = last.sortOrder;
    }
    const rows = await findTimelineItems(this.prisma, {
      where: {
        classId,
        ...(cursor ? { sortOrder: { gt: sortCursor } } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      take: take + 1,
    });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return {
      items: page.map((row) => this.mapItem(row, studentId)),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    };
  }

  async reorder(
    classId: string,
    orderedIds: string[],
    actor: ActionHistoryActor,
  ): Promise<ClassTimelineItemDto[]> {
    const mode = await this.validateStaffClassAccess(classId, actor);
    if (mode === 'customer_care' || mode === 'training_manager') {
      throw new ForbiddenException('Bạn không được sắp xếp timeline lớp.');
    }
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new BadRequestException('orderedIds is required');
    }

    const owned = await this.prisma.classTimelineItem.findMany({
      where: { classId },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((row) => row.id));
    if (ownedIds.size !== orderedIds.length) {
      throw new BadRequestException(
        'Reorder must include every timeline item exactly once',
      );
    }
    for (const id of orderedIds) {
      if (!ownedIds.has(id)) {
        throw new BadRequestException(
          'Some IDs do not belong to this class timeline',
        );
      }
    }

    await this.prisma.$transaction(
      [
        this.prisma.class.update({
          where: { id: classId },
          data: { timelineCustomOrder: true },
        }),
        ...orderedIds.map((id, idx) =>
          this.prisma.classTimelineItem.update({
            where: { id },
            data: { sortOrder: idx },
          }),
        ),
      ],
    );
    return this.listForStaff(classId, actor);
  }

  async findStudentIdByUserId(userId: string): Promise<string | null> {
    const student = await this.prisma.studentInfo.findUnique({
      where: { userId },
      select: { id: true },
    });
    return student?.id ?? null;
  }

  private mapItem(
    row: TimelineRow,
    studentId: string | null,
  ): ClassTimelineItemDto {
    if (row.kind === ClassTimelineItemKind.session && row.session) {
      const teacherName = row.session.teacher?.user
        ? [row.session.teacher.user.first_name, row.session.teacher.user.last_name]
            .filter(Boolean)
            .join(' ')
        : null;
      const mine = studentId
        ? row.session.attendance.find((a) => a.studentId === studentId)
        : undefined;
      const dateLabel = row.session.date.toISOString().slice(0, 10);
      return {
        id: row.id,
        kind: row.kind,
        sortOrder: row.sortOrder,
        title: `Buổi học ${dateLabel}`,
        kindLabel: 'Buổi học',
        occurredAt: row.session.date.toISOString(),
        sessionId: row.session.id,
        classSurveyId: null,
        classContentItemId: null,
        topicId: null,
        topicKind: null,
        isOpen: null,
        openAt: null,
        durationMinutes: null,
        session: {
          id: row.session.id,
          date: row.session.date.toISOString(),
          startTime: formatTime(row.session.startTime),
          endTime: formatTime(row.session.endTime),
          lessonContent: row.session.lessonContent,
          homework: row.session.homework,
          tutorial: row.session.tutorial,
          recordingUrl: row.session.recordingUrl,
          teacherName,
          myAttendanceStatus: mine?.status ?? null,
          myAttendanceNotes: mine?.notes ?? null,
        },
        survey: null,
      };
    }

    if (row.kind === ClassTimelineItemKind.class_survey && row.classSurvey) {
      const name = row.classSurvey.survey?.name?.trim() || 'Báo cáo khảo sát';
      return {
        id: row.id,
        kind: row.kind,
        sortOrder: row.sortOrder,
        title: name,
        kindLabel: 'Khảo sát',
        occurredAt: row.classSurvey.reportDate.toISOString(),
        sessionId: null,
        classSurveyId: row.classSurvey.id,
        classContentItemId: null,
        topicId: null,
        topicKind: null,
        isOpen: null,
        openAt: null,
        durationMinutes: null,
        session: null,
        survey: {
          id: row.classSurvey.id,
          reportDate: row.classSurvey.reportDate.toISOString(),
          surveyName: row.classSurvey.survey?.name ?? null,
          startDate: row.classSurvey.survey?.startDate?.toISOString() ?? null,
          endDate: row.classSurvey.survey?.endDate?.toISOString() ?? null,
          notificationContent:
            row.classSurvey.survey?.notificationContent ?? null,
          notificationInstructions:
            row.classSurvey.survey?.notificationInstructions ?? null,
          notificationNotes: row.classSurvey.survey?.notificationNotes ?? null,
          notificationTeacherNote:
            row.classSurvey.survey?.notificationTeacherNote ?? null,
        },
      };
    }

    const content = row.classContentItem;
    const topic = content?.topic;
    const topicKind =
      topic?.kind === 'practice' ? 'practice' : topic ? 'theory' : null;
    const isOpen =
      topicKind === 'practice'
        ? !content?.openAt || content.openAt.getTime() <= Date.now()
        : true;
    return {
      id: row.id,
      kind: ClassTimelineItemKind.content_item,
      sortOrder: row.sortOrder,
      title: topic?.title ?? 'Chuyên đề',
      kindLabel: topicKind === 'practice' ? 'Luyện tập' : 'Lý thuyết',
      occurredAt: content?.openAt?.toISOString() ?? null,
      sessionId: null,
      classSurveyId: null,
      classContentItemId: content?.id ?? null,
      topicId: topic?.id ?? null,
      topicKind,
      isOpen,
      openAt: content?.openAt?.toISOString() ?? null,
      durationMinutes: content?.durationMinutes ?? null,
      session: null,
      survey: null,
    };
  }

  private async validateStaffClassAccess(
    classId: string,
    actor: ActionHistoryActor,
  ) {
    const viewer = await this.staffAccess.resolveClassViewerActor(
      actor.userId,
      actor.roleType,
    );
    return this.staffAccess.resolveClassViewAccessMode(viewer, classId);
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

function formatTime(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(11, 19);
}
