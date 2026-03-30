import type { FullProfileDto } from "@/dtos/profile.dto";

export type AdminShellAccess = {
  isAdmin: boolean;
  isAssistant: boolean;
  isAccountant: boolean;
  isLessonPlanHead: boolean;
  staffId: string | null;
  staffRoles: string[];
};

export const ACCOUNTANT_VISIBLE_HREFS = new Set([
  "/admin/dashboard",
  "/admin/classes",
  "/admin/staffs",
  "/admin/costs",
  "/admin/lesson-plans",
]);

const ACCOUNTANT_ALLOWED_ROUTE_PATTERNS = [
  /^\/admin\/dashboard$/,
  /^\/admin\/classes(?:\/[^/]+)?$/,
  /^\/admin\/staffs(?:\/[^/]+)?$/,
  /^\/admin\/costs$/,
  /^\/admin\/lesson-plans$/,
  /^\/admin\/accountant_detail$/,
  /^\/admin\/assistant_detail$/,
  /^\/admin\/communication_detail$/,
  /^\/admin\/customer_care_detail\/[^/]+$/,
  /^\/admin\/lesson_plan_detail\/[^/]+$/,
] as const;

export function resolveAdminShellAccess(
  profile?: FullProfileDto | null,
): AdminShellAccess {
  const staffRoles = profile?.staffInfo?.roles ?? [];
  const isStaff = profile?.roleType === "staff";

  return {
    isAdmin: profile?.roleType === "admin",
    isAssistant: isStaff && staffRoles.includes("assistant"),
    isAccountant: isStaff && staffRoles.includes("accountant"),
    isLessonPlanHead: isStaff && staffRoles.includes("lesson_plan_head"),
    staffId: profile?.staffInfo?.id ?? null,
    staffRoles,
  };
}

export function isAccountantAllowedAdminRoute(pathname: string): boolean {
  return ACCOUNTANT_ALLOWED_ROUTE_PATTERNS.some((pattern) =>
    pattern.test(pathname),
  );
}
