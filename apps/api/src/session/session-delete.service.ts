import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WalletTransactionType } from '../../generated/enums';
import {
  ActionHistoryActor,
  ActionHistoryService,
} from '../action-history/action-history.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionLedgerService } from './session-ledger.service';
import { SessionSnapshotService } from './session-snapshot.service';
import { SessionStudentBalanceService } from './session-student-balance.service';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';

@Injectable()
export class SessionDeleteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionStudentBalanceService: SessionStudentBalanceService,
    private readonly sessionLedgerService: SessionLedgerService,
    private readonly sessionSnapshotService: SessionSnapshotService,
    private readonly actionHistoryService: ActionHistoryService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  private readonly logger = new Logger(SessionDeleteService.name);

  async deleteSession(id: string, actor?: ActionHistoryActor) {
    let eventIdToDelete: string | null = null;

    const deletedSession = await this.prisma.$transaction(async (tx) => {
      const existingSession = await tx.session.findUnique({
        where: { id },
        include: {
          class: { select: { name: true } },
          attendance: {
            include: {
              student: { select: { accountBalance: true } },
              transaction: true,
            },
          },
        },
      });

      if (!existingSession) {
        throw new NotFoundException('Session not found');
      }

      // Capture eventId for calendar deletion after commit
      eventIdToDelete = existingSession.googleCalendarEventId;

      const beforeValue = actor
        ? await this.sessionSnapshotService.getSessionAuditSnapshot(tx, id)
        : null;

      const sessionDateLabel = existingSession.date.toISOString().slice(0, 10);
      const studentBalanceChanges = Array.from(
        existingSession.attendance
          .reduce((acc, attendanceItem) => {
            const changeAmount =
              this.sessionLedgerService.getAttendanceChargeAmount(
                attendanceItem,
              );

            if (changeAmount <= 0) {
              return acc;
            }

            const currentItem = acc.get(attendanceItem.studentId);
            acc.set(attendanceItem.studentId, {
              studentId: attendanceItem.studentId,
              change: (currentItem?.change ?? 0) + changeAmount,
              accountBalance:
                currentItem?.accountBalance ??
                attendanceItem.student.accountBalance ??
                0,
            });
            return acc;
          }, new Map<string, { studentId: string; change: number; accountBalance: number }>())
          .values(),
      );

      await this.sessionStudentBalanceService.applyBalanceChanges(
        tx,
        studentBalanceChanges.map((balanceChange) => ({
          studentId: balanceChange.studentId,
          change: balanceChange.change,
        })),
      );

      if (studentBalanceChanges.length > 0) {
        await tx.walletTransactionsHistory.createMany({
          data: studentBalanceChanges.map((balanceChange) => ({
            studentId: balanceChange.studentId,
            type: WalletTransactionType.topup,
            amount: balanceChange.change,
            note: this.sessionLedgerService.buildRefundNote({
              className: existingSession.class.name,
              dateLabel: sessionDateLabel,
              balanceBefore: balanceChange.accountBalance,
              amount: balanceChange.change,
            }),
          })),
        });
      }

      const deletedSession = await tx.session.delete({
        where: { id },
      });

      if (actor && beforeValue) {
        await this.actionHistoryService.recordDelete(tx, {
          actor,
          entityType: 'session',
          entityId: id,
          description: 'Xóa buổi học',
          beforeValue,
        });
      }

      return deletedSession;
    });

    // Attempt to delete the Google Calendar event after successful DB deletion
    if (eventIdToDelete) {
      try {
        await this.googleCalendarService.deleteCalendarEvent(eventIdToDelete);
      } catch (err) {
        this.logger.error(`Failed to delete Google Calendar event ${eventIdToDelete} for session ${id}:`, err);
      }
    }

    return deletedSession;
  }
}
