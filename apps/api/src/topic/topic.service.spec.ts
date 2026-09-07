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
import { CourseAccessService } from '../class/course-access.service';
import {
  BadRequestException,
  ConflictException,
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
      staffInfo: { findFirst: jest.fn(), findUnique: jest.fn() },
      classTeacher: { findFirst: jest.fn() },
      courseLessonPlanMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      studentClass: { findFirst: jest.fn() },
      course: { findUnique: jest.fn() },
      chapter: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      lecture: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      topic: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      classContentItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
      },
      classTimelineItem: {
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 0 } }),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(
        (fnOrArray: ((tx: any) => Promise<any>) | any[]) => {
          if (typeof fnOrArray === 'function') return fnOrArray(mockPrisma);
          return Promise.all(fnOrArray);
        },
      ),
    };

    service = new TopicService(
      mockPrisma as any,
      {} as any,
      new CourseAccessService(mockPrisma as any),
    );
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
        {
          topicId: 'topic-existing',
          openAt: '2026-09-07T13:00:00.000Z',
          durationMinutes: 60,
        },
        adminActor,
      );

      expect(result.title).toBe('Existing topic');
      expect(result.source).toBe('course');
      expect(result.chapterTitle).toBe('Ch 1');
      expect(mockPrisma.classContentItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            topicId: 'topic-existing',
            openAt: new Date('2026-09-07T13:00:00.000Z'),
            durationMinutes: 60,
          }),
        }),
      );
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

    it('should reject practice assignment without openAt/durationMinutes', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.topic.findUnique.mockResolvedValue({
        id: 'topic-practice',
        kind: 'practice',
      });
      mockPrisma.classContentItem.findUnique.mockResolvedValue(null);

      await expect(
        service.createClassContentItem(
          'cls-1',
          { topicId: 'topic-practice' },
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.classContentItem.create).not.toHaveBeenCalled();
    });

    it('should not write schedule onto a theory topic row', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.classContentItem.aggregate.mockResolvedValue({
        _max: { sortOrder: 0 },
      });
      mockPrisma.topic.create.mockResolvedValue({
        id: 'topic-theory',
        kind: 'theory',
        classId: 'cls-1',
        title: 'Theory',
      });
      mockPrisma.classContentItem.create.mockResolvedValue({
        id: 'cci-t',
        topicId: 'topic-theory',
        kind: 'topic',
        sortOrder: 1,
        classId: 'cls-1',
        openAt: null,
        durationMinutes: null,
        topic: {
          title: 'Theory',
          kind: 'theory',
          classId: 'cls-1',
          chapter: null,
          lectures: [],
        },
      });

      await service.createClassContentItem(
        'cls-1',
        {
          title: 'Theory',
          kind: 'theory' as any,
          openAt: '2026-09-07T13:00:00.000Z',
          durationMinutes: 60,
        },
        adminActor,
      );

      expect(mockPrisma.topic.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            openAt: expect.anything(),
            durationMinutes: expect.anything(),
          }),
        }),
      );
      expect(mockPrisma.classContentItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            openAt: null,
            durationMinutes: null,
          }),
        }),
      );
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
    it('hides the class content item and timeline row without deleting topic or attempts', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.classContentItem.findUnique.mockResolvedValue({
        id: 'cci-1',
        classId: 'cls-1',
        hiddenAt: null,
      });
      mockPrisma.classContentItem.update.mockResolvedValue({});
      mockPrisma.classTimelineItem.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.classContentItem.findMany.mockResolvedValue([]);

      await service.deleteClassContentItem('cls-1', 'cci-1', adminActor);

      expect(mockPrisma.classContentItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cci-1' },
          data: expect.objectContaining({
            hiddenByStaffId: 'staff-1',
          }),
        }),
      );
      expect(mockPrisma.classTimelineItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { classContentItemId: 'cci-1' },
        }),
      );
      expect(mockPrisma.classContentItem.delete).not.toHaveBeenCalled();
      expect(mockPrisma.topic.delete).not.toHaveBeenCalled();
    });

    it('does not delete a course topic when hiding', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.classContentItem.findUnique.mockResolvedValue({
        id: 'cci-2',
        classId: 'cls-1',
        hiddenAt: null,
      });
      mockPrisma.classContentItem.update.mockResolvedValue({});
      mockPrisma.classTimelineItem.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.classContentItem.findMany.mockResolvedValue([]);

      await service.deleteClassContentItem('cls-1', 'cci-2', adminActor);

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

  describe('restoreClassContentItem', () => {
    it('clears hidden flags on content and timeline', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.classContentItem.findUnique.mockResolvedValue({
        id: 'cci-1',
        classId: 'cls-1',
        hiddenAt: new Date(),
      });
      mockPrisma.classContentItem.update.mockResolvedValue({});
      mockPrisma.classTimelineItem.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.classContentItem.findMany.mockResolvedValue([]);

      await service.restoreClassContentItem('cls-1', 'cci-1', adminActor);

      expect(mockPrisma.classContentItem.update).toHaveBeenCalledWith({
        where: { id: 'cci-1' },
        data: { hiddenAt: null, hiddenByStaffId: null },
      });
      expect(mockPrisma.classTimelineItem.updateMany).toHaveBeenCalledWith({
        where: { classContentItemId: 'cci-1' },
        data: { hiddenAt: null, hiddenByStaffId: null },
      });
    });
  });

  describe('updateClassContentSchedule', () => {
    it('updates openAt/durationMinutes on this class only, not the topic', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.classContentItem.findUnique.mockResolvedValue({
        id: 'cci-a',
        classId: 'cls-1',
        topicId: 'shared-topic',
        topic: {
          kind: 'practice',
          title: 'Đề chung',
          classId: null,
          chapter: null,
          lectures: [],
        },
      });
      mockPrisma.classContentItem.update.mockResolvedValue({
        id: 'cci-a',
        classId: 'cls-1',
        topicId: 'shared-topic',
        kind: 'topic',
        sortOrder: 0,
        openAt: new Date('2026-09-08T10:00:00.000Z'),
        durationMinutes: 90,
        topic: {
          kind: 'practice',
          title: 'Đề chung',
          classId: null,
          chapter: null,
          lectures: [],
        },
      });

      const result = await service.updateClassContentSchedule(
        'cls-1',
        'cci-a',
        { openAt: '2026-09-08T10:00:00.000Z', durationMinutes: 90 },
        adminActor,
      );

      expect(result.openAt).toEqual(new Date('2026-09-08T10:00:00.000Z'));
      expect(result.durationMinutes).toBe(90);
      expect(mockPrisma.topic.update).not.toHaveBeenCalled();
      expect(mockPrisma.classContentItem.update).toHaveBeenCalledWith({
        where: { id: 'cci-a' },
        data: {
          openAt: new Date('2026-09-08T10:00:00.000Z'),
          durationMinutes: 90,
        },
        include: { topic: { include: { chapter: true, lectures: true } } },
      });
    });

    it('rejects schedule updates on theory content', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.classTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrisma.staffInfo.findFirst.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.classContentItem.findUnique.mockResolvedValue({
        id: 'cci-t',
        classId: 'cls-1',
        topic: { kind: 'theory', title: 'LT', classId: 'cls-1' },
      });

      await expect(
        service.updateClassContentSchedule(
          'cls-1',
          'cci-t',
          { openAt: '2026-09-08T10:00:00.000Z', durationMinutes: 45 },
          adminActor,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.classContentItem.update).not.toHaveBeenCalled();
    });
  });

  describe('getAssignedTopicForStudent', () => {
    it('blocks practice before openAt', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.studentClass.findFirst.mockResolvedValue({
        id: 'sc-1',
        class: { contentAccessExpiresAt: null },
      });
      mockPrisma.classContentItem.findUnique.mockResolvedValue({
        topic: { id: 't-practice', kind: 'practice', title: 'Đề' },
        openAt: new Date(Date.now() + 60 * 60 * 1000),
        durationMinutes: 60,
      });

      await expect(
        service.getAssignedTopicForStudent('cls-1', 't-practice', 'stu-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns 404 when the lần giao is hidden', async () => {
      mockPrisma.studentClass.findFirst.mockResolvedValue({
        id: 'sc-1',
        class: { contentAccessExpiresAt: null },
      });
      mockPrisma.classContentItem.findUnique.mockResolvedValue({
        topic: { id: 't-practice', kind: 'practice', title: 'Đề' },
        openAt: new Date(Date.now() - 60 * 60 * 1000),
        hiddenAt: new Date(),
      });

      await expect(
        service.getAssignedTopicForStudent('cls-1', 't-practice', 'stu-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows practice after openAt', async () => {
      const topic = { id: 't-practice', kind: 'practice', title: 'Đề' };
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'cls-1' });
      mockPrisma.studentClass.findFirst.mockResolvedValue({
        id: 'sc-1',
        class: { contentAccessExpiresAt: null },
      });
      mockPrisma.classContentItem.findUnique.mockResolvedValue({
        topic,
        openAt: new Date(Date.now() - 60 * 1000),
        durationMinutes: 60,
      });

      const result = await service.getAssignedTopicForStudent(
        'cls-1',
        't-practice',
        'stu-1',
      );
      expect(result.id).toBe('t-practice');
    });
  });

  describe('getPracticeAssignmentForStudent', () => {
    it('reuses openAt block', async () => {
      mockPrisma.studentClass.findFirst.mockResolvedValue({
        id: 'sc-1',
        class: { contentAccessExpiresAt: null },
      });
      mockPrisma.classContentItem.findFirst.mockResolvedValue({
        id: 'cci-1',
        topicId: 't-practice',
        durationMinutes: 60,
        openAt: new Date(Date.now() + 60 * 60 * 1000),
        topic: { id: 't-practice', kind: 'practice', title: 'Đề' },
      });

      await expect(
        service.getPracticeAssignmentForStudent('cls-1', 'cci-1', 'stu-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects theory assignments', async () => {
      mockPrisma.studentClass.findFirst.mockResolvedValue({
        id: 'sc-1',
        class: { contentAccessExpiresAt: null },
      });
      mockPrisma.classContentItem.findFirst.mockResolvedValue({
        id: 'cci-1',
        topicId: 't-th',
        durationMinutes: null,
        openAt: null,
        topic: { id: 't-th', kind: 'theory', title: 'LT' },
      });

      await expect(
        service.getPracticeAssignmentForStudent('cls-1', 'cci-1', 'stu-1'),
      ).rejects.toThrow(BadRequestException);
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
      expect(result[0].isOpen).toBe(true);
      expect(mockPrisma.classContentItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { classId: 'cls-1', hiddenAt: null },
        }),
      );
    });

    it('marks locked practice assignments as not open without hiding them', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({
        id: 'cls-1',
        contentAccessExpiresAt: null,
      });
      mockPrisma.studentClass.findFirst.mockResolvedValue({ id: 'sc-1' });
      mockPrisma.classContentItem.findMany.mockResolvedValue([
        {
          id: 'cci-p',
          topicId: 't-p',
          kind: 'topic',
          sortOrder: 0,
          classId: 'cls-1',
          openAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          durationMinutes: 45,
          topic: {
            title: 'Đề khóa',
            kind: 'practice',
            classId: null,
            chapter: null,
            lectures: [],
          },
        },
      ]);

      const result = await service.listClassContentForStudent('cls-1', 'stu-1');
      expect(result[0].isOpen).toBe(false);
      expect(result[0].durationMinutes).toBe(45);
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

  // ─── QuestionLink CRUD (Practice Topic / Đề) ───

  describe('QuestionLink CRUD', () => {
    const practiceTopic = {
      id: 'topic-practice-1',
      kind: 'practice',
      courseId: 'course-1',
      chapterId: 'ch-1',
      classId: null,
      title: 'Đề thi thử',
    };

    const theoryTopic = {
      id: 'topic-theory-1',
      kind: 'theory',
      courseId: 'course-1',
      chapterId: 'ch-1',
      classId: null,
      title: 'Chuyên đề lý thuyết',
    };

    const mockQuestion = {
      id: 'q-1',
      courseId: 'course-1',
      chapterId: 'ch-1',
      difficultyLevelId: 'dl-1',
      type: 'single_choice',
      content: 'Câu hỏi test',
      options: ['A', 'B', 'C'],
      correctIndex: 0,
      explanation: null,
      answerGuide: null,
      deletedAt: null,
    };

    const mockLink = {
      id: 'link-1',
      topicId: 'topic-practice-1',
      questionId: 'q-1',
      order: 0,
      points: 10,
      question: mockQuestion,
    };

    beforeEach(() => {
      mockPrisma.questionLink = {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      };
      mockPrisma.question = {
        findUnique: jest.fn(),
      };
    });

    // ─── getQuestionsByTopicId ───

    describe('getQuestionsByTopicId', () => {
      it('should return questions for a practice topic', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.questionLink.findMany.mockResolvedValue([mockLink]);

        const result = await service.getQuestionsByTopicId(
          'topic-practice-1',
          adminActor,
        );

        expect(result).toHaveLength(1);
        expect(result[0].questionId).toBe('q-1');
        expect(result[0].points).toBe(10);
      });

      it('should throw if topic not found', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(null);

        await expect(
          service.getQuestionsByTopicId('topic-missing', adminActor),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw if topic is not practice', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(theoryTopic);

        await expect(
          service.getQuestionsByTopicId('topic-theory-1', adminActor),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw if topic has no courseId and no classId', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue({
          ...practiceTopic,
          courseId: null,
          classId: null,
        });

        await expect(
          service.getQuestionsByTopicId('topic-practice-1', adminActor),
        ).rejects.toThrow(BadRequestException);
      });

      it('should resolve course from class for class-owned practice topics', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue({
          ...practiceTopic,
          courseId: null,
          classId: 'cls-1',
        });
        mockPrisma.class.findUnique.mockResolvedValue({ courseId: 'course-1' });
        mockPrisma.questionLink.findMany.mockResolvedValue([mockLink]);

        const result = await service.getQuestionsByTopicId(
          'topic-class-1',
          adminActor,
        );
        expect(result).toHaveLength(1);
        expect(mockPrisma.class.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: 'cls-1' } }),
        );
      });
    });

    // ─── addQuestionToTopic ───

    describe('addQuestionToTopic', () => {
      it('should link a question to a practice topic', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.question.findUnique.mockResolvedValue(mockQuestion);
        mockPrisma.questionLink.findUnique.mockResolvedValue(null);
        mockPrisma.questionLink.aggregate.mockResolvedValue({
          _max: { order: 1 },
        });
        mockPrisma.questionLink.create.mockResolvedValue(mockLink);

        const result = await service.addQuestionToTopic(
          'topic-practice-1',
          { questionId: 'q-1', points: 10 },
          adminActor,
        );

        expect(result.questionId).toBe('q-1');
        expect(result.points).toBe(10);
        expect(mockPrisma.questionLink.create).toHaveBeenCalled();
      });

      it('should link a question onto a class-owned practice topic via the class course', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue({
          ...practiceTopic,
          courseId: null,
          classId: 'cls-1',
        });
        mockPrisma.class.findUnique.mockResolvedValue({
          id: 'cls-1',
          courseId: 'course-1',
        });
        mockPrisma.question.findUnique.mockResolvedValue(mockQuestion);
        mockPrisma.questionLink.findUnique.mockResolvedValue(null);
        mockPrisma.questionLink.aggregate.mockResolvedValue({
          _max: { order: 0 },
        });
        mockPrisma.questionLink.create.mockResolvedValue(mockLink);

        const result = await service.addQuestionToTopic(
          'topic-class-1',
          { questionId: 'q-1', points: 10 },
          adminActor,
        );

        expect(result.questionId).toBe('q-1');
      });

      it('should forbid a teacher from linking questions onto a course-level đề', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.staffInfo.findUnique.mockResolvedValue({
          id: 'staff-1',
          roles: ['teacher'],
        });
        mockPrisma.courseLessonPlanMember.findUnique.mockResolvedValue(null);

        await expect(
          service.addQuestionToTopic(
            'topic-practice-1',
            { questionId: 'q-1' },
            {
              userId: 'user-teacher',
              userEmail: 't@test.com',
              roleType: UserRole.staff,
            },
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw if question not found', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.question.findUnique.mockResolvedValue(null);

        await expect(
          service.addQuestionToTopic(
            'topic-practice-1',
            { questionId: 'q-missing' },
            adminActor,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw if question is soft-deleted', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.question.findUnique.mockResolvedValue({
          ...mockQuestion,
          deletedAt: new Date(),
        });

        await expect(
          service.addQuestionToTopic(
            'topic-practice-1',
            { questionId: 'q-1' },
            adminActor,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw if question belongs to different course', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.question.findUnique.mockResolvedValue({
          ...mockQuestion,
          courseId: 'course-999',
        });

        await expect(
          service.addQuestionToTopic(
            'topic-practice-1',
            { questionId: 'q-1' },
            adminActor,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw if question already linked', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.question.findUnique.mockResolvedValue(mockQuestion);
        mockPrisma.questionLink.findUnique.mockResolvedValue(mockLink);

        await expect(
          service.addQuestionToTopic(
            'topic-practice-1',
            { questionId: 'q-1' },
            adminActor,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });

    // ─── updateQuestionLink ───

    describe('updateQuestionLink', () => {
      it('should update order and points', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.questionLink.findUnique.mockResolvedValue(mockLink);
        mockPrisma.questionLink.update.mockResolvedValue({
          ...mockLink,
          points: 20,
          order: 3,
        });

        const result = await service.updateQuestionLink(
          'topic-practice-1',
          'link-1',
          { points: 20, order: 3 },
          adminActor,
        );

        expect(result.points).toBe(20);
        expect(result.order).toBe(3);
      });

      it('should throw if link not found', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.questionLink.findUnique.mockResolvedValue(null);

        await expect(
          service.updateQuestionLink(
            'topic-practice-1',
            'link-missing',
            { points: 20 },
            adminActor,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw if link belongs to different topic', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.questionLink.findUnique.mockResolvedValue({
          ...mockLink,
          topicId: 'topic-other',
        });

        await expect(
          service.updateQuestionLink(
            'topic-practice-1',
            'link-1',
            { points: 20 },
            adminActor,
          ),
        ).rejects.toThrow(NotFoundException);
      });
    });

    // ─── removeQuestionFromTopic ───

    describe('removeQuestionFromTopic', () => {
      it('should delete the link', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.questionLink.findUnique.mockResolvedValue(mockLink);
        mockPrisma.questionLink.delete.mockResolvedValue({});

        await service.removeQuestionFromTopic(
          'topic-practice-1',
          'link-1',
          adminActor,
        );

        expect(mockPrisma.questionLink.delete).toHaveBeenCalledWith({
          where: { id: 'link-1' },
        });
      });

      it('should throw if link not found', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.questionLink.findUnique.mockResolvedValue(null);

        await expect(
          service.removeQuestionFromTopic(
            'topic-practice-1',
            'link-missing',
            adminActor,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw if link belongs to different topic', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.questionLink.findUnique.mockResolvedValue({
          ...mockLink,
          topicId: 'topic-other',
        });

        await expect(
          service.removeQuestionFromTopic(
            'topic-practice-1',
            'link-1',
            adminActor,
          ),
        ).rejects.toThrow(NotFoundException);
      });
    });

    // ─── reorderQuestionLinks ───

    describe('reorderQuestionLinks', () => {
      it('should update sortOrder for all owned IDs', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.questionLink.findMany
          .mockResolvedValueOnce([{ id: 'link-1' }, { id: 'link-2' }])
          .mockResolvedValueOnce([]);
        mockPrisma.questionLink.update.mockResolvedValue({});

        await service.reorderQuestionLinks(
          'topic-practice-1',
          ['link-2', 'link-1'],
          adminActor,
        );

        expect(mockPrisma.questionLink.update).toHaveBeenCalledTimes(2);
        expect(mockPrisma.questionLink.update).toHaveBeenCalledWith({
          where: { id: 'link-2' },
          data: { order: 0 },
        });
        expect(mockPrisma.questionLink.update).toHaveBeenCalledWith({
          where: { id: 'link-1' },
          data: { order: 1 },
        });
      });

      it('should throw if any ID does not belong to topic', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.questionLink.findMany.mockResolvedValue([{ id: 'link-1' }]);

        await expect(
          service.reorderQuestionLinks(
            'topic-practice-1',
            ['link-1', 'link-foreign'],
            adminActor,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });

    // ─── getQuestionLinkSummary ───

    describe('getQuestionLinkSummary', () => {
      it('should return total questions and points', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.questionLink.aggregate.mockResolvedValue({
          _count: { id: 3 },
          _sum: { points: 30 },
        });

        const result = await service.getQuestionLinkSummary('topic-practice-1');

        expect(result.totalQuestions).toBe(3);
        expect(result.totalPoints).toBe(30);
      });

      it('should return 0 points when no questions linked', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(practiceTopic);
        mockPrisma.questionLink.aggregate.mockResolvedValue({
          _count: { id: 0 },
          _sum: { points: null },
        });

        const result = await service.getQuestionLinkSummary('topic-practice-1');

        expect(result.totalQuestions).toBe(0);
        expect(result.totalPoints).toBe(0);
      });
    });

    // ─── isTopicAssignedToClass ───

    describe('isTopicAssignedToClass', () => {
      it('should return true when topic is in class content', async () => {
        mockPrisma.classContentItem.count.mockResolvedValue(2);

        const result = await service.isTopicAssignedToClass('topic-practice-1');

        expect(result).toBe(true);
      });

      it('should return false when topic is not in any class', async () => {
        mockPrisma.classContentItem.count.mockResolvedValue(0);

        const result = await service.isTopicAssignedToClass('topic-practice-1');

        expect(result).toBe(false);
      });
    });
  });

  describe('Lecture Quiz', () => {
    let quizService: TopicService;
    let mockActionHistory: Record<string, any>;

    const adminActor = {
      userId: 'user-admin-1',
      userEmail: 'admin@test.com',
      roleType: UserRole.admin,
    };

    const mockLecture = {
      id: 'lecture-1',
      topicId: 'topic-theory-1',
      title: 'Bài học 1',
      videoUrl: null,
      content: null,
      topic: { courseId: 'course-1', classId: null },
    };

    const mockQuestion = {
      id: 'q-1',
      courseId: 'course-1',
      type: 'single_choice',
      content: 'Câu hỏi test',
      options: ['A', 'B', 'C'],
      correctIndex: 0,
      explanation: null,
      answerGuide: null,
      deletedAt: null,
    };

    const mockQuizLink = {
      id: 'quiz-1',
      lectureId: 'lecture-1',
      questionId: 'q-1',
      order: 0,
      question: mockQuestion,
    };

    beforeEach(() => {
      mockPrisma.lecture = {
        findUnique: jest.fn(),
      };
      mockPrisma.question = {
        findMany: jest.fn(),
      };
      mockPrisma.lectureQuiz = {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      };
      mockPrisma.lectureQuizAnswer = {
        upsert: jest.fn(),
        findMany: jest.fn(),
      };
      mockActionHistory = {
        recordCreate: jest.fn().mockResolvedValue(undefined),
        recordDelete: jest.fn().mockResolvedValue(undefined),
      };
      quizService = new TopicService(
        mockPrisma as any,
        mockActionHistory as any,
        new CourseAccessService(mockPrisma as any),
      );
    });

    describe('linkQuizQuestions', () => {
      it('should link questions not already linked and record audit history', async () => {
        mockPrisma.lecture.findUnique.mockResolvedValue(mockLecture);
        mockPrisma.question.findMany.mockResolvedValue([mockQuestion]);
        mockPrisma.lectureQuiz.aggregate.mockResolvedValue({
          _max: { order: null },
        });
        mockPrisma.lectureQuiz.findUnique.mockResolvedValue(null);
        mockPrisma.lectureQuiz.create.mockResolvedValue(mockQuizLink);

        await quizService.linkQuizQuestions('lecture-1', ['q-1'], adminActor);

        expect(mockPrisma.lectureQuiz.create).toHaveBeenCalledWith({
          data: { lectureId: 'lecture-1', questionId: 'q-1', order: 0 },
        });
        expect(mockActionHistory.recordCreate).toHaveBeenCalledTimes(1);
      });

      it('should throw if lecture not found', async () => {
        mockPrisma.lecture.findUnique.mockResolvedValue(null);

        await expect(
          quizService.linkQuizQuestions('lecture-missing', ['q-1'], adminActor),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw if some questions do not belong to lecture course', async () => {
        mockPrisma.lecture.findUnique.mockResolvedValue(mockLecture);
        mockPrisma.question.findMany.mockResolvedValue([]);

        await expect(
          quizService.linkQuizQuestions('lecture-1', ['q-foreign'], adminActor),
        ).rejects.toThrow(BadRequestException);
      });

      it('should skip questions already linked without creating duplicates', async () => {
        mockPrisma.lecture.findUnique.mockResolvedValue(mockLecture);
        mockPrisma.question.findMany.mockResolvedValue([mockQuestion]);
        mockPrisma.lectureQuiz.aggregate.mockResolvedValue({
          _max: { order: 0 },
        });
        mockPrisma.lectureQuiz.findUnique.mockResolvedValue(mockQuizLink);

        await quizService.linkQuizQuestions('lecture-1', ['q-1'], adminActor);

        expect(mockPrisma.lectureQuiz.create).not.toHaveBeenCalled();
      });
    });

    describe('unlinkQuizQuestion', () => {
      it('should delete the link and record audit history', async () => {
        mockPrisma.lecture.findUnique.mockResolvedValue(mockLecture);
        mockPrisma.lectureQuiz.findUnique.mockResolvedValue(mockQuizLink);
        mockPrisma.lectureQuiz.delete.mockResolvedValue({});

        await quizService.unlinkQuizQuestion('lecture-1', 'q-1', adminActor);

        expect(mockPrisma.lectureQuiz.delete).toHaveBeenCalledWith({
          where: {
            lectureId_questionId: { lectureId: 'lecture-1', questionId: 'q-1' },
          },
        });
        expect(mockActionHistory.recordDelete).toHaveBeenCalledTimes(1);
      });

      it('should throw if link not found', async () => {
        mockPrisma.lecture.findUnique.mockResolvedValue(mockLecture);
        mockPrisma.lectureQuiz.findUnique.mockResolvedValue(null);

        await expect(
          quizService.unlinkQuizQuestion('lecture-1', 'q-missing', adminActor),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('submitQuizAnswers', () => {
      it('should upsert answers and return them with correctIndex for review', async () => {
        mockPrisma.lecture.findUnique.mockResolvedValue(mockLecture);
        mockPrisma.lectureQuiz.findMany.mockResolvedValue([
          { questionId: 'q-1' },
        ]);
        mockPrisma.lectureQuizAnswer.upsert.mockResolvedValue({});
        mockPrisma.lectureQuizAnswer.findMany.mockResolvedValue([
          {
            id: 'ans-1',
            questionId: 'q-1',
            choiceIndex: 0,
            question: mockQuestion,
          },
        ]);

        const result = await quizService.submitQuizAnswers(
          'lecture-1',
          'student-1',
          [{ questionId: 'q-1', choiceIndex: 0, essayAnswer: null }],
        );

        expect(mockPrisma.lectureQuizAnswer.upsert).toHaveBeenCalledTimes(1);
        expect(result).toHaveLength(1);
        expect(result[0].question.correctIndex).toBe(0);
      });

      it('should throw if answer references a question not linked to the lecture', async () => {
        mockPrisma.lecture.findUnique.mockResolvedValue(mockLecture);
        mockPrisma.lectureQuiz.findMany.mockResolvedValue([
          { questionId: 'q-1' },
        ]);

        await expect(
          quizService.submitQuizAnswers('lecture-1', 'student-1', [
            { questionId: 'q-foreign', choiceIndex: 0 },
          ]),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('getQuizAnswers', () => {
      it('should return saved answers for the student', async () => {
        mockPrisma.lectureQuizAnswer.findMany.mockResolvedValue([
          {
            id: 'ans-1',
            questionId: 'q-1',
            choiceIndex: 0,
            question: mockQuestion,
          },
        ]);

        const result = await quizService.getQuizAnswers(
          'lecture-1',
          'student-1',
        );

        expect(result).toHaveLength(1);
        expect(mockPrisma.lectureQuizAnswer.findMany).toHaveBeenCalledWith({
          where: { lectureId: 'lecture-1', studentId: 'student-1' },
          include: expect.any(Object),
        });
      });
    });
  });

  describe('Exam Library', () => {
    const examTopic = {
      id: 'exam-1',
      kind: 'practice',
      courseId: 'course-1',
      chapterId: null,
      classId: null,
      title: 'Đề thi thư viện',
    };

    const chapterPractice = {
      ...examTopic,
      id: 'exam-chapter',
      chapterId: 'ch-1',
    };

    beforeEach(() => {
      mockPrisma.course = { findUnique: jest.fn() };
      mockPrisma.topic.findMany = jest.fn();
      mockPrisma.topic.count = jest.fn();
      mockPrisma.topic.update = jest.fn();
      mockPrisma.topic.findUnique = jest.fn();
      mockPrisma.topic.create = jest.fn();
      mockPrisma.topic.delete = jest.fn();
    });

    describe('getExamLibrary', () => {
      it('should list practice topics with null chapterId', async () => {
        mockPrisma.course.findUnique.mockResolvedValue({ id: 'course-1' });
        mockPrisma.topic.findMany.mockResolvedValue([examTopic]);
        mockPrisma.topic.count.mockResolvedValue(1);

        const result = await service.getExamLibrary('course-1', {
          page: 1,
          limit: 20,
        });

        expect(result.total).toBe(1);
        expect(result.data).toHaveLength(1);
        expect(mockPrisma.topic.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              courseId: 'course-1',
              kind: 'practice',
              chapterId: null,
            }),
          }),
        );
      });

      it('should throw if course not found', async () => {
        mockPrisma.course.findUnique.mockResolvedValue(null);

        await expect(service.getExamLibrary('missing', {})).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('createExamTopic', () => {
      it('should create a practice topic at course level', async () => {
        mockPrisma.course.findUnique.mockResolvedValue({ id: 'course-1' });
        mockPrisma.topic.create.mockResolvedValue(examTopic);

        const result = await service.createExamTopic(
          'course-1',
          { kind: 'practice' as const, title: 'Đề thi thư viện' },
          adminActor,
        );

        expect(result.id).toBe('exam-1');
        expect(mockPrisma.topic.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              kind: 'practice',
              courseId: 'course-1',
              chapterId: null,
              classId: null,
              title: 'Đề thi thư viện',
            }),
          }),
        );
      });
    });

    describe('updateExamTopic', () => {
      it('should update title of an exam-library topic', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(examTopic);
        mockPrisma.topic.update.mockResolvedValue({
          ...examTopic,
          title: 'Đề mới',
        });

        const result = await service.updateExamTopic(
          'exam-1',
          { title: 'Đề mới' },
          adminActor,
        );

        expect(result.title).toBe('Đề mới');
      });

      it('should throw if topic is not an exam-library practice topic', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(chapterPractice);

        await expect(
          service.updateExamTopic('exam-chapter', { title: 'X' }, adminActor),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw if topic not found', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(null);

        await expect(
          service.updateExamTopic('missing', { title: 'X' }, adminActor),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteExamTopic', () => {
      it('should delete an exam-library topic', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(examTopic);
        mockPrisma.topic.delete.mockResolvedValue(examTopic);

        await service.deleteExamTopic('exam-1', adminActor);

        expect(mockPrisma.topic.delete).toHaveBeenCalledWith({
          where: { id: 'exam-1' },
        });
      });

      it('should throw if topic is not an exam-library practice topic', async () => {
        mockPrisma.topic.findUnique.mockResolvedValue(chapterPractice);

        await expect(
          service.deleteExamTopic('exam-chapter', adminActor),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('reorderExamTopics', () => {
      it('should update order for exam-library topics', async () => {
        mockPrisma.course.findUnique.mockResolvedValue({ id: 'course-1' });
        mockPrisma.topic.update.mockResolvedValue({});

        await service.reorderExamTopics('course-1', ['exam-1', 'exam-2'], adminActor);

        expect(mockPrisma.$transaction).toHaveBeenCalled();
        expect(mockPrisma.topic.update).toHaveBeenCalledTimes(2);
        expect(mockPrisma.topic.update).toHaveBeenNthCalledWith(1, {
          where: { id: 'exam-1', courseId: 'course-1', chapterId: null },
          data: { order: 0 },
        });
      });
    });
  });

  describe('knowledge-tree delete guards', () => {
    it('blocks deleting a topic still referenced by ClassContentItem (including hidden)', async () => {
      mockPrisma.topic.findUnique.mockResolvedValue({
        id: 'topic-1',
        classId: null,
      });
      mockPrisma.classContentItem.groupBy.mockResolvedValue([
        { classId: 'cls-1' },
      ]);

      await expect(
        service.deleteTopic('topic-1', adminActor),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.topic.delete).not.toHaveBeenCalled();
    });

    it('deletes a topic when no class content item references it', async () => {
      mockPrisma.topic.findUnique.mockResolvedValue({
        id: 'topic-free',
        classId: null,
      });
      mockPrisma.classContentItem.groupBy.mockResolvedValue([]);
      mockPrisma.topic.delete.mockResolvedValue({});

      await service.deleteTopic('topic-free', adminActor);

      expect(mockPrisma.topic.delete).toHaveBeenCalledWith({
        where: { id: 'topic-free' },
      });
    });

    it('blocks deleting a chapter whose topics are used by N classes', async () => {
      mockPrisma.chapter = {
        findUnique: jest.fn().mockResolvedValue({ id: 'ch-1' }),
        delete: jest.fn(),
      };
      mockPrisma.topic.findMany.mockResolvedValue([{ id: 'topic-1' }]);
      mockPrisma.classContentItem.groupBy.mockResolvedValue([
        { classId: 'cls-1' },
        { classId: 'cls-2' },
      ]);

      await expect(
        service.deleteChapter('ch-1', adminActor),
      ).rejects.toMatchObject({
        response: { message: 'Chủ đề đang được 2 lớp sử dụng' },
      });
      expect(mockPrisma.chapter.delete).not.toHaveBeenCalled();
    });

    it('blocks deleting a lecture whose topic is assigned to a class', async () => {
      mockPrisma.lecture = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'lec-1',
          topicId: 'topic-1',
          topic: { courseId: 'course-1', classId: null },
        }),
        delete: jest.fn(),
      };
      mockPrisma.classContentItem.groupBy.mockResolvedValue([
        { classId: 'cls-1' },
      ]);

      await expect(
        service.deleteLecture('lec-1', adminActor),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.lecture.delete).not.toHaveBeenCalled();
    });
  });

  describe('course-level authorization (dạy lớp ≠ soạn giáo án)', () => {
    const teacherActor = {
      userId: 'user-teacher',
      userEmail: 'teacher@test.com',
      roleType: UserRole.staff,
    };
    const lessonPlanActor = {
      userId: 'user-lp',
      userEmail: 'lp@test.com',
      roleType: UserRole.staff,
    };
    const courseChapter = { id: 'ch-1', courseId: 'course-x', title: 'Ch' };
    const courseTopic = {
      id: 'topic-1',
      kind: 'theory',
      courseId: 'course-x',
      classId: null,
      chapterId: 'ch-1',
      title: 'T',
    };
    const courseLecture = {
      id: 'lec-1',
      topicId: 'topic-1',
      topic: { courseId: 'course-x', classId: null },
    };

    function mockTeacherNotOnCourse() {
      mockPrisma.staffInfo.findUnique.mockResolvedValue({
        id: 'staff-teacher',
        roles: ['teacher'],
      });
      mockPrisma.courseLessonPlanMember.findUnique.mockResolvedValue(null);
    }

    function mockLessonPlanUnassigned() {
      mockPrisma.staffInfo.findUnique.mockResolvedValue({
        id: 'staff-lp',
        roles: ['lesson_plan'],
      });
      mockPrisma.courseLessonPlanMember.findUnique.mockResolvedValue(null);
    }

    function mockLessonPlanAssigned() {
      mockPrisma.staffInfo.findUnique.mockResolvedValue({
        id: 'staff-lp',
        roles: ['lesson_plan'],
      });
      mockPrisma.courseLessonPlanMember.findUnique.mockResolvedValue({
        id: 'm-1',
      });
    }

    it('teacher on a class of course X but not on the lesson-plan team gets 403 on knowledge-tree writes', async () => {
      mockTeacherNotOnCourse();
      mockPrisma.course.findUnique.mockResolvedValue({ id: 'course-x' });
      mockPrisma.chapter.findUnique.mockResolvedValue(courseChapter);
      mockPrisma.topic.findUnique.mockResolvedValue(courseTopic);
      mockPrisma.lecture.findUnique.mockResolvedValue(courseLecture);

      await expect(
        service.createChapter(
          { courseId: 'course-x', title: 'N' },
          teacherActor,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateChapter('ch-1', { title: 'N' }, teacherActor),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.deleteChapter('ch-1', teacherActor),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.reorderChapters('course-x', ['ch-1'], teacherActor),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.createTopic(
          {
            kind: 'theory' as never,
            courseId: 'course-x',
            chapterId: 'ch-1',
            title: 'T',
          },
          teacherActor,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateTopic('topic-1', { title: 'N' }, teacherActor),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.deleteTopic('topic-1', teacherActor),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.reorderTopics(
          ['topic-1'],
          { chapterId: 'ch-1' },
          teacherActor,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.createLecture('topic-1', { title: 'L' }, teacherActor),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateLecture('lec-1', { title: 'L' }, teacherActor),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.deleteLecture('lec-1', teacherActor),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.reorderLectures('topic-1', ['lec-1'], teacherActor),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.createExamTopic(
          'course-x',
          { title: 'E' } as never,
          teacherActor,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.reorderExamTopics('course-x', ['e1'], teacherActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('teacher cannot read course-level answer keys (questions + lecture quizzes)', async () => {
      mockTeacherNotOnCourse();
      mockPrisma.topic.findUnique.mockResolvedValue({
        id: 'topic-y',
        kind: 'practice',
        courseId: 'course-x',
        classId: null,
      });
      mockPrisma.lecture.findUnique.mockResolvedValue(courseLecture);
      mockPrisma.questionLink = { findMany: jest.fn() };
      mockPrisma.lectureQuiz = { findMany: jest.fn() };

      await expect(
        service.getQuestionsByTopicId('topic-y', teacherActor),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.getLectureQuizzes('lec-1', teacherActor),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.questionLink.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.lectureQuiz.findMany).not.toHaveBeenCalled();
    });

    it('lesson_plan not assigned to course Y gets 403 on GET questions', async () => {
      mockLessonPlanUnassigned();
      mockPrisma.topic.findUnique.mockResolvedValue({
        id: 'topic-y',
        kind: 'practice',
        courseId: 'course-y',
        classId: null,
      });
      mockPrisma.questionLink = { findMany: jest.fn() };

      await expect(
        service.getQuestionsByTopicId('topic-y', lessonPlanActor),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.questionLink.findMany).not.toHaveBeenCalled();
    });

    it('assigned lesson_plan member can still CRUD course-level chapters', async () => {
      mockLessonPlanAssigned();
      mockPrisma.course.findUnique.mockResolvedValue({ id: 'course-x' });
      mockPrisma.chapter.create.mockResolvedValue({
        id: 'ch-new',
        courseId: 'course-x',
        title: 'Ch',
      });

      const created = await service.createChapter(
        { courseId: 'course-x', title: 'Ch' },
        lessonPlanActor,
      );
      expect(created.id).toBe('ch-new');

      mockPrisma.chapter.findUnique.mockResolvedValue(courseChapter);
      mockPrisma.chapter.update.mockResolvedValue({
        ...courseChapter,
        title: 'Ch2',
      });
      const updated = await service.updateChapter(
        'ch-1',
        { title: 'Ch2' },
        lessonPlanActor,
      );
      expect(updated.title).toBe('Ch2');
    });
  });
});
