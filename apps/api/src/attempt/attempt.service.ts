import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { AttemptStatus, QuestionType } from 'generated/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { TopicService } from 'src/topic/topic.service';
import type {
  AssignmentLobbyDto,
  AttemptDetailDto,
  AttemptQuestionDto,
  SaveAttemptAnswerItemDto,
} from 'src/dtos/attempt.dto';

type AttemptWithAnswers = Prisma.AttemptGetPayload<{
  include: {
    assignment: { include: { topic: true } };
    answers: { include: { question: true }; orderBy: { order: 'asc' } };
  };
}>;

@Injectable()
export class AttemptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly topicService: TopicService,
  ) {}

  async getLobby(
    classId: string,
    assignmentId: string,
    studentId: string,
  ): Promise<AssignmentLobbyDto> {
    const item = await this.topicService.getPracticeAssignmentForStudent(
      classId,
      assignmentId,
      studentId,
    );
    const attempts = await this.prisma.attempt.findMany({
      where: { assignmentId, studentId },
      orderBy: { startedAt: 'desc' },
    });
    return {
      assignmentId: item.id,
      classId,
      topicId: item.topicId ?? '',
      title: item.topic!.title,
      durationMinutes: item.durationMinutes as number,
      openAt: item.openAt,
      attempts: attempts.map((a) => ({
        id: a.id,
        status: a.status,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        autoGradedScore: a.autoGradedScore,
        autoGradedMax: a.autoGradedMax,
        hasUngradedEssay: a.hasUngradedEssay,
      })),
    };
  }

  async start(
    classId: string,
    assignmentId: string,
    studentId: string,
  ): Promise<AttemptDetailDto> {
    const item = await this.topicService.getPracticeAssignmentForStudent(
      classId,
      assignmentId,
      studentId,
    );

    const existing = await this.prisma.attempt.findFirst({
      where: { assignmentId, studentId, status: AttemptStatus.in_progress },
      include: this.attemptInclude(),
    });
    if (existing) {
      return this.finalizeIfExpired(existing);
    }

    const topicId = item.topicId;
    if (!topicId) {
      throw new BadRequestException('Assignment has no topic');
    }
    const links = await this.prisma.questionLink.findMany({
      where: { topicId, question: { deletedAt: null } },
      include: { question: true },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const startedAt = new Date();
    try {
      const created = await this.prisma.attempt.create({
        data: {
          assignmentId: item.id,
          studentId,
          startedAt,
          durationMinutes: item.durationMinutes as number,
          status: AttemptStatus.in_progress,
          answers: {
            create: links.map((link, index) => ({
              questionId: link.questionId,
              order: link.order ?? index,
              pointsPossible: link.points ?? 1,
            })),
          },
        },
        include: this.attemptInclude(),
      });
      return this.toDetail(created, false);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const raced = await this.prisma.attempt.findFirst({
          where: {
            assignmentId,
            studentId,
            status: AttemptStatus.in_progress,
          },
          include: this.attemptInclude(),
        });
        if (raced) return this.finalizeIfExpired(raced);
      }
      throw err;
    }
  }

  async get(
    classId: string,
    attemptId: string,
    studentId: string,
  ): Promise<AttemptDetailDto> {
    const attempt = await this.loadOwned(classId, attemptId, studentId);
    return this.finalizeIfExpired(attempt);
  }

  async saveAnswers(
    classId: string,
    attemptId: string,
    studentId: string,
    answers: SaveAttemptAnswerItemDto[],
  ): Promise<AttemptDetailDto> {
    const row = await this.loadOwned(classId, attemptId, studentId);
    if (row.status === AttemptStatus.in_progress) {
      const allowed = new Set(row.answers.map((a) => a.questionId));
      const ops = answers
        .filter((item) => allowed.has(item.questionId))
        .map((item) =>
          this.prisma.attemptAnswer.update({
            where: {
              attemptId_questionId: {
                attemptId,
                questionId: item.questionId,
              },
            },
            data: {
              ...(item.choiceIndex !== undefined
                ? { choiceIndex: item.choiceIndex }
                : {}),
              ...(item.essayAnswer !== undefined
                ? { essayAnswer: item.essayAnswer }
                : {}),
            },
          }),
        );
      if (ops.length > 0) {
        await this.prisma.$transaction(ops);
      }
    }

    return this.get(classId, attemptId, studentId);
  }

  async submit(
    classId: string,
    attemptId: string,
    studentId: string,
  ): Promise<AttemptDetailDto> {
    const attempt = await this.loadOwned(classId, attemptId, studentId);
    if (attempt.status !== AttemptStatus.in_progress) {
      return this.toDetail(attempt, true);
    }
    const expired = this.isExpired(attempt);
    return this.gradeAndClose(
      attempt,
      expired ? AttemptStatus.timed_out : AttemptStatus.submitted,
    );
  }

  private async finalizeIfExpired(
    attempt: AttemptWithAnswers,
  ): Promise<AttemptDetailDto> {
    if (attempt.status !== AttemptStatus.in_progress) {
      return this.toDetail(attempt, true);
    }
    if (!this.isExpired(attempt)) {
      return this.toDetail(attempt, false);
    }
    return this.gradeAndClose(attempt, AttemptStatus.timed_out);
  }

  private isExpired(attempt: {
    startedAt: Date;
    durationMinutes: number;
  }): boolean {
    return Date.now() >= this.endsAt(attempt).getTime();
  }

  private endsAt(attempt: { startedAt: Date; durationMinutes: number }): Date {
    return new Date(
      attempt.startedAt.getTime() + attempt.durationMinutes * 60_000,
    );
  }

  private async gradeAndClose(
    attempt: AttemptWithAnswers,
    status: AttemptStatus,
  ): Promise<AttemptDetailDto> {
    let autoGradedScore = 0;
    let autoGradedMax = 0;
    let hasUngradedEssay = false;

    const updates = attempt.answers.map((ans) => {
      const type = ans.question.type;
      if (type === QuestionType.essay) {
        hasUngradedEssay = true;
        return this.prisma.attemptAnswer.update({
          where: { id: ans.id },
          data: { isCorrect: null, pointsAwarded: null },
        });
      }
      const max = ans.pointsPossible;
      autoGradedMax += max;
      const isCorrect =
        ans.choiceIndex != null &&
        ans.choiceIndex === ans.question.correctIndex;
      const pointsAwarded = isCorrect ? max : 0;
      autoGradedScore += pointsAwarded;
      return this.prisma.attemptAnswer.update({
        where: { id: ans.id },
        data: { isCorrect, pointsAwarded },
      });
    });

    await this.prisma.$transaction([
      ...updates,
      this.prisma.attempt.update({
        where: { id: attempt.id },
        data: {
          status,
          submittedAt: new Date(),
          autoGradedScore,
          autoGradedMax,
          hasUngradedEssay,
        },
      }),
    ]);

    const fresh = await this.prisma.attempt.findUniqueOrThrow({
      where: { id: attempt.id },
      include: this.attemptInclude(),
    });
    return this.toDetail(fresh, true);
  }

  private async loadOwned(
    classId: string,
    attemptId: string,
    studentId: string,
  ): Promise<AttemptWithAnswers> {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: this.attemptInclude(),
    });
    if (!attempt || attempt.studentId !== studentId) {
      throw new NotFoundException('Attempt not found');
    }
    if (attempt.assignment.classId !== classId) {
      throw new NotFoundException('Attempt not found');
    }
    await this.topicService.getPracticeAssignmentForStudent(
      classId,
      attempt.assignmentId,
      studentId,
    );
    return attempt;
  }

  private attemptInclude() {
    return {
      assignment: { include: { topic: true } },
      answers: {
        include: { question: true },
        orderBy: { order: 'asc' as const },
      },
    };
  }

  private toDetail(
    attempt: AttemptWithAnswers,
    reveal: boolean,
  ): AttemptDetailDto {
    const endsAt = this.endsAt(attempt);
    const remainingMs = Math.max(0, endsAt.getTime() - Date.now());
    const questions: AttemptQuestionDto[] = attempt.answers.map((ans) => {
      const q = ans.question;
      const base: AttemptQuestionDto = {
        questionId: q.id,
        order: ans.order,
        pointsPossible: ans.pointsPossible,
        type: q.type,
        content: q.content,
        options: Array.isArray(q.options) ? (q.options as string[]) : null,
        choiceIndex: ans.choiceIndex,
        essayAnswer: ans.essayAnswer,
      };
      if (reveal) {
        base.correctIndex = q.correctIndex;
        base.isCorrect = ans.isCorrect;
        base.pointsAwarded = ans.pointsAwarded;
        base.explanation = q.explanation;
        base.answerGuide = q.answerGuide;
      }
      return base;
    });

    return {
      id: attempt.id,
      assignmentId: attempt.assignmentId,
      classId: attempt.assignment.classId,
      title: attempt.assignment.topic?.title ?? '',
      status: attempt.status,
      startedAt: attempt.startedAt,
      durationMinutes: attempt.durationMinutes,
      endsAt,
      remainingMs,
      submittedAt: attempt.submittedAt,
      autoGradedScore: attempt.autoGradedScore,
      autoGradedMax: attempt.autoGradedMax,
      hasUngradedEssay: attempt.hasUngradedEssay,
      questions,
    };
  }
}
