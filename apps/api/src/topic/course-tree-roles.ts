import { StaffRole } from 'generated/enums';

/** Staff được decorator cây Chương / Chuyên đề / Bài học. Service vẫn `assertCanManageCourse`. */
export const COURSE_TREE_STAFF_ROLES = [
  StaffRole.assistant,
  StaffRole.teacher,
  StaffRole.lesson_plan,
  StaffRole.lesson_plan_head,
] as const;
