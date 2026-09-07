import { StaffRole, UserRole } from 'generated/enums';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { ALLOW_STAFF_ROLES_ON_ADMIN_KEY } from 'src/auth/decorators/allow-staff-roles-on-admin.decorator';
import { ROLES_KEY } from 'src/auth/decorators/roles.decorator';
import {
  CourseChapterController,
  LectureController,
  PracticeTopicQuestionController,
} from './topic.controller';
import { CourseChapterService } from './course-chapter.service';
import { LectureService } from './lecture.service';
import { PracticeQuestionLinkService } from './practice-question-link.service';

function getHandler(
  ctor: { name: string; prototype: object },
  methodName: string,
): (...args: never[]) => unknown {
  const descriptor = Object.getOwnPropertyDescriptor(
    ctor.prototype,
    methodName,
  );
  const methodTarget: unknown = descriptor?.value;
  if (typeof methodTarget !== 'function') {
    throw new Error(`${ctor.name}.${methodName} not found`);
  }
  return methodTarget as (...args: never[]) => unknown;
}

const staffUser = {
  id: 'user-1',
  email: 'staff@test.com',
  accountHandle: 'staff1',
  roleType: UserRole.staff,
};

describe('LectureController.getLectureQuizzes', () => {
  it('restricts GET /topics/:topicId/lectures/:lectureId/quizzes to admin (not student)', () => {
    const roles: unknown = Reflect.getMetadata(
      ROLES_KEY,
      getHandler(LectureController, 'getLectureQuizzes'),
    );
    expect(roles).toEqual([UserRole.admin]);
    expect(roles).not.toContain(UserRole.student);
  });

  it('keeps staff authoring roles on the admin lecture-quiz list route', () => {
    const staffRoles: unknown = Reflect.getMetadata(
      ALLOW_STAFF_ROLES_ON_ADMIN_KEY,
      getHandler(LectureController, 'getLectureQuizzes'),
    );
    expect(staffRoles).toEqual([
      StaffRole.assistant,
      StaffRole.teacher,
      StaffRole.lesson_plan,
      StaffRole.lesson_plan_head,
    ]);
  });

  it('documents HTTP 403 when the caller cannot manage the course', () => {
    const responses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      getHandler(LectureController, 'getLectureQuizzes'),
    ) as Record<string, { description?: string }>;
    expect(responses['403']?.description).toMatch(/đội giáo án/);
  });

  it('returns the admin quiz payload and never the student (no-correctIndex) variant', async () => {
    const topicService = {
      getLectureQuizzes: jest
        .fn()
        .mockResolvedValue([{ id: 'q1', correctIndex: 2 }]),
      getLectureQuizzesForStudent: jest.fn(),
    };
    const controller = new LectureController(
      topicService as unknown as LectureService,
    );

    await expect(
      controller.getLectureQuizzes(staffUser, 'topic-1', 'lecture-1'),
    ).resolves.toEqual([{ id: 'q1', correctIndex: 2 }]);

    expect(topicService.getLectureQuizzes).toHaveBeenCalledWith('lecture-1', {
      userId: staffUser.id,
      userEmail: staffUser.email,
      roleType: staffUser.roleType,
    });
    expect(topicService.getLectureQuizzesForStudent).not.toHaveBeenCalled();
  });
});

describe('PracticeTopicQuestionController.getQuestions', () => {
  it('documents HTTP 403 for callers outside the course lesson-plan team', () => {
    const responses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      getHandler(PracticeTopicQuestionController, 'getQuestions'),
    ) as Record<string, { description?: string }>;
    expect(responses['403']?.description).toMatch(/đội giáo án/);
  });

  it('forwards the current user so the service can assertCanManageCourse', async () => {
    const topicService = {
      getQuestionsByTopicId: jest.fn().mockResolvedValue([]),
    };
    const controller = new PracticeTopicQuestionController(
      topicService as unknown as PracticeQuestionLinkService,
    );

    await controller.getQuestions(staffUser, 'topic-1');

    expect(topicService.getQuestionsByTopicId).toHaveBeenCalledWith('topic-1', {
      userId: staffUser.id,
      userEmail: staffUser.email,
      roleType: staffUser.roleType,
    });
  });
});

describe('CourseChapterController course-manage 403', () => {
  it.each([
    'createChapter',
    'updateChapter',
    'deleteChapter',
    'reorderChapters',
  ] as const)('documents HTTP 403 on %s', (methodName) => {
    const responses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      getHandler(CourseChapterController, methodName),
    ) as Record<string, { description?: string }>;
    expect(responses['403']?.description).toMatch(/đội giáo án/);
  });

  it('passes the actor into reorderChapters', async () => {
    const topicService = {
      reorderChapters: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new CourseChapterController(
      topicService as unknown as CourseChapterService,
    );

    await controller.reorderChapters(staffUser, 'course-x', ['ch-1']);

    expect(topicService.reorderChapters).toHaveBeenCalledWith(
      'course-x',
      ['ch-1'],
      {
        userId: staffUser.id,
        userEmail: staffUser.email,
        roleType: staffUser.roleType,
      },
    );
  });
});
