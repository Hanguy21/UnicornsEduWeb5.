jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ActionHistoryService } from 'src/action-history/action-history.service';
import { QuestionService } from './question.service';
import { QuestionTypeDto } from 'src/dtos/question.dto';

describe('QuestionService', () => {
  let service: QuestionService;
  const mockPrisma = {
    question: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    questionLink: {
      findMany: jest.fn(),
    },
  };
  const mockActionHistory = {
    recordCreate: jest.fn(),
    recordUpdate: jest.fn(),
    recordDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QuestionService(
      mockPrisma as never,
      mockActionHistory as unknown as ActionHistoryService,
    );
  });

  const actor = { userId: 'u1', userEmail: 'test@example.com' };

  describe('list', () => {
    it('returns questions with default pagination', async () => {
      mockPrisma.question.findMany.mockResolvedValue([]);
      const result = await service.list({});
      expect(mockPrisma.question.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([]);
    });

    it('applies chapterId filter', async () => {
      mockPrisma.question.findMany.mockResolvedValue([]);
      await service.list({ chapterId: 'ch1' });
      expect(mockPrisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ chapterId: 'ch1' }),
        }),
      );
    });

    it('applies search filter', async () => {
      mockPrisma.question.findMany.mockResolvedValue([]);
      await service.list({ search: 'math' });
      expect(mockPrisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            content: { contains: 'math', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  describe('get', () => {
    it('returns question by id', async () => {
      const q = { id: 'q1', deletedAt: null };
      mockPrisma.question.findUnique.mockResolvedValue(q);
      const result = await service.get('q1');
      expect(result).toEqual(q);
    });

    it('throws NotFoundException for missing question', async () => {
      mockPrisma.question.findUnique.mockResolvedValue(null);
      await expect(service.get('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException for soft-deleted question', async () => {
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 'q1',
        deletedAt: new Date(),
      });
      await expect(service.get('q1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const baseDto = {
      courseId: 'c1',
      chapterId: 'ch1',
      difficultyLevelId: 'd1',
      content: '<p>Test?</p>',
    };

    it('creates a single_choice question', async () => {
      const dto = {
        ...baseDto,
        type: QuestionTypeDto.single_choice,
        options: ['A', 'B'],
        correctIndex: 0,
      };
      mockPrisma.question.create.mockResolvedValue({ id: 'q1', ...dto });
      const result = await service.create(dto, actor);
      expect(mockPrisma.question.create).toHaveBeenCalled();
      expect(mockActionHistory.recordCreate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ entityType: 'question', entityId: 'q1' }),
      );
      expect(result.id).toBe('q1');
    });

    it('creates an essay question', async () => {
      const dto = {
        ...baseDto,
        type: QuestionTypeDto.essay,
      };
      mockPrisma.question.create.mockResolvedValue({ id: 'q2', ...dto });
      await service.create(dto, actor);
      expect(mockActionHistory.recordCreate).toHaveBeenCalled();
    });

    it('rejects single_choice with < 2 options', async () => {
      const dto = {
        ...baseDto,
        type: QuestionTypeDto.single_choice,
        options: ['A'],
        correctIndex: 0,
      };
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects single_choice with > 6 options', async () => {
      const dto = {
        ...baseDto,
        type: QuestionTypeDto.single_choice,
        options: ['1', '2', '3', '4', '5', '6', '7'],
        correctIndex: 0,
      };
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects single_choice with out-of-bounds correctIndex', async () => {
      const dto = {
        ...baseDto,
        type: QuestionTypeDto.single_choice,
        options: ['A', 'B'],
        correctIndex: 5,
      };
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects single_choice without correctIndex', async () => {
      const dto = {
        ...baseDto,
        type: QuestionTypeDto.single_choice,
        options: ['A', 'B'],
      };
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects essay with options', async () => {
      const dto = {
        ...baseDto,
        type: QuestionTypeDto.essay,
        options: ['A', 'B'],
      };
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('updates an existing question', async () => {
      const existing = {
        id: 'q1',
        type: QuestionTypeDto.single_choice,
        options: ['A', 'B'],
        correctIndex: 0,
        deletedAt: null,
      };
      mockPrisma.question.findUnique.mockResolvedValue(existing);
      mockPrisma.question.update.mockResolvedValue({
        ...existing,
        content: 'updated',
      });

      await service.update('q1', { content: 'updated' }, actor);
      expect(mockPrisma.question.update).toHaveBeenCalled();
      expect(mockActionHistory.recordUpdate).toHaveBeenCalled();
    });

    it('throws NotFoundException for missing question', async () => {
      mockPrisma.question.findUnique.mockResolvedValue(null);
      await expect(
        service.update('nonexistent', {}, actor),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for soft-deleted question', async () => {
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 'q1',
        deletedAt: new Date(),
      });
      await expect(service.update('q1', {}, actor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('validates options count on update for single_choice', async () => {
      const existing = {
        id: 'q1',
        type: QuestionTypeDto.single_choice,
        options: ['A', 'B'],
        correctIndex: 0,
        deletedAt: null,
      };
      mockPrisma.question.findUnique.mockResolvedValue(existing);

      await expect(
        service.update('q1', { options: ['only-one'] }, actor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('soft-deletes a question', async () => {
      const q = { id: 'q1', deletedAt: null };
      mockPrisma.question.findUnique.mockResolvedValue(q);
      mockPrisma.questionLink.findMany.mockResolvedValue([]);
      mockPrisma.question.update.mockResolvedValue({
        ...q,
        deletedAt: new Date(),
      });

      await service.delete('q1', actor);
      expect(mockPrisma.question.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(mockActionHistory.recordDelete).toHaveBeenCalled();
    });

    it('throws NotFoundException for missing question', async () => {
      mockPrisma.question.findUnique.mockResolvedValue(null);
      await expect(service.delete('nonexistent', actor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when question is linked to topics', async () => {
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 'q1',
        deletedAt: null,
      });
      mockPrisma.questionLink.findMany.mockResolvedValue([
        { topicId: 't1', questionId: 'q1' },
      ]);

      await expect(service.delete('q1', actor)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.question.update).not.toHaveBeenCalled();
    });
  });
});
