jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentStatus, StaffRole, UserRole } from '../../generated/enums';
import { ExtraAllowanceService } from './extra-allowance.service';

describe('ExtraAllowanceService', () => {
  const mockPrisma = {
    staffInfo: {
      findFirst: jest.fn(),
    },
    extraAllowance: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const actionHistoryService = {
    recordCreate: jest.fn(),
    recordUpdate: jest.fn(),
    recordDelete: jest.fn(),
  };

  let service: ExtraAllowanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (callback: (db: typeof mockPrisma) => unknown) => callback(mockPrisma),
    );
    service = new ExtraAllowanceService(
      mockPrisma as never,
      actionHistoryService as never,
    );
  });

  it('allows communication staff to update their own extra allowance without changing payment status', async () => {
    mockPrisma.staffInfo.findFirst.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.communication],
    });
    mockPrisma.extraAllowance.findUnique
      .mockResolvedValueOnce({
        id: 'allowance-1',
        staffId: 'staff-1',
        amount: 150000,
        status: PaymentStatus.paid,
        note: 'Ghi chú cũ',
        month: '2026-03',
        roleType: StaffRole.communication,
        staff: {
          id: 'staff-1',
          fullName: 'Communication A',
          roles: [StaffRole.communication],
          status: 'active',
        },
      })
      .mockResolvedValueOnce({
        id: 'allowance-1',
        staffId: 'staff-1',
        amount: 250000,
        status: PaymentStatus.paid,
        note: 'Ghi chú mới',
        month: '2026-04',
        roleType: StaffRole.communication,
        staff: {
          id: 'staff-1',
          fullName: 'Communication A',
          roles: [StaffRole.communication],
          status: 'active',
        },
      });
    mockPrisma.extraAllowance.update.mockResolvedValue({
      id: 'allowance-1',
      staffId: 'staff-1',
      amount: 250000,
      status: PaymentStatus.paid,
      note: 'Ghi chú mới',
      month: '2026-04',
      roleType: StaffRole.communication,
    });

    const result = await service.updateMyCommunicationExtraAllowance(
      {
        id: 'user-1',
        email: 'communication@example.com',
        roleType: UserRole.staff,
      },
      {
        id: 'allowance-1',
        month: '2026-04',
        amount: 250000,
        note: 'Ghi chú mới',
      },
    );

    expect(mockPrisma.extraAllowance.update).toHaveBeenCalledWith({
      where: { id: 'allowance-1' },
      data: {
        month: '2026-04',
        amount: 250000,
        note: 'Ghi chú mới',
      },
    });
    expect(actionHistoryService.recordUpdate).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        entityType: 'extra_allowance',
        entityId: 'allowance-1',
      }),
    );
    expect(result).toEqual({
      id: 'allowance-1',
      staffId: 'staff-1',
      amount: 250000,
      status: PaymentStatus.paid,
      note: 'Ghi chú mới',
      month: '2026-04',
      roleType: StaffRole.communication,
    });
  });

  it('rejects self updates when current staff lacks communication role', async () => {
    mockPrisma.staffInfo.findFirst.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.assistant],
    });

    await expect(
      service.updateMyCommunicationExtraAllowance(
        {
          id: 'user-1',
          email: 'assistant@example.com',
          roleType: UserRole.staff,
        },
        {
          id: 'allowance-1',
          month: '2026-04',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects self updates for communication allowances owned by another staff', async () => {
    mockPrisma.staffInfo.findFirst.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.communication],
    });
    mockPrisma.extraAllowance.findUnique.mockResolvedValue({
      id: 'allowance-1',
      staffId: 'staff-2',
      amount: 150000,
      status: PaymentStatus.pending,
      note: 'Khác staff',
      month: '2026-03',
      roleType: StaffRole.communication,
      staff: {
        id: 'staff-2',
        fullName: 'Communication B',
        roles: [StaffRole.communication],
        status: 'active',
      },
    });

    await expect(
      service.updateMyCommunicationExtraAllowance(
        {
          id: 'user-1',
          email: 'communication@example.com',
          roleType: UserRole.staff,
        },
        {
          id: 'allowance-1',
          amount: 250000,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
