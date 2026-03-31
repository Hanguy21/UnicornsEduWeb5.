import type { FullProfileDto } from "@/dtos/profile.dto";

export type StaffLessonWorkspacePolicy =
  | "admin"
  | "lesson_plan_head"
  | "lesson_plan"
  | "accountant";

export type StaffLessonEndpointAccessMode =
  | "manage"
  | "account"
  | "participant";

export type StaffLessonWorkspaceAccess = {
  workspacePolicy: StaffLessonWorkspacePolicy | null;
  participantMode: boolean;
  canAccessWorkspace: boolean;
  canAccessTaskDetail: boolean;
  canAccessManageDetails: boolean;
  workAccessMode: StaffLessonEndpointAccessMode | null;
  createOutputAccessMode: Exclude<StaffLessonEndpointAccessMode, "account"> | null;
  isAssistant: boolean;
  isAccountant: boolean;
  isLessonPlan: boolean;
  isLessonPlanHead: boolean;
};

export function resolveStaffLessonWorkspace(
  profile?: FullProfileDto | null,
): StaffLessonWorkspaceAccess {
  const staffRoles = profile?.staffInfo?.roles ?? [];
  const isAdmin = profile?.roleType === "admin";
  const isStaff = profile?.roleType === "staff";
  const isAssistant = isStaff && staffRoles.includes("assistant");
  const isLessonPlanHead = isStaff && staffRoles.includes("lesson_plan_head");
  const isLessonPlan = isStaff && staffRoles.includes("lesson_plan");
  const isAccountant = isStaff && staffRoles.includes("accountant");

  const workspacePolicy: StaffLessonWorkspacePolicy | null = isAdmin || isAssistant
    ? "admin"
    : isLessonPlanHead
      ? "lesson_plan_head"
      : isLessonPlan
        ? "lesson_plan"
        : isAccountant
          ? "accountant"
          : null;
  const workAccessMode: StaffLessonEndpointAccessMode | null =
    isAdmin || isAssistant || isLessonPlanHead
      ? "manage"
      : isAccountant
        ? "account"
        : isLessonPlan
          ? "participant"
          : null;
  const createOutputAccessMode: Exclude<
    StaffLessonEndpointAccessMode,
    "account"
  > | null =
    isAdmin || isAssistant || isLessonPlanHead
      ? "manage"
      : isLessonPlan
        ? "participant"
        : null;

  return {
    workspacePolicy,
    participantMode: workspacePolicy === "lesson_plan",
    canAccessWorkspace: workspacePolicy !== null,
    canAccessTaskDetail:
      workspacePolicy === "admin" ||
      workspacePolicy === "lesson_plan_head" ||
      workspacePolicy === "lesson_plan",
    canAccessManageDetails:
      workspacePolicy === "admin" || workspacePolicy === "lesson_plan_head",
    workAccessMode,
    createOutputAccessMode,
    isAssistant,
    isAccountant,
    isLessonPlan,
    isLessonPlanHead,
  };
}
