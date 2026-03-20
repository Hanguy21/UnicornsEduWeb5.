import type {
  CreateLessonResourcePayload,
  CreateLessonTaskPayload,
  LessonOverviewQueryParams,
  LessonOverviewResponse,
  LessonResourceItem,
  LessonTaskAssignee,
  LessonTaskItem,
  LessonTaskStaffOption,
  UpdateLessonResourcePayload,
  UpdateLessonTaskPayload,
} from "@/dtos/lesson.dto";
import { api } from "../client";

function normalizeLessonTaskAssignee(
  value: Partial<LessonTaskAssignee> | undefined,
): LessonTaskAssignee | null {
  if (!value?.id || !value?.fullName) {
    return null;
  }

  return {
    id: value.id,
    fullName: value.fullName,
    roles: Array.isArray(value.roles) ? value.roles : [],
    status: value.status === "inactive" ? "inactive" : "active",
  };
}

function normalizeLessonTask(
  value: Partial<LessonTaskItem> | undefined,
): LessonTaskItem {
  return {
    id: value?.id ?? "",
    title: value?.title ?? null,
    description: value?.description ?? null,
    status: value?.status ?? "pending",
    priority: value?.priority ?? "medium",
    dueDate: value?.dueDate ?? null,
    createdByStaff: normalizeLessonTaskAssignee(value?.createdByStaff ?? undefined),
    assignees: Array.isArray(value?.assignees)
      ? value.assignees
          .map((item) => normalizeLessonTaskAssignee(item))
          .filter((item): item is LessonTaskAssignee => item !== null)
      : [],
  };
}

function normalizeLessonTaskStaffOption(
  value: Partial<LessonTaskStaffOption> | undefined,
): LessonTaskStaffOption | null {
  if (!value?.id || !value?.fullName) {
    return null;
  }

  return {
    id: value.id,
    fullName: value.fullName,
    roles: Array.isArray(value.roles) ? value.roles : [],
    status: value.status === "inactive" ? "inactive" : "active",
  };
}

export async function getLessonOverview(
  params: LessonOverviewQueryParams,
): Promise<LessonOverviewResponse> {
  const response = await api.get("/lesson-overview", {
    params: {
      resourcePage: params.resourcePage,
      resourceLimit: params.resourceLimit,
      taskPage: params.taskPage,
      taskLimit: params.taskLimit,
    },
  });
  const payload = response.data as Partial<LessonOverviewResponse> | undefined;

  return {
    summary: {
      resourceCount: payload?.summary?.resourceCount ?? 0,
      taskCount: payload?.summary?.taskCount ?? 0,
      openTaskCount: payload?.summary?.openTaskCount ?? 0,
      completedTaskCount: payload?.summary?.completedTaskCount ?? 0,
    },
    resources: Array.isArray(payload?.resources) ? payload.resources : [],
    resourcesMeta: {
      total: payload?.resourcesMeta?.total ?? 0,
      page: payload?.resourcesMeta?.page ?? params.resourcePage,
      limit: payload?.resourcesMeta?.limit ?? params.resourceLimit,
      totalPages: payload?.resourcesMeta?.totalPages ?? 1,
    },
    tasks: Array.isArray(payload?.tasks)
      ? payload.tasks.map((task) => normalizeLessonTask(task))
      : [],
    tasksMeta: {
      total: payload?.tasksMeta?.total ?? 0,
      page: payload?.tasksMeta?.page ?? params.taskPage,
      limit: payload?.tasksMeta?.limit ?? params.taskLimit,
      totalPages: payload?.tasksMeta?.totalPages ?? 1,
    },
  };
}

export async function createLessonResource(
  data: CreateLessonResourcePayload,
): Promise<LessonResourceItem> {
  const response = await api.post("/lesson-resources", data);
  return response.data as LessonResourceItem;
}

export async function updateLessonResource(
  id: string,
  data: UpdateLessonResourcePayload,
): Promise<LessonResourceItem> {
  const response = await api.patch(
    `/lesson-resources/${encodeURIComponent(id)}`,
    data,
  );
  return response.data as LessonResourceItem;
}

export async function deleteLessonResource(id: string) {
  const response = await api.delete(
    `/lesson-resources/${encodeURIComponent(id)}`,
  );
  return response.data;
}

export async function createLessonTask(
  data: CreateLessonTaskPayload,
): Promise<LessonTaskItem> {
  const response = await api.post("/lesson-tasks", data);
  return normalizeLessonTask(response.data as Partial<LessonTaskItem>);
}

export async function getLessonTaskById(id: string): Promise<LessonTaskItem> {
  const response = await api.get(`/lesson-tasks/${encodeURIComponent(id)}`);
  return normalizeLessonTask(response.data as Partial<LessonTaskItem>);
}

export async function updateLessonTask(
  id: string,
  data: UpdateLessonTaskPayload,
): Promise<LessonTaskItem> {
  const response = await api.patch(
    `/lesson-tasks/${encodeURIComponent(id)}`,
    data,
  );
  return normalizeLessonTask(response.data as Partial<LessonTaskItem>);
}

export async function deleteLessonTask(id: string) {
  const response = await api.delete(`/lesson-tasks/${encodeURIComponent(id)}`);
  return response.data;
}

export async function searchLessonTaskStaffOptions(params: {
  search?: string;
  limit?: number;
}): Promise<LessonTaskStaffOption[]> {
  const response = await api.get("/lesson-task-staff-options", {
    params: {
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
    },
  });

  return Array.isArray(response.data)
    ? response.data
        .map((item) =>
          normalizeLessonTaskStaffOption(
            item as Partial<LessonTaskStaffOption> | undefined,
          ),
        )
        .filter((item): item is LessonTaskStaffOption => item !== null)
    : [];
}
