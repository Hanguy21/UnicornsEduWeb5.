import { SetMetadata } from '@nestjs/common';
import { StaffRole } from 'generated/enums';

export const ALLOW_STAFF_ROLES_ON_ADMIN_KEY = 'allowStaffRolesOnAdminRoutes';

export const AllowStaffRolesOnAdminRoutes = (...roles: StaffRole[]) =>
  SetMetadata(ALLOW_STAFF_ROLES_ON_ADMIN_KEY, roles);
