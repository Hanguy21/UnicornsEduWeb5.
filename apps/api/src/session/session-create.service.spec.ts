jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));
jest.mock('./session-student-balance.service', () => ({
  SessionStudentBalanceService: class SessionStudentBalanceServiceMock {},
}));
jest.mock('../payroll/lesson-plan-head-commission.util', () => ({
  syncLessonPlanHeadCommissions: jest.fn(),
}));

import { AttendanceStatus, StaffRole, UserRole } from '../../generated/enums';
import { SessionCreateService } from './session-create.service';
import { SessionValidationService } from './session-validation.service';
import { BadRequestException } from '@nestjs/common';

describe('SessionCreateService', () => {
  const mockPrisma = {
    $transaction: jest.fn(),
    classTeacher: {
      findUnique: jest.fn(),
    },
  };

  const accessService = {
    resolveActor: jest.fn(),
    assertTeacherAssignedToClass: jest.fn(),
    resolveSingleTeacherForClass: jest.fn(),
  };

  const rosterService = {
    assertAttendanceStudentsBelongToClass: jest.fn(),
  };

  const validationService = {
    validateAttendanceItems: jest.fn(),
    validateAttendanceNotes: jest.fn(),
    validateSessionCommentFields: jest.fn(),
    isTuitionChargeableStatus: jest.fn().mockReturnValue(true),
    resolveChargeableAttendanceTuitionFee: jest.fn(),
    resolveDefaultStudentTuitionPerSession: jest.fn(),
    parseSessionDate: jest.fn(),
    parseSessionTime: jest.fn(),
    assertRequiredSessionTimes: jest.fn(),
    assertSessionEndAfterStart: jest.fn(),
    normalizeCoefficient: jest.fn(),
  };

  const balanceService = {
    applyBalanceChanges: jest.fn(),
  };

  const ledgerService = {
    buildChargeNote: jest.fn(),
  };

  const snapshotService = {
    getSessionAuditSnapshot: jest.fn(),
  };

  const scheduleRulesService = {
    assertSessionMatchesDeclaredSchedule: jest.fn(),
    linkMakeupEventToSession: jest.fn(),
  };

  const actionHistoryService = {
    recordCreate: jest.fn(),
  };

  function baseTx(overrides: Record<string, unknown> = {}) {
    return {
      staffTaxDeductionOverride: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      roleTaxDeductionRate: { findFirst: jest.fn().mockResolvedValue(null) },
      walletTransactionsHistory: {
        createManyAndReturn: jest.fn().mockResolvedValue([]),
      },
      ...overrides,
    };
  }

  let service: SessionCreateService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SessionCreateService(
      mockPrisma as never,
      accessService as never,
      rosterService as never,
      validationService as never,
      balanceService as never,
      ledgerService as never,
      snapshotService as never,
      scheduleRulesService as never,
      actionHistoryService as never,
    );
  });

  it('uses the current teacher actor when staff creates a session', async () => {
    accessService.resolveActor.mockResolvedValue({
      id: 'teacher-1',
      roles: [StaffRole.teacher],
    });
    rosterService.assertAttendanceStudentsBelongToClass.mockResolvedValue(
      new Map([['student-1', 150000]]),
    );
    mockPrisma.classTeacher.findUnique.mockResolvedValue({
      customAllowance: 120000,
    });

    const createSessionSpy = jest
      .spyOn(service, 'createSession')
      .mockResolvedValue({ id: 'session-1' } as never);

    await service.createSessionForStaff(
      'user-1',
      UserRole.staff,
      'class-1',
      {
        date: '2026-03-20',
        startTime: '19:00:00',
        endTime: '20:30:00',
        coefficient: 1.5,
        notes: 'Buổi thử',
        lessonContent: '<p>Đã làm 2 bài LEVEL 2</p>',
        homework: '<p>Làm bài 3</p>',
        tutorial: '<p>Hướng dẫn buổi</p>',
        attendance: [
          {
            studentId: 'student-1',
            status: AttendanceStatus.present,
          },
        ],
      },
      {
        userId: 'user-1',
        userEmail: 'teacher@example.com',
        roleType: 'staff',
      },
    );

    expect(accessService.assertTeacherAssignedToClass).toHaveBeenCalledWith(
      'teacher-1',
      'class-1',
    );
    expect(accessService.resolveSingleTeacherForClass).not.toHaveBeenCalled();
    expect(createSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        classId: 'class-1',
        teacherId: 'teacher-1',
        date: '2026-03-20',
        coefficient: 1.5,
        startTime: '19:00:00',
        endTime: '20:30:00',
        notes: 'Buổi thử',
        lessonContent: '<p>Đã làm 2 bài LEVEL 2</p>',
        homework: '<p>Làm bài 3</p>',
        tutorial: '<p>Hướng dẫn buổi</p>',
        attendance: [
          {
            studentId: 'student-1',
            status: AttendanceStatus.present,
            notes: null,
          },
        ],
      }),
      {
        userId: 'user-1',
        userEmail: 'teacher@example.com',
        roleType: 'staff',
      },
    );
    expect(createSessionSpy.mock.calls[0][0].allowanceAmount).toBeUndefined();
  });

  it('resolves the class teacher when admin creates a staff-ops session', async () => {
    accessService.resolveActor.mockResolvedValue({
      id: 'admin-1',
      roles: [],
    });
    accessService.resolveSingleTeacherForClass.mockResolvedValue('teacher-9');
    rosterService.assertAttendanceStudentsBelongToClass.mockResolvedValue(
      new Map([['student-1', 150000]]),
    );
    mockPrisma.classTeacher.findUnique.mockResolvedValue({
      customAllowance: null,
    });

    const createSessionSpy = jest
      .spyOn(service, 'createSession')
      .mockResolvedValue({ id: 'session-2' } as never);

    await service.createSessionForStaff(
      'user-1',
      UserRole.admin,
      'class-1',
      {
        date: '2026-03-20',
        startTime: '19:00:00',
        endTime: '20:30:00',
        lessonContent: '<p>Nội dung buổi</p>',
        homework: '<p>BTVN</p>',
        tutorial: '<p>Tutorial buổi</p>',
        attendance: [
          {
            studentId: 'student-1',
            status: AttendanceStatus.present,
          },
        ],
      },
      {
        userId: 'user-1',
        userEmail: 'admin@example.com',
        roleType: 'admin',
      },
    );

    expect(accessService.assertTeacherAssignedToClass).not.toHaveBeenCalled();
    expect(accessService.resolveSingleTeacherForClass).toHaveBeenCalledWith(
      'class-1',
    );
    expect(createSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        classId: 'class-1',
        teacherId: 'teacher-9',
        date: '2026-03-20',
        startTime: '19:00:00',
        endTime: '20:30:00',
        notes: null,
        lessonContent: '<p>Nội dung buổi</p>',
        homework: '<p>BTVN</p>',
        tutorial: '<p>Tutorial buổi</p>',
        attendance: [
          {
            studentId: 'student-1',
            status: AttendanceStatus.present,
            notes: null,
          },
        ],
      }),
      {
        userId: 'user-1',
        userEmail: 'admin@example.com',
        roleType: 'admin',
      },
    );
    expect(createSessionSpy.mock.calls[0][0].allowanceAmount).toBeUndefined();
  });

  it('allows creating session with >= 2 students without recordingUrl (recording is optional)', async () => {
    mockPrisma.$transaction.mockImplementation(async (callback: never) => {
      const tx = baseTx({
        classTeacher: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'ct-1',
            customAllowance: null,
            operatingDeductionRatePercent: 0,
            class: {
              allowancePerSessionPerStudent: 100000,
              scaleAmount: null,
              tuitionPackageTotal: 10,
              tuitionPackageSession: 10,
            },
          }),
        },
        customerCareService: { findMany: jest.fn().mockResolvedValue([]) },
        staffInfo: { findMany: jest.fn().mockResolvedValue([]) },
        studentClass: {
          findMany: jest.fn().mockResolvedValue([
            {
              studentId: 'student-1',
              customStudentTuitionPerSession: 100000,
              student: { accountBalance: 0 },
              class: {},
            },
            {
              studentId: 'student-2',
              customStudentTuitionPerSession: 100000,
              student: { accountBalance: 0 },
              class: {},
            },
          ]),
        },
        session: {
          create: jest.fn().mockResolvedValue({
            id: 'session-no-recording',
            attendance: [
              { id: 'att-1', studentId: 'student-1' },
              { id: 'att-2', studentId: 'student-2' },
            ],
          }),
        },
        classScheduleEntry: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      });
      return (callback as (tx: unknown) => Promise<unknown>)(tx);
    });
    scheduleRulesService.assertSessionMatchesDeclaredSchedule.mockResolvedValue(
      { makeupEventId: null },
    );
    validationService.parseSessionDate.mockReturnValue(new Date('2026-03-20'));
    validationService.parseSessionTime.mockImplementation(
      (time: string) =>
        new Date(`1970-01-01T${time.length === 5 ? `${time}:00` : time}Z`),
    );
    validationService.normalizeCoefficient.mockReturnValue(1);
    validationService.isTuitionChargeableStatus.mockReturnValue(true);
    validationService.resolveChargeableAttendanceTuitionFee.mockReturnValue(
      100000,
    );
    validationService.resolveDefaultStudentTuitionPerSession.mockReturnValue(
      100000,
    );

    const result = await service.createSession({
      classId: 'class-1',
      teacherId: 'teacher-1',
      date: '2026-03-20',
      startTime: '19:00:00',
      endTime: '20:30:00',
      lessonContent: '<p>Nội dung</p>',
      homework: '<p>BTVN</p>',
      tutorial: '<p>Tutorial</p>',
      attendance: [
        {
          studentId: 'student-1',
          status: AttendanceStatus.present,
          notes: null,
        },
        {
          studentId: 'student-2',
          status: AttendanceStatus.present,
          notes: null,
        },
      ],
    });

    expect(result.id).toBe('session-no-recording');
  });

  it('resolves retail attendance tuition with the same snapshot block count as teacher allowance', async () => {
    mockPrisma.$transaction.mockImplementation(async (callback: never) => {
      const tx = baseTx({
        classTeacher: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'ct-1',
            customAllowance: null,
            operatingDeductionRatePercent: 0,
            class: {
              name: 'Lớp 1',
              allowancePerSessionPerStudent: 100000,
              allowancePerBlockPerStudent: 33333,
              scaleAmount: null,
              trainingManagerStaffId: null,
              trainingManagerRatePercent: null,
            },
          }),
        },
        customerCareService: { findMany: jest.fn().mockResolvedValue([]) },
        staffInfo: { findMany: jest.fn().mockResolvedValue([]) },
        studentClass: {
          findMany: jest.fn().mockResolvedValue([
            {
              studentId: 'student-1',
              customStudentTuitionPerSession: null,
              customTuitionPerBlock: null,
              customTuitionPackageTotal: null,
              customTuitionPackageSession: null,
              student: { accountBalance: 0 },
              class: {
                studentTuitionPerSession: 180000,
                studentTuitionPerBlock: 60000,
                tuitionPackageTotal: null,
                tuitionPackageSession: null,
              },
            },
          ]),
        },
        session: {
          create: jest.fn().mockResolvedValue({
            id: 'session-block-tuition',
            attendance: [{ id: 'att-1', studentId: 'student-1' }],
          }),
        },
        classScheduleEntry: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      });
      return (callback as (tx: unknown) => Promise<unknown>)(tx);
    });
    scheduleRulesService.assertSessionMatchesDeclaredSchedule.mockResolvedValue(
      { makeupEventId: null },
    );
    validationService.parseSessionDate.mockReturnValue(new Date('2026-03-20'));
    validationService.parseSessionTime.mockImplementation(
      (time: string) =>
        new Date(`1970-01-01T${time.length === 5 ? `${time}:00` : time}Z`),
    );
    validationService.normalizeCoefficient.mockReturnValue(1);
    validationService.isTuitionChargeableStatus.mockReturnValue(true);
    validationService.resolveChargeableAttendanceTuitionFee.mockImplementation(
      (_status: unknown, override: unknown, defaultValue: number | null) =>
        defaultValue,
    );
    validationService.resolveDefaultStudentTuitionPerSession.mockReturnValue(
      240000,
    );

    await service.createSession({
      classId: 'class-1',
      teacherId: 'teacher-1',
      date: '2026-03-20',
      startTime: '19:00:00',
      endTime: '21:00:00',
      lessonContent: '<p>Nội dung</p>',
      homework: '<p>BTVN</p>',
      tutorial: '<p>Tutorial</p>',
      attendance: [
        {
          studentId: 'student-1',
          status: AttendanceStatus.present,
          notes: 'OK',
        },
      ],
    });

    expect(
      validationService.resolveDefaultStudentTuitionPerSession,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        classTuitionPerBlock: 60000,
        classTuitionPerSession: 180000,
        blockCount: 4,
      }),
    );
  });
});

