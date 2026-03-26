jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

jest.mock('../staff-ops/staff-operations-access.service', () => ({
  StaffOperationsAccessService: class StaffOperationsAccessServiceMock {},
}));

jest.mock('../action-history/action-history.service', () => ({
  ActionHistoryService: class ActionHistoryServiceMock {},
}));

jest.mock('../../generated/client', () => ({
  Prisma: {},
}));

import { ClassService } from './class.service';

describe('ClassService.updateClassTeachers', () => {
  const mockTx = {
    classTeacher: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  const mockPrisma = {
    class: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockStaffOperationsAccess = {};
  const mockActionHistoryService = {
    recordUpdate: jest.fn(),
  };

  let service: ClassService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.class.findUnique.mockResolvedValue({
      id: 'class-1',
      allowancePerSessionPerStudent: 120000,
    });
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<unknown>) =>
        callback(mockTx),
    );
    mockTx.classTeacher.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.classTeacher.createMany.mockResolvedValue({ count: 1 });

    service = new ClassService(
      mockPrisma as never,
      mockStaffOperationsAccess as never,
      mockActionHistoryService as never,
    );
    (service as any).getClassAuditSnapshot = jest.fn().mockResolvedValue({
      id: 'class-1',
      teachers: [],
    });
  });

  it('fills blank custom_allowance with the class default allowance', async () => {
    await service.updateClassTeachers('class-1', {
      teachers: [{ teacher_id: 'teacher-1' }],
    });

    expect(mockTx.classTeacher.createMany).toHaveBeenCalledWith({
      data: [
        {
          classId: 'class-1',
          teacherId: 'teacher-1',
          customAllowance: 120000,
        },
      ],
    });
  });
});
