jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

jest.mock('../../generated/client', () => ({}));

import { ClassTimelineService } from './class-timeline.service';
import { UserRole } from 'generated/enums';

describe('ClassTimelineService — soft hide', () => {
  let service: ClassTimelineService;
  let mockPrisma: Record<string, any>;
  let staffAccess: {
    resolveClassViewerActor: jest.Mock;
    resolveClassViewAccessMode: jest.Mock;
  };

  const adminActor = {
    userId: 'user-admin-1',
    userEmail: 'admin@test.com',
    roleType: UserRole.admin,
  };

  beforeEach(() => {
    mockPrisma = {
      classTimelineItem: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      studentClass: { findFirst: jest.fn() },
      studentInfo: { findUnique: jest.fn() },
      class: { update: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    staffAccess = {
      resolveClassViewerActor: jest.fn().mockResolvedValue({}),
      resolveClassViewAccessMode: jest.fn().mockResolvedValue('admin'),
    };
    service = new ClassTimelineService(mockPrisma as any, staffAccess as any);
  });

  it('staff list includes hidden content items', async () => {
    mockPrisma.classTimelineItem.findMany.mockResolvedValue([
      {
        id: 'tl-1',
        kind: 'content_item',
        sortOrder: 0,
        hiddenAt: new Date('2026-09-07T00:00:00.000Z'),
        classContentItem: {
          id: 'cci-1',
          hiddenAt: new Date('2026-09-07T00:00:00.000Z'),
          openAt: null,
          durationMinutes: null,
          topic: { id: 't-1', title: 'Ẩn', kind: 'theory' },
        },
        session: null,
        classSurvey: null,
      },
    ]);

    const rows = await service.listForStaff('cls-1', adminActor);

    expect(rows).toHaveLength(1);
    expect(rows[0].hiddenAt).toBe('2026-09-07T00:00:00.000Z');
    expect(mockPrisma.classTimelineItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { classId: 'cls-1' },
      }),
    );
  });

  it('student list omits hidden timeline items', async () => {
    mockPrisma.studentClass.findFirst.mockResolvedValue({
      id: 'sc-1',
      class: { contentAccessExpiresAt: null },
    });
    mockPrisma.classTimelineItem.findMany.mockResolvedValue([]);

    await service.listForStudent('cls-1', 'stu-1', undefined, 20);

    expect(mockPrisma.classTimelineItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          classId: 'cls-1',
          hiddenAt: null,
        }),
      }),
    );
  });
});
