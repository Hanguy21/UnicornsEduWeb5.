/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));
jest.mock('../../generated/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
      }
    },
  },
}));
jest.mock('../topic/topic.service', () => ({
  TopicService: class TopicServiceMock {},
}));

import { AttemptService } from './attempt.service';
import { AttemptStatus, QuestionType } from 'generated/enums';

describe('AttemptService', () => {
  let service: AttemptService;
  let prisma: Record<string, any>;
  let topicService: { getPracticeAssignmentForStudent: jest.Mock };

  const assignment = {
    id: 'cci-1',
    classId: 'cls-1',
    topicId: 'topic-1',
    durationMinutes: 10,
    openAt: new Date(Date.now() - 1000),
    topic: { id: 'topic-1', kind: 'practice', title: 'Đề A' },
  };

  function makeAttempt(over: Record<string, unknown> = {}) {
    return {
      id: 'att-1',
      assignmentId: 'cci-1',
      studentId: 'stu-1',
      startedAt: new Date(Date.now() - 1000),
      durationMinutes: 10,
      submittedAt: null,
      status: AttemptStatus.in_progress,
      autoGradedScore: null,
      autoGradedMax: null,
      hasUngradedEssay: false,
      assignment,
      answers: [
        {
          id: 'ans-1',
          attemptId: 'att-1',
          questionId: 'q-mcq',
          order: 0,
          pointsPossible: 2,
          choiceIndex: 1,
          essayAnswer: null,
          isCorrect: null,
          pointsAwarded: null,
          question: {
            id: 'q-mcq',
            type: QuestionType.single_choice,
            content: '2+2?',
            options: ['1', '4', '3'],
            correctIndex: 1,
            explanation: 'four',
            answerGuide: null,
          },
        },
        {
          id: 'ans-2',
          attemptId: 'att-1',
          questionId: 'q-essay',
          order: 1,
          pointsPossible: 5,
          choiceIndex: null,
          essayAnswer: 'because',
          isCorrect: null,
          pointsAwarded: null,
          question: {
            id: 'q-essay',
            type: QuestionType.essay,
            content: 'Why?',
            options: null,
            correctIndex: null,
            explanation: null,
            answerGuide: 'guide',
          },
        },
      ],
      ...over,
    };
  }

  beforeEach(() => {
    prisma = {
      attempt: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      attemptAnswer: { update: jest.fn().mockResolvedValue({}) },
      questionLink: { findMany: jest.fn() },
      $transaction: jest.fn(async (ops: unknown) => {
        if (Array.isArray(ops)) return Promise.all(ops);
        return ops;
      }),
    };
    topicService = {
      getPracticeAssignmentForStudent: jest.fn().mockResolvedValue(assignment),
    };
    service = new AttemptService(prisma as never, topicService as never);
  });

  it('start resumes in_progress instead of creating another', async () => {
    const existing = makeAttempt();
    prisma.attempt.findFirst.mockResolvedValue(existing);
    const result = await service.start('cls-1', 'cci-1', 'stu-1');
    expect(prisma.attempt.create).not.toHaveBeenCalled();
    expect(result.id).toBe('att-1');
    expect(result.status).toBe(AttemptStatus.in_progress);
    expect(result.questions[0].correctIndex).toBeUndefined();
  });

  it('start creates a new attempt linked to assignmentId', async () => {
    prisma.attempt.findFirst.mockResolvedValue(null);
    prisma.questionLink.findMany.mockResolvedValue([
      {
        questionId: 'q-mcq',
        order: 0,
        points: 2,
        question: { deletedAt: null },
      },
    ]);
    const created = makeAttempt({ answers: [makeAttempt().answers[0]] });
    prisma.attempt.create.mockResolvedValue(created);

    const result = await service.start('cls-1', 'cci-1', 'stu-1');
    expect(prisma.attempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignmentId: 'cci-1',
          studentId: 'stu-1',
          durationMinutes: 10,
        }),
      }),
    );
    expect(result.assignmentId).toBe('cci-1');
  });

  it('submit grades MCQ and leaves essay ungraded without cancelling', async () => {
    const row = makeAttempt();
    prisma.attempt.findUnique.mockResolvedValue(row);
    const closed = makeAttempt({
      status: AttemptStatus.submitted,
      submittedAt: new Date(),
      autoGradedScore: 2,
      autoGradedMax: 2,
      hasUngradedEssay: true,
      answers: [
        { ...row.answers[0], isCorrect: true, pointsAwarded: 2 },
        { ...row.answers[1], isCorrect: null, pointsAwarded: null },
      ],
    });
    prisma.attempt.findUniqueOrThrow.mockResolvedValue(closed);

    const result = await service.submit('cls-1', 'att-1', 'stu-1');
    expect(result.status).toBe(AttemptStatus.submitted);
    expect(prisma.attempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: AttemptStatus.submitted,
          autoGradedScore: 2,
          autoGradedMax: 2,
          hasUngradedEssay: true,
        }),
      }),
    );
    expect(result.questions[0].correctIndex).toBe(1);
  });

  it('GET after duration expires times out and still grades', async () => {
    const row = makeAttempt({
      startedAt: new Date(Date.now() - 20 * 60 * 1000),
      durationMinutes: 10,
    });
    prisma.attempt.findUnique.mockResolvedValue(row);
    const closed = makeAttempt({
      status: AttemptStatus.timed_out,
      submittedAt: new Date(),
      autoGradedScore: 2,
      autoGradedMax: 2,
      hasUngradedEssay: true,
    });
    prisma.attempt.findUniqueOrThrow.mockResolvedValue(closed);

    const result = await service.get('cls-1', 'att-1', 'stu-1');
    expect(prisma.attempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: AttemptStatus.timed_out }),
      }),
    );
    expect(result.status).toBe(AttemptStatus.timed_out);
  });

  it('lobby delegates openAt/expiry to TopicService', async () => {
    prisma.attempt.findMany.mockResolvedValue([]);
    await service.getLobby('cls-1', 'cci-1', 'stu-1');
    expect(topicService.getPracticeAssignmentForStudent).toHaveBeenCalledWith(
      'cls-1',
      'cci-1',
      'stu-1',
    );
  });
});
