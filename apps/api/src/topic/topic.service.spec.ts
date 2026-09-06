/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

jest.mock('../../generated/client', () => ({}));

jest.mock('../action-history/action-history.service', () => ({
  ActionHistoryService: class ActionHistoryServiceMock {},
}));

import { TopicService } from './topic.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from 'generated/enums';

describe('TopicService — ClassContent methods', () => {
  let service: TopicService;
  let mockPrisma: Record<string, any>;

  const adminActor = {
    userId: 'user-admin-1',
    userEmail: 'admin@test.com',
    roleType: UserRole.admin,
  };

  beforeEach(() => {
    mockPrisma = {
      class: { findUnique: jest.fn() },
      staffInfo: { findFirst: jest.fn() },
      classTeacher: { findFirst: jest.fn() },
      studentClass: { findFirst: jest.fn() },
      topic: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      classContentItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(
        (fnOrArray: ((tx: any) => Promise<any>) | any[]) => {
          if (typeof fnOrArray === 'function') return fnOrArray(mockPrisma);
          return Promise.all(fnOrArray);
        },
      ),
    };

    service = new TopicService(mockPrisma as any, {} as any);
  });

  // ─── createClassContentItem ───

  describe('createClassContentItem', () => {
    it('should create a new topic for class when no topicId provided', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.classContentItem.aggregate.mockResolvedValue({
        _max: { sortOrder: 1 },
      });
      mockPrisma.topic.create.mockResolvedValue({
        id: 'topic-new',
        kind: 'theory',
        classId: 'cls-1',
        title: 'New topic',
      });
      mockPrisma.classContentItem.create.mockResolvedValue({
        id: 'cci-1',
        topicId: 'topic-new',
        kind: 'topic',
        sortOrder: 2,
        classId: 'cls-1',
        topic: {
          title: 'New topic',
          kind: 'theory',
          classId: 'cls-1',
          chapter: null,
          lectures: [],
        },
      });

      const result = await service.createClassContentItem(
        'cls-1',
        { title: 'New topic', kind: 'theory' as any },
        adminActor,
      );

      expect(result.title).toBe('New topic');
      expect(result.source).toBe('class');
      expect(mockPrisma.topic.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            classId: 'cls-1',
            title: 'New topic',
          }),
        }),
      );
      expect(mockPrisma.classContentItem.create).toHaveBeenCalled();
    });

    it('should add an existing topic to class content', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.topic.findUnique.mockResolvedValue({
        id: 'topic-existing',
        title: 'Existing topic',
        kind: 'practice',
        courseId: 'course-1',
        classId: null,
      });
      mockPrisma.classContentItem.findUnique.mockResolvedValue(null);
      mockPrisma.classContentItem.aggregate.mockResolvedValue({
        _max: { sortOrder: 5 },
      });
      mockPrisma.classContentItem.create.mockResolvedValue({
        id: 'cci-2',
        topicId: 'topic-existing',
        kind: 'topic',
        sortOrder: 6,
        classId: 'cls-1',
        topic: {
          title: 'Existing topic',
          kind: 'practice',
          classId: null,
          chapter: { title: 'Ch 1' },
          lectures: [{ id: 'l1' }, { id: 'l2' }],
        },
      });

      const result = await service.createClassContentItem(
        'cls-1',
        { topicId: 'topic-existing' },
        adminActor,
      );

      expect(result.title).toBe('Existing topic');
      expect(result.source).toBe('course');
      expect(result.chapterTitle).toBe('Ch 1');
      expect(result.lectureCount).toBe(2);
    });

    it('should throw if topicId already in class content', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.topic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.classContentItem.findUnique.mockResolvedValue({
        id: 'existing',
      });

      await expect(
        service.createClassContentItem(
          'cls-1',
          { topicId: 'topic-1' },
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if title missing when creating new topic', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });

      await expect(
        service.createClassContentItem('cls-1', { title: '  ' }, adminActor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── listClassContentItems ───

  describe('listClassContentItems', () => {
    it('should return mapped DTOs', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.classContentItem.findMany.mockResolvedValue([
        {
          id: 'cci-1',
          topicId: 't1',
          kind: 'topic',
          sortOrder: 0,
          classId: 'cls-1',
          topic: {
            title: 'Topic A',
            kind: 'theory',
            classId: 'cls-1',
            chapter: null,
            lectures: [],
          },
        },
        {
          id: 'cci-2',
          topicId: 't2',
          kind: 'topic',
          sortOrder: 1,
          classId: 'cls-1',
          topic: {
            title: 'Topic B',
            kind: 'practice',
            classId: 'course-1',
            chapter: { title: 'Ch 2' },
            lectures: [{}],
          },
        },
      ]);

      const result = await service.listClassContentItems('cls-1', adminActor);

      expect(result).toHaveLength(2);
      expect(result[0].source).toBe('class');
      expect(result[0].kindLabel).toBe('Lý thuyết');
      expect(result[1].source).toBe('course');
      expect(result[1].kindLabel).toBe('Luyện tập');
      expect(result[1].chapterTitle).toBe('Ch 2');
      expect(result[1].lectureCount).toBe(1);
    });
  });

  // ─── reorderClassContentItems ───

  describe('reorderClassContentItems', () => {
    it('should reject if any ID does not belong to class', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.classContentItem.findMany.mockResolvedValue([{ id: 'cci-1' }]);

      await expect(
        service.reorderClassContentItems(
          'cls-1',
          ['cci-1', 'cci-foreign'],
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update sortOrder for all owned IDs', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.classContentItem.findMany
        .mockResolvedValueOnce([{ id: 'cci-1' }, { id: 'cci-2' }])
        .mockResolvedValueOnce([
          {
            id: 'cci-1',
            topicId: 't1',
            kind: 'topic',
            sortOrder: 0,
            classId: 'cls-1',
            topic: {
              title: 'A',
              kind: 'theory',
              classId: 'cls-1',
              chapter: null,
              lectures: [],
            },
          },
          {
            id: 'cci-2',
            topicId: 't2',
            kind: 'topic',
            sortOrder: 1,
            classId: 'cls-1',
            topic: {
              title: 'B',
              kind: 'theory',
              classId: 'cls-1',
              chapter: null,
              lectures: [],
            },
          },
        ]);
      mockPrisma.classContentItem.update.mockResolvedValue({});

      await service.reorderClassContentItems(
        'cls-1',
        ['cci-2', 'cci-1'],
        adminActor,
      );

      expect(mockPrisma.classContentItem.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.classContentItem.update).toHaveBeenCalledWith({
        where: { id: 'cci-2' },
        data: { sortOrder: 0 },
      });
      expect(mockPrisma.classContentItem.update).toHaveBeenCalledWith({
        where: { id: 'cci-1' },
        data: { sortOrder: 1 },
      });
    });
  });

  // ─── deleteClassContentItem ───

  describe('deleteClassContentItem', () => {
    it('should delete class content item and class-owned topic', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.classContentItem.findUnique.mockResolvedValue({
        id: 'cci-1',
        classId: 'cls-1',
        topic: { id: 'topic-1', classId: 'cls-1' },
      });
      mockPrisma.classContentItem.delete.mockResolvedValue({});
      mockPrisma.topic.delete.mockResolvedValue({});
      mockPrisma.classContentItem.findMany.mockResolvedValue([]);

      await service.deleteClassContentItem('cls-1', 'cci-1', adminActor);

      expect(mockPrisma.classContentItem.delete).toHaveBeenCalledWith({
        where: { id: 'cci-1' },
      });
      expect(mockPrisma.topic.delete).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
      });
    });

    it('should delete class content item but keep course topic', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.classContentItem.findUnique.mockResolvedValue({
        id: 'cci-2',
        classId: 'cls-1',
        topic: { id: 'topic-course', classId: 'course-1' },
      });
      mockPrisma.classContentItem.delete.mockResolvedValue({});
      mockPrisma.classContentItem.findMany.mockResolvedValue([]);

      await service.deleteClassContentItem('cls-1', 'cci-2', adminActor);

      expect(mockPrisma.classContentItem.delete).toHaveBeenCalled();
      expect(mockPrisma.topic.delete).not.toHaveBeenCalled();
    });

    it('should throw if item not found or belongs to different class', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.classContentItem.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteClassContentItem('cls-1', 'cci-missing', adminActor),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── listClassContentForStudent ───

  describe('listClassContentForStudent', () => {
    it('should return content for enrolled student', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({
        id: 'cls-1',
        contentAccessExpiresAt: null,
      });
      mockPrisma.studentClass.findFirst.mockResolvedValue({ id: 'sc-1' });
      mockPrisma.classContentItem.findMany.mockResolvedValue([
        {
          id: 'cci-1',
          topicId: 't1',
          kind: 'topic',
          sortOrder: 0,
          classId: 'cls-1',
          topic: {
            title: 'Topic A',
            kind: 'theory',
            classId: 'cls-1',
            chapter: null,
            lectures: [],
          },
        },
      ]);

      const result = await service.listClassContentForStudent('cls-1', 'stu-1');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Topic A');
    });

    it('should throw if not enrolled', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({
        id: 'cls-1',
        contentAccessExpiresAt: null,
      });
      mockPrisma.studentClass.findFirst.mockResolvedValue(null);

      await expect(
        service.listClassContentForStudent('cls-1', 'stu-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if class content access expired', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({
        id: 'cls-1',
        contentAccessExpiresAt: new Date('2020-01-01'),
      });
      mockPrisma.studentClass.findFirst.mockResolvedValue({ id: 'sc-1' });

      await expect(
        service.listClassContentForStudent('cls-1', 'stu-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
