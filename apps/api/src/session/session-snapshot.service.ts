import { Injectable } from '@nestjs/common';

interface SessionSnapshotReader {
  session: {
    findUnique(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
  };
}

const sessionAuditSnapshotInclude = {
  class: true,
  teacher: true,
  attendance: {
    include: {
      student: true,
      transaction: true,
      customerCareStaff: true,
    },
    orderBy: [{ createdAt: 'asc' }, { studentId: 'asc' }],
  },
};

@Injectable()
export class SessionSnapshotService {
  async getSessionAuditSnapshot(db: SessionSnapshotReader, sessionId: string) {
    return db.session.findUnique({
      where: { id: sessionId },
      include: sessionAuditSnapshotInclude,
    });
  }

  async getSessionAuditSnapshots(
    db: SessionSnapshotReader,
    sessionIds: string[],
  ): Promise<Map<string, unknown>> {
    const uniqueSessionIds = Array.from(
      new Set(
        sessionIds.filter(
          (sessionId): sessionId is string =>
            typeof sessionId === 'string' && sessionId.trim().length > 0,
        ),
      ),
    );

    if (uniqueSessionIds.length === 0) {
      return new Map();
    }

    const snapshots = (await db.session.findMany({
      where: {
        id: {
          in: uniqueSessionIds,
        },
      },
      include: sessionAuditSnapshotInclude,
    })) as Array<{ id: string }>;

    return new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
  }
}
