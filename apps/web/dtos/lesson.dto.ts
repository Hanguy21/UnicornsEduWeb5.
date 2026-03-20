export type LessonTabId = "overview" | "work" | "exercises";
export type LessonUpsertMode = "create" | "edit";
export type LessonTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";
export type LessonTaskPriority = "low" | "medium" | "high";
export type LessonStaffStatus = "active" | "inactive";
export type LessonStaffRole =
  | "admin"
  | "teacher"
  | "assistant"
  | "lesson_plan"
  | "lesson_plan_head"
  | "accountant"
  | "communication"
  | "customer_care";

export interface LessonOverviewSummary {
  resourceCount: number;
  taskCount: number;
  openTaskCount: number;
  completedTaskCount: number;
}

export interface LessonListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LessonResourceItem {
  id: string;
  title: string | null;
  description: string | null;
  resourceLink: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LessonTaskCreator {
  id: string;
  fullName: string;
  roles: LessonStaffRole[];
  status: LessonStaffStatus;
}

export interface LessonTaskAssignee {
  id: string;
  fullName: string;
  roles: LessonStaffRole[];
  status: LessonStaffStatus;
}

export interface LessonTaskStaffOption {
  id: string;
  fullName: string;
  roles: LessonStaffRole[];
  status: LessonStaffStatus;
}

export interface LessonTaskItem {
  id: string;
  title: string | null;
  description: string | null;
  status: LessonTaskStatus;
  priority: LessonTaskPriority;
  dueDate: string | null;
  createdByStaff: LessonTaskCreator | null;
  assignees: LessonTaskAssignee[];
}

export interface LessonOverviewResponse {
  summary: LessonOverviewSummary;
  resources: LessonResourceItem[];
  resourcesMeta: LessonListMeta;
  tasks: LessonTaskItem[];
  tasksMeta: LessonListMeta;
}

export interface LessonOverviewQueryParams {
  resourcePage: number;
  resourceLimit: number;
  taskPage: number;
  taskLimit: number;
}

export interface CreateLessonResourcePayload {
  title: string;
  resourceLink: string;
  description?: string | null;
  tags?: string[];
}

export interface UpdateLessonResourcePayload {
  title?: string;
  resourceLink?: string;
  description?: string | null;
  tags?: string[];
}

export interface CreateLessonTaskPayload {
  title: string;
  description?: string | null;
  status?: LessonTaskStatus;
  priority?: LessonTaskPriority;
  dueDate?: string | null;
  createdByStaffId?: string | null;
  assignedStaffIds?: string[];
}

export interface UpdateLessonTaskPayload {
  title?: string;
  description?: string | null;
  status?: LessonTaskStatus;
  priority?: LessonTaskPriority;
  dueDate?: string | null;
  createdByStaffId?: string | null;
  assignedStaffIds?: string[];
}
