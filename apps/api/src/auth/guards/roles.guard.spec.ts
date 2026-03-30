import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { StaffRole, UserRole } from '../../../generated/enums';
import { ALLOW_ASSISTANT_ON_ADMIN_KEY } from '../decorators/allow-assistant-on-admin.decorator';
import { ALLOW_STAFF_ROLES_ON_ADMIN_KEY } from '../decorators/allow-staff-roles-on-admin.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

type GuardMetadata = {
  requiredRoles?: UserRole[];
  allowAssistantOnAdminRoutes?: boolean;
  allowStaffRolesOnAdminRoutes?: StaffRole[];
};

describe('RolesGuard', () => {
  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };
  const mockPrisma = {
    staffInfo: {
      findUnique: jest.fn(),
    },
  };

  let guard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(
      mockReflector as unknown as Reflector,
      mockPrisma as never,
    );
  });

  function createContext(
    user: {
      id: string;
      email: string;
      accountHandle: string;
      roleType: UserRole;
    },
    metadata: GuardMetadata,
  ): ExecutionContext {
    mockReflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) {
        return metadata.requiredRoles;
      }

      if (key === ALLOW_ASSISTANT_ON_ADMIN_KEY) {
        return metadata.allowAssistantOnAdminRoutes;
      }

      if (key === ALLOW_STAFF_ROLES_ON_ADMIN_KEY) {
        return metadata.allowStaffRolesOnAdminRoutes;
      }

      return undefined;
    });

    return {
      getHandler: () => 'handler',
      getClass: () => 'controller',
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows assistant on admin routes by default', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      roles: [StaffRole.assistant],
    });

    await expect(
      guard.canActivate(
        createContext(
          {
            id: 'staff-1',
            email: 'assistant@example.com',
            accountHandle: 'assistant',
            roleType: UserRole.staff,
          },
          {
            requiredRoles: [UserRole.admin],
          },
        ),
      ),
    ).resolves.toBe(true);
  });

  it('allows accountant when the route explicitly permits accountant', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      roles: [StaffRole.accountant],
    });

    await expect(
      guard.canActivate(
        createContext(
          {
            id: 'staff-2',
            email: 'accountant@example.com',
            accountHandle: 'accountant',
            roleType: UserRole.staff,
          },
          {
            requiredRoles: [UserRole.admin],
            allowStaffRolesOnAdminRoutes: [StaffRole.accountant],
          },
        ),
      ),
    ).resolves.toBe(true);
  });

  it('rejects accountant on admin routes without explicit accountant access', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      roles: [StaffRole.accountant],
    });

    await expect(
      guard.canActivate(
        createContext(
          {
            id: 'staff-3',
            email: 'accountant@example.com',
            accountHandle: 'accountant',
            roleType: UserRole.staff,
          },
          {
            requiredRoles: [UserRole.admin],
          },
        ),
      ),
    ).rejects.toThrow(
      new ForbiddenException('Only authorized roles can access this resource'),
    );
  });

  it('allows accountant and rejects assistant when assistant fallback is disabled', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      roles: [StaffRole.accountant],
    });

    await expect(
      guard.canActivate(
        createContext(
          {
            id: 'staff-4',
            email: 'accountant@example.com',
            accountHandle: 'accountant',
            roleType: UserRole.staff,
          },
          {
            requiredRoles: [UserRole.admin],
            allowAssistantOnAdminRoutes: false,
            allowStaffRolesOnAdminRoutes: [StaffRole.accountant],
          },
        ),
      ),
    ).resolves.toBe(true);

    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      roles: [StaffRole.assistant],
    });

    await expect(
      guard.canActivate(
        createContext(
          {
            id: 'staff-5',
            email: 'assistant@example.com',
            accountHandle: 'assistant',
            roleType: UserRole.staff,
          },
          {
            requiredRoles: [UserRole.admin],
            allowAssistantOnAdminRoutes: false,
            allowStaffRolesOnAdminRoutes: [StaffRole.accountant],
          },
        ),
      ),
    ).rejects.toThrow(
      new ForbiddenException('Only authorized roles can access this resource'),
    );
  });
});
