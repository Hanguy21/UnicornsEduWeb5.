import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/client';
import {
  LessonTaskPriority,
  LessonTaskStatus,
  StaffRole,
  StaffStatus,
} from 'generated/enums';
import {
  ActionHistoryActor,
  ActionHistoryService,
} from '../action-history/action-history.service';
import {
  CreateLessonResourceDto,
  LessonOverviewQueryDto,
  CreateLessonTaskDto,
  LessonOverviewResponseDto,
  LessonTaskAssigneeDto,
  LessonTaskCreatorDto,
  LessonResourceResponseDto,
  LessonTaskResponseDto,
  LessonTaskStaffOptionDto,
  LessonTaskStaffOptionsQueryDto,
  UpdateLessonResourceDto,
  UpdateLessonTaskDto,
} from '../dtos/lesson.dto';
import { PrismaService } from '../prisma/prisma.service';

type LessonTaskRecord = {
  id: string;
  title: string | null;
  description: string | null;
  status: LessonTaskStatus;
  priority: LessonTaskPriority;
  dueDate: Date | null;
  createdBy: string | null;
  staffLessonTasks: Array<{
    staffId: string;
    staff: {
      id: string;
      fullName: string;
      roles: StaffRole[];
      status: StaffStatus;
    };
  }>;
};

type HydratedLessonTaskRecord = LessonTaskRecord & {
  createdByStaff: LessonTaskCreatorDto | null;
  assignees: LessonTaskAssigneeDto[];
};

const LESSON_TASK_ASSIGNABLE_ROLES = [
  StaffRole.lesson_plan,
  StaffRole.lesson_plan_head,
] as const;

function toTrimmedString(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toDateOnlyOrNull(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsedDate = new Date(trimmed);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestException('dueDate không hợp lệ.');
  }

  return parsedDate;
}

