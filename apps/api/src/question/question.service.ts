import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto, UpdateQuestionDto, QuestionFilterDto } from '../dtos/question.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  /** List questions with optional filters and pagination */
  async list(filter: QuestionFilterDto, skip = 0, take = 20) {
    const where: Prisma.QuestionWhereInput = {};
    if (filter.chapterId) where.chapterId = filter.chapterId;
    if (filter.difficultyLevelId) where.difficultyLevelId = filter.difficultyLevelId;
    if (filter.type) where.type = filter.type;
    if (filter.search) {
      // naive full‑text search via contains (case‑insensitive)
      where.content = { contains: filter.search, mode: 'insensitive' } as any;
    }
    // exclude soft‑deleted
    where.deletedAt = null;
    return this.prisma.question.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const q = await this.prisma.question.findUnique({ where: { id } });
    if (!q || q.deletedAt) throw new NotFoundException('Question not found');
    return q;
  }

  async create(dto: CreateQuestionDto) {
    // Validate single_choice constraints
    if (dto.type === 'single_choice') {
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
    // For essay, options must be absent
    if (dto.type === 'essay' && dto.options) {
      throw new BadRequestException('essay type must not include options');
    }
    return this.prisma.question.create({ data: { ...dto } });
  }

  async update(id: string, dto: UpdateQuestionDto) {
    const existing = await this.prisma.question.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Question not found');
    // If type changes to single_choice, enforce constraints
    const type = dto.type ?? existing.type;
    if (type === 'single_choice') {
      const options = dto.options ?? existing.options as any;
      const correctIdx = dto.correctIndex ?? existing.correctIndex;
      if (!options || (options as any).length < 2 || (options as any).length > 6) {
        throw new BadRequestException('single_choice must have 2‑6 options');
      }
      if (correctIdx === undefined || correctIdx === null) {
        throw new BadRequestException('single_choice requires correctIndex');
      }
      if (correctIdx < 0 || correctIdx >= (options as any).length) {
        throw new BadRequestException('correctIndex out of bounds');
      }
    }
    // If type is essay, ensure no options
    if (type === 'essay' && (dto.options ?? existing.options)) {
      throw new BadRequestException('essay type cannot have options');
    }
    return this.prisma.question.update({ where: { id }, data: { ...dto } });
  }

  /** Soft delete – unless forced and no usage */
  async delete(id: string, force = false) {
    const q = await this.prisma.question.findUnique({ where: { id } });
    if (!q || q.deletedAt) throw new NotFoundException('Question not found');
    // Check usage via QuestionLink
    const usage = await this.prisma.questionLink.findMany({ where: { questionId: id } });
    if (usage.length && !force) {
      const topicIds = usage.map(u => u.topicId);
      throw new ConflictException({ message: 'Question is used by practice topics', usedBy: topicIds });
    }
    // Soft delete – set deletedAt
    return this.prisma.question.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
