import type { UserRoleType } from "@/dtos/user.dto";

/** Nhãn hiển thị cho role_type trên user (phân quyền chính). */
export const USER_ROLE_LABELS: Record<UserRoleType, string> = {
  admin: "Admin",
  staff: "Nhân sự",
  student: "Học sinh",
  guest: "Khách",
};