describe('SessionCreateService time requirements', () => {
  const mockPrisma = {
    $transaction: jest.fn(),
  };
  const noop = {
    resolveActor: jest.fn(),
    assertTeacherAssignedToClass: jest.fn(),
    resolveSingleTeacherForClass: jest.fn(),
    assertAttendanceStudentsBelongToClass: jest.fn(),
    applyBalanceChanges: jest.fn(),
    buildChargeNote: jest.fn(),
    getSessionAuditSnapshot: jest.fn(),
    assertSessionMatchesDeclaredSchedule: jest.fn(),
    linkMakeupEventToSession: jest.fn(),
    recordCreate: jest.fn(),
  };

  function makeService() {
    return new SessionCreateService(
      mockPrisma as never,
      noop as never,
      noop as never,
      new SessionValidationService(),
      noop as never,
      noop as never,
      noop as never,
      noop as never,
      noop as never,
    );
  }

  const basePayload = {
    classId: 'class-1',
    teacherId: 'teacher-1',
    date: '2026-03-20',
    lessonContent: '<p>Nội dung</p>',
    homework: '<p>BTVN</p>',
    tutorial: '<p>Tutorial</p>',
    attendance: [
      {
        studentId: 'student-1',
        status: AttendanceStatus.present,
        notes: 'OK',
      },
    ],
  };

  it('rejects create when startTime is missing', async () => {
    const service = makeService();
    await expect(
      service.createSession({
        ...basePayload,
        startTime: '',
        endTime: '20:30:00',
      }),
    ).rejects.toThrow(new BadRequestException('Giờ bắt đầu là bắt buộc.'));
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects create when endTime is missing', async () => {
    const service = makeService();
    await expect(
      service.createSession({
        ...basePayload,
        startTime: '19:00:00',
        endTime: '',
      }),
    ).rejects.toThrow(new BadRequestException('Giờ kết thúc là bắt buộc.'));
  });

  it('rejects create when endTime is not after startTime', async () => {
    const service = makeService();
    await expect(
      service.createSession({
        ...basePayload,
        startTime: '19:00:00',
        endTime: '19:00:00',
      }),
    ).rejects.toThrow(
      new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu.'),
    );
  });
});
