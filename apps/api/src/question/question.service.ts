import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActionHistoryService } from '../action-history/action-history.service';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  QuestionFilterDto,
  QuestionTypeDto,
} from '../dtos/question.dto';

@Injectable()
export class QuestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistory: ActionHistoryService,
  ) {}

  async list(filter: QuestionFilterDto, skip = 0, take = 20) {
    const where: Prisma.QuestionWhereInput = {};
    if (filter.chapterId) where.chapterId = filter.chapterId;
    if (filter.difficultyLevelId)
      where.difficultyLevelId = filter.difficultyLevelId;
    if (filter.type) where.type = filter.type;
    if (filter.search) {
      where.content = { contains: filter.search, mode: 'insensitive' };
    }
    where.deletedAt = null;
    return this.prisma.question.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const q = await this.prisma.question.findUnique({ where: { id } });
    if (!q || q.deletedAt) throw new NotFoundException('Question not found');
    return q;
  }

  async create(
    dto: CreateQuestionDto,
    actor: { userId?: string; userEmail?: string },
  ) {
    if (dto.type === QuestionTypeDto.single_choice) {
      if (!dto.options || dto.options.length < 2 || dto.options.length > 6) {
        throw new BadRequestException('single_choice must have 2‑6 options');
      }
      if (dto.correctIndex === undefined || dto.correctIndex === null) {
        throw new BadRequestException('single_choice requires correctIndex');
      }
      if (dto.correctIndex < 0 || dto.correctIndex >= dto.options.length) {
        throw new BadRequestException('correctIndex out of bounds');
      }
    }
    if (dto.type === QuestionTypeDto.essay && dto.options) {
      throw new BadRequestException('essay type must not include options');
    }
    const created = await this.prisma.question.create({
      data: { ...dto },
    });
    await this.actionHistory.recordCreate(this.prisma as never, {
      entityType: 'question',
      entityId: created.id,
      actor,
      afterValue: created,
    });
    return created;
  }

  async update(
    id: string,
    dto: UpdateQuestionDto,
    actor: { userId?: string; userEmail?: string },
  ) {
    const existing = await this.prisma.question.findUnique({
      where: { id },
    });
    if (!existing || existing.deletedAt)
      throw new NotFoundException('Question not found');

    const effectiveType = existing.type;

    if (effectiveType === 'single_choice') {
      const options = (dto.options ?? existing.options) as string[] | null;
      const correctIdx = dto.correctIndex ?? existing.correctIndex;
      if (!options || options.length < 2 || options.length > 6) {
        throw new BadRequestException('single_choice must have 2‑6 options');
      }
      if (correctIdx === undefined || correctIdx === null) {
        throw new BadRequestException('single_choice requires correctIndex');
      }
      if (correctIdx < 0 || correctIdx >= options.length) {
        throw new BadRequestException('correctIndex out of bounds');
      }
    }
    if (effectiveType === 'essay' && (dto.options ?? existing.options)) {
      throw new BadRequestException('essay type cannot have options');
    }

    const before = existing;
    const updated = await this.prisma.question.update({
      where: { id },
      data: { ...dto },
    });
    await this.actionHistory.recordUpdate(this.prisma as never, {
      entityType: 'question',
      entityId: id,
      actor,
      beforeValue: before,
      afterValue: updated,
    });
    return updated;
  }

  async delete(id: string, actor: { userId?: string; userEmail?: string }) {
    const q = await this.prisma.question.findUnique({ where: { id } });
    if (!q || q.deletedAt) throw new NotFoundException('Question not found');

    const usage = await this.prisma.questionLink.findMany({
      where: { questionId: id },
    });
    if (usage.length) {
      const topicIds = usage.map((u) => u.topicId);
      throw new ConflictException({
        message: 'Question is used by practice topics',
        usedBy: topicIds,
      });
    }

    const updated = await this.prisma.question.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.actionHistory.recordDelete(this.prisma as never, {
      entityType: 'question',
      entityId: id,
      actor,
      beforeValue: q,
    });
    return updated;
  }
}
