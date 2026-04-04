jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from 'generated/enums';
import type { RequestWithResolvedAuthContext } from '../auth-request-context';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `${key}-value`),
  };
  const authIdentityCacheService = {
    getAuthIdentity: jest.fn(),
  };

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(
      configService as never,
      authIdentityCacheService as never,
    );
  });

  it('reuses request-scoped auth identity when already available', async () => {
    const request = {
      resolvedAuthIdentity: {
        id: 'user-1',
        email: 'user@example.com',
        accountHandle: 'user-1',
        roleType: UserRole.admin,
        status: 'active',
        requiresPasswordSetup: false,
      },
    } as RequestWithResolvedAuthContext;

    await expect(
      strategy.validate(request, {
        id: 'user-1',
        email: '',
        accountHandle: 'ignored',
        roleType: UserRole.admin,
      }),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'user@example.com',
      accountHandle: 'user-1',
      roleType: UserRole.admin,
    });

    expect(authIdentityCacheService.getAuthIdentity).not.toHaveBeenCalled();
  });

  it('loads auth identity through cache service and stores it on the request', async () => {
    const request = {} as RequestWithResolvedAuthContext;

    authIdentityCacheService.getAuthIdentity.mockImplementation(
      (_userId: string, currentRequest?: RequestWithResolvedAuthContext) => {
        const identity = {
          id: 'user-2',
          email: 'staff@example.com',
          accountHandle: 'staff-user',
          roleType: UserRole.staff,
          status: 'active',
          requiresPasswordSetup: false,
        };

        if (currentRequest) {
          currentRequest.resolvedAuthIdentity = identity;
        }

        return Promise.resolve(identity);
      },
    );

    await expect(
      strategy.validate(request, {
        id: 'user-2',
        email: '',
        accountHandle: 'ignored',
        roleType: UserRole.staff,
      }),
    ).resolves.toEqual({
      id: 'user-2',
      email: 'staff@example.com',
      accountHandle: 'staff-user',
      roleType: UserRole.staff,
    });

    expect(authIdentityCacheService.getAuthIdentity).toHaveBeenCalledWith(
      'user-2',
      request,
    );
    expect(request.resolvedAuthIdentity).toEqual(
      expect.objectContaining({
        id: 'user-2',
        email: 'staff@example.com',
      }),
    );
  });

  it('rejects inactive users', async () => {
    authIdentityCacheService.getAuthIdentity.mockResolvedValue({
      id: 'user-3',
      email: 'inactive@example.com',
      accountHandle: 'inactive-user',
      roleType: UserRole.staff,
      status: 'inactive',
      requiresPasswordSetup: false,
    });

    await expect(
      strategy.validate({} as RequestWithResolvedAuthContext, {
        id: 'user-3',
        email: '',
        accountHandle: 'ignored',
        roleType: UserRole.staff,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