function normalizeTags(value: string[] | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function parseJsonStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

@Injectable()
export class LessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistoryService: ActionHistoryService,
  ) { }

  async getOverview(
    query: LessonOverviewQueryDto = {},
  ): Promise<LessonOverviewResponseDto> {
    const resourceLimit = this.resolveLimit(query.resourceLimit, 6);
    const taskLimit = this.resolveLimit(query.taskLimit, 6);
    const resourceRequestedPage = this.resolvePage(query.resourcePage);
    const taskRequestedPage = this.resolvePage(query.taskPage);

    const [resourceCount, taskCount, openTaskCount, completedTaskCount] =
      await this.prisma.$transaction([
        this.prisma.lessonResource.count(),
        this.prisma.lessonTask.count(),
        this.prisma.lessonTask.count({
          where: {
            status: {
              in: [LessonTaskStatus.pending, LessonTaskStatus.in_progress],
            },
          },
        }),
        this.prisma.lessonTask.count({
          where: { status: LessonTaskStatus.completed },
        }),
      ]);

    const resourceMeta = this.buildListMeta(
      resourceCount,
      resourceRequestedPage,
      resourceLimit,
    );
    const taskMeta = this.buildListMeta(
      taskCount,
      taskRequestedPage,
      taskLimit,
    );

    const [resources, tasks] = await this.prisma.$transaction([
      this.prisma.lessonResource.findMany({
        skip: (resourceMeta.page - 1) * resourceMeta.limit,
        take: resourceMeta.limit,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.lessonTask.findMany({
        skip: (taskMeta.page - 1) * taskMeta.limit,
        take: taskMeta.limit,
        orderBy: [
          { updatedAt: 'desc' },
          { status: 'asc' },
          { dueDate: 'asc' },
          { priority: 'desc' },
          { title: 'asc' },
        ],
        include: {
          staffLessonTasks: {
            select: {
              staffId: true,
              staff: {
                select: {
                  id: true,
                  fullName: true,
                  roles: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
    ]);
    const hydratedTasks = await this.hydrateTaskRecords(this.prisma, tasks);

    return {
      summary: {
        resourceCount,
        taskCount,
        openTaskCount,
        completedTaskCount,
      },
      resources: resources.map((resource) => this.mapResource(resource)),
      resourcesMeta: resourceMeta,
      tasks: hydratedTasks.map((task) => this.mapTask(task)),
      tasksMeta: taskMeta,
    };
  }

  async createResource(
    data: CreateLessonResourceDto,
    auditActor?: ActionHistoryActor,
  ): Promise<LessonResourceResponseDto> {
    const title = this.requireNonEmptyValue(data.title, 'title');
    const resourceLink = this.requireNonEmptyValue(
      data.resourceLink,
      'resourceLink',
    );
    const description = toTrimmedString(data.description);
    const tags = normalizeTags(data.tags);

    return this.prisma.$transaction(async (tx) => {
      const createdResource = await tx.lessonResource.create({
        data: {
          title,
          resourceLink,
          description,
          tags,
          createdBy: auditActor?.userId ?? null,
        },
      });

      if (auditActor) {
        await this.actionHistoryService.recordCreate(tx, {
          actor: auditActor,
          entityType: 'lesson_resource',
          entityId: createdResource.id,
          description: 'Tạo tài nguyên giáo án',
          afterValue: createdResource,
        });
      }

      return this.mapResource(createdResource);
    });
  }

  async updateResource(
    id: string,
    data: UpdateLessonResourceDto,
    auditActor?: ActionHistoryActor,
  ): Promise<LessonResourceResponseDto> {
    const existingResource = await this.prisma.lessonResource.findUnique({
      where: { id },
    });

    if (!existingResource) {
      throw new NotFoundException('Lesson resource not found');
    }

    const updateData: Prisma.LessonResourceUpdateInput = {};

    if (data.title !== undefined) {
      updateData.title = this.requireNonEmptyValue(data.title, 'title');
    }

    if (data.resourceLink !== undefined) {
      updateData.resourceLink = this.requireNonEmptyValue(
        data.resourceLink,
        'resourceLink',
      );
    }

    if (data.description !== undefined) {
      updateData.description = toTrimmedString(data.description);
    }

    if (data.tags !== undefined) {
      updateData.tags = normalizeTags(data.tags);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedResource = await tx.lessonResource.update({
        where: { id },
        data: updateData,
      });

      if (auditActor) {
        await this.actionHistoryService.recordUpdate(tx, {
          actor: auditActor,
          entityType: 'lesson_resource',
          entityId: id,
          description: 'Cập nhật tài nguyên giáo án',
          beforeValue: existingResource,
          afterValue: updatedResource,
        });
      }

      return this.mapResource(updatedResource);
    });
  }

  async deleteResource(id: string, auditActor?: ActionHistoryActor) {
    const existingResource = await this.prisma.lessonResource.findUnique({
      where: { id },
    });

    if (!existingResource) {
      throw new NotFoundException('Lesson resource not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedResource = await tx.lessonResource.delete({
        where: { id },
      });

      if (auditActor) {
        await this.actionHistoryService.recordDelete(tx, {
          actor: auditActor,
          entityType: 'lesson_resource',
          entityId: id,
          description: 'Xóa tài nguyên giáo án',
          beforeValue: existingResource,
        });
      }

      return deletedResource;
    });
  }

  async createTask(
    data: CreateLessonTaskDto,
    auditActor?: ActionHistoryActor,
  ): Promise<LessonTaskResponseDto> {
    const title = this.requireNonEmptyValue(data.title, 'title');
    const description = toTrimmedString(data.description);
    const status = data.status ?? LessonTaskStatus.pending;
    const priority = data.priority ?? LessonTaskPriority.medium;
    const dueDate = toDateOnlyOrNull(data.dueDate);

    return this.prisma.$transaction(async (tx) => {
      const createdByStaffId =
        data.createdByStaffId !== undefined
          ? await this.resolveCreatedByStaffId(tx, data.createdByStaffId)
          : await this.resolveActorStaffId(tx, auditActor?.userId);
      const assignedStaffIds = await this.resolveAssignedStaffIds(
        tx,
        data.assignedStaffIds,
      );

      const createdTask = await tx.lessonTask.create({
        data: {
          title,
          description,
          status,
          priority,
          dueDate,
          createdBy: createdByStaffId,
        },
      });

      await this.syncTaskAssignments(tx, createdTask.id, assignedStaffIds);

      const afterTask = await this.getTaskSnapshot(tx, createdTask.id);
      const afterValue = afterTask
        ? await this.hydrateTaskRecord(tx, afterTask)
        : null;

      if (auditActor) {
        await this.actionHistoryService.recordCreate(tx, {
          actor: auditActor,
          entityType: 'lesson_task',
          entityId: createdTask.id,
          description: 'Tạo công việc giáo án',
          afterValue,
        });
      }

      return this.mapTaskFromSnapshot(afterValue);
    });
  }

  async updateTask(
    id: string,
    data: UpdateLessonTaskDto,
    auditActor?: ActionHistoryActor,
  ): Promise<LessonTaskResponseDto> {
    const existingTaskRecord = await this.getTaskSnapshot(this.prisma, id);
    const existingTask = existingTaskRecord
      ? await this.hydrateTaskRecord(this.prisma, existingTaskRecord)
      : null;

    if (!existingTask) {
      throw new NotFoundException('Lesson task not found');
    }

    const updateData: Prisma.LessonTaskUpdateInput = {};

    if (data.title !== undefined) {
      updateData.title = this.requireNonEmptyValue(data.title, 'title');
    }

    if (data.description !== undefined) {
      updateData.description = toTrimmedString(data.description);
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }

    if (data.dueDate !== undefined) {
      updateData.dueDate = toDateOnlyOrNull(data.dueDate);
    }

    return this.prisma.$transaction(async (tx) => {
      const assignedStaffIds =
        data.assignedStaffIds !== undefined
          ? await this.resolveAssignedStaffIds(tx, data.assignedStaffIds)
          : undefined;
      const createdByStaffId =
        data.createdByStaffId !== undefined
          ? await this.resolveCreatedByStaffId(tx, data.createdByStaffId)
          : undefined;

      if (createdByStaffId !== undefined) {
        updateData.createdByStaff = createdByStaffId
          ? {
              connect: { id: createdByStaffId },
            }
          : {
              disconnect: true,
            };
      }

      await tx.lessonTask.update({
        where: { id },
        data: updateData,
      });

      if (assignedStaffIds !== undefined) {
        await this.syncTaskAssignments(tx, id, assignedStaffIds);
      }

      const afterTaskRecord = await this.getTaskSnapshot(tx, id);
      const afterValue = afterTaskRecord
        ? await this.hydrateTaskRecord(tx, afterTaskRecord)
        : null;

      if (!afterValue) {
        throw new NotFoundException('Lesson task not found');
      }

      if (auditActor) {
        await this.actionHistoryService.recordUpdate(tx, {
          actor: auditActor,
          entityType: 'lesson_task',
          entityId: id,
          description: 'Cập nhật công việc giáo án',
          beforeValue: existingTask,
          afterValue,
        });
      }

      return this.mapTaskFromSnapshot(afterValue);
    });
  }

  async deleteTask(id: string, auditActor?: ActionHistoryActor) {
    const existingTaskRecord = await this.getTaskSnapshot(this.prisma, id);
    const existingTask = existingTaskRecord
      ? await this.hydrateTaskRecord(this.prisma, existingTaskRecord)
      : null;

    if (!existingTask) {
      throw new NotFoundException('Lesson task not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedTask = await tx.lessonTask.delete({
        where: { id },
      });

      if (auditActor) {
        await this.actionHistoryService.recordDelete(tx, {
          actor: auditActor,
          entityType: 'lesson_task',
          entityId: id,
          description: 'Xóa công việc giáo án',
          beforeValue: existingTask,
        });
      }

      return deletedTask;
    });
  }

  async getTaskById(id: string): Promise<LessonTaskResponseDto> {
    const taskRecord = await this.getTaskSnapshot(this.prisma, id);
    const task = taskRecord
      ? await this.hydrateTaskRecord(this.prisma, taskRecord)
      : null;

    return this.mapTaskFromSnapshot(task);
  }

  async searchTaskStaffOptions(
    query: LessonTaskStaffOptionsQueryDto = {},
  ): Promise<LessonTaskStaffOptionDto[]> {
    const limit = Math.min(this.resolveLimit(query.limit, 3), 3);
    const trimmedSearch = query.search?.trim();

    const staff = await this.prisma.staffInfo.findMany({
      where: {
        roles: {
          hasSome: [...LESSON_TASK_ASSIGNABLE_ROLES],
        },
        ...(trimmedSearch
          ? {
            fullName: {
              contains: trimmedSearch,
              mode: 'insensitive',
            },
          }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        roles: true,
        status: true,
      },
      orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
      take: limit,
    });

    return staff.map((item) => ({
      id: item.id,
      fullName: item.fullName,
      roles: item.roles,
      status: item.status,
    }));
  }

  private requireNonEmptyValue(value: string, field: 'title' | 'resourceLink') {
    const normalized = toTrimmedString(value);
    if (!normalized) {
      throw new BadRequestException(`${field} là bắt buộc.`);
    }

    return normalized;
  }

  private mapResource(resource: {
    id: string;
    title: string | null;
    description: string | null;
    resourceLink: string;
    tags: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): LessonResourceResponseDto {
    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      resourceLink: resource.resourceLink,
      tags: parseJsonStringArray(resource.tags),
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
    };
  }

  private resolvePage(value: number | undefined) {
    if (!Number.isInteger(value) || (value as number) < 1) {
      return 1;
    }

    return value as number;
  }

  private resolveLimit(value: number | undefined, fallback: number) {
    if (!Number.isInteger(value) || (value as number) < 1) {
      return fallback;
    }

    return Math.min(value as number, 100);
  }

  private buildListMeta(total: number, requestedPage: number, limit: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, totalPages);

    return {
      total,
      page,
      limit,
      totalPages,
    };
  }

  private mapTask(task: {
    id: string;
    title: string | null;
    description: string | null;
    status: LessonTaskStatus;
    priority: LessonTaskPriority;
    dueDate: Date | null;
    createdByStaff: LessonTaskCreatorDto | null;
    assignees: LessonTaskAssigneeDto[];
  }): LessonTaskResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
      createdByStaff: task.createdByStaff
        ? {
          id: task.createdByStaff.id,
          fullName: task.createdByStaff.fullName,
          roles: task.createdByStaff.roles,
          status: task.createdByStaff.status,
        }
        : null,
      assignees: task.assignees.map((assignee) => ({
        id: assignee.id,
        fullName: assignee.fullName,
        roles: assignee.roles,
        status: assignee.status,
      })),
    };
  }

  private mapTaskFromSnapshot(task: HydratedLessonTaskRecord | null) {
    if (!task) {
      throw new NotFoundException('Lesson task not found');
    }

    return this.mapTask(task);
  }

  private async resolveActorStaffId(
    db: Prisma.TransactionClient | PrismaService,
    userId?: string | null,
  ) {
    if (!userId) {
      return null;
    }

    const staff = await db.staffInfo.findUnique({
      where: { userId },
      select: { id: true },
    });

    return staff?.id ?? null;
  }

  private async resolveCreatedByStaffId(
    db: Prisma.TransactionClient | PrismaService,
    staffId: string | null | undefined,
  ) {
    if (staffId == null) {
      return null;
    }

    const normalizedStaffId = String(staffId).trim();
    if (!normalizedStaffId) {
      return null;
    }

    const staff = await db.staffInfo.findFirst({
      where: {
        id: normalizedStaffId,
        roles: {
          hasSome: [...LESSON_TASK_ASSIGNABLE_ROLES],
        },
      },
      select: {
        id: true,
      },
    });

    if (!staff) {
      throw new BadRequestException(
        'Chỉ được gán người phụ trách có role giáo án hoặc trưởng giáo án.',
      );
    }

    return staff.id;
  }

  private async hydrateTaskRecords(
    db: Prisma.TransactionClient | PrismaService,
    tasks: LessonTaskRecord[],
  ) {
    const creatorMap = await this.getTaskCreatorMap(
      db,
      tasks
        .map((task) => task.createdBy)
        .filter((value): value is string => typeof value === 'string'),
    );

    return tasks.map((task) => ({
      ...task,
      createdByStaff: task.createdBy
        ? (creatorMap.get(task.createdBy) ?? null)
        : null,
      assignees: this.mapTaskAssignees(task.staffLessonTasks),
    }));
  }

  private async hydrateTaskRecord(
    db: Prisma.TransactionClient | PrismaService,
    task: LessonTaskRecord,
  ): Promise<HydratedLessonTaskRecord> {
    const creatorMap = await this.getTaskCreatorMap(
      db,
      task.createdBy ? [task.createdBy] : [],
    );

    return {
      ...task,
      createdByStaff: task.createdBy
        ? (creatorMap.get(task.createdBy) ?? null)
        : null,
      assignees: this.mapTaskAssignees(task.staffLessonTasks),
    };
  }

  private mapTaskAssignees(
    taskAssignees: LessonTaskRecord['staffLessonTasks'],
  ) {
    return taskAssignees
      .map((assignment) => ({
        id: assignment.staff.id,
        fullName: assignment.staff.fullName,
        roles: assignment.staff.roles,
        status: assignment.staff.status,
      }))
      .sort((left, right) => {
        if (left.status !== right.status) {
          return left.status.localeCompare(right.status);
        }

        return left.fullName.localeCompare(right.fullName, 'vi');
      });
  }

  private async getTaskCreatorMap(
    db: Prisma.TransactionClient | PrismaService,
    creatorIds: string[],
  ) {
    const uniqueCreatorIds = Array.from(new Set(creatorIds));
    if (uniqueCreatorIds.length === 0) {
      return new Map<string, LessonTaskCreatorDto>();
    }

    const creators = await db.staffInfo.findMany({
      where: {
        id: {
          in: uniqueCreatorIds,
        },
      },
      select: {
        id: true,
        fullName: true,
        roles: true,
        status: true,
      },
    });

    return new Map<string, LessonTaskCreatorDto>(
      creators.map((creator) => [
        creator.id,
        {
          id: creator.id,
          fullName: creator.fullName,
          roles: creator.roles,
          status: creator.status,
        },
      ]),
    );
  }

  private getTaskSnapshot(
    db: Prisma.TransactionClient | PrismaService,
    id: string,
  ) {
    return db.lessonTask.findUnique({
      where: { id },
      include: {
        staffLessonTasks: {
          select: {
            staffId: true,
            staff: {
              select: {
                id: true,
                fullName: true,
                roles: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  private async resolveAssignedStaffIds(
    db: Prisma.TransactionClient | PrismaService,
    staffIds: string[] | null | undefined,
  ) {
    if (!Array.isArray(staffIds)) {
      return [];
    }

    const normalizedStaffIds = Array.from(
      new Set(
        staffIds
          .map((staffId) => String(staffId).trim())
          .filter((staffId) => staffId.length > 0),
      ),
    );

    if (normalizedStaffIds.length === 0) {
      return [];
    }

    if (normalizedStaffIds.length > 3) {
      throw new BadRequestException(
        'Mỗi công việc chỉ được gắn tối đa 3 nhân sự.',
      );
    }

    const existingStaff = await db.staffInfo.findMany({
      where: {
        id: {
          in: normalizedStaffIds,
        },
        roles: {
          hasSome: [...LESSON_TASK_ASSIGNABLE_ROLES],
        },
      },
      select: {
        id: true,
      },
    });

    const existingStaffIdSet = new Set(existingStaff.map((staff) => staff.id));
    if (existingStaff.length !== normalizedStaffIds.length) {
      throw new BadRequestException(
        'Chỉ được gắn nhân sự có role giáo án hoặc trưởng giáo án.',
      );
    }

    return normalizedStaffIds.filter((staffId) =>
      existingStaffIdSet.has(staffId),
    );
  }

  private async syncTaskAssignments(
    db: Prisma.TransactionClient | PrismaService,
    lessonTaskId: string,
    nextStaffIds: string[],
  ) {
    const currentAssignments = await db.staffLessonTask.findMany({
      where: { lessonTaskId },
      select: { staffId: true },
    });

    const currentStaffIds = currentAssignments.map(
      (assignment) => assignment.staffId,
    );
    const currentStaffIdSet = new Set(currentStaffIds);
    const nextStaffIdSet = new Set(nextStaffIds);
    const staffIdsToCreate = nextStaffIds.filter(
      (staffId) => !currentStaffIdSet.has(staffId),
    );
    const staffIdsToDelete = currentStaffIds.filter(
      (staffId) => !nextStaffIdSet.has(staffId),
    );

    if (staffIdsToDelete.length > 0) {
      await db.staffLessonTask.deleteMany({
        where: {
          lessonTaskId,
          staffId: {
            in: staffIdsToDelete,
          },
        },
      });
    }

    if (staffIdsToCreate.length > 0) {
      await db.staffLessonTask.createMany({
        data: staffIdsToCreate.map((staffId) => ({
          lessonTaskId,
          staffId,
        })),
      });
    }
  }
}
