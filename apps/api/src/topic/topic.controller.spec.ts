import { StaffRole, UserRole } from 'generated/enums';
import { ALLOW_STAFF_ROLES_ON_ADMIN_KEY } from 'src/auth/decorators/allow-staff-roles-on-admin.decorator';
import { ROLES_KEY } from 'src/auth/decorators/roles.decorator';
import { LectureController } from './topic.controller';
import { TopicService } from './topic.service';

function getHandler(methodName: string): (...args: never[]) => unknown {
  const descriptor = Object.getOwnPropertyDescriptor(
    LectureController.prototype,
    methodName,
  );
  const methodTarget: unknown = descriptor?.value;
  if (typeof methodTarget !== 'function') {
    throw new Error(`LectureController.${methodName} not found`);
  }
  return methodTarget as (...args: never[]) => unknown;
}

describe('LectureController.getLectureQuizzes', () => {
  it('restricts GET /topics/:topicId/lectures/:lectureId/quizzes to admin (not student)', () => {
    const roles: unknown = Reflect.getMetadata(
      ROLES_KEY,
      getHandler('getLectureQuizzes'),
    );
    expect(roles).toEqual([UserRole.admin]);
    expect(roles).not.toContain(UserRole.student);
  });

  it('keeps staff authoring roles on the admin lecture-quiz list route', () => {
    const staffRoles: unknown = Reflect.getMetadata(
      ALLOW_STAFF_ROLES_ON_ADMIN_KEY,
      getHandler('getLectureQuizzes'),
    );
    expect(staffRoles).toEqual([
      StaffRole.assistant,
      StaffRole.teacher,
      StaffRole.lesson_plan,
      StaffRole.lesson_plan_head,
    ]);
  });

  it('returns the admin quiz payload and never the student (no-correctIndex) variant', async () => {
    const topicService = {
      getLectureQuizzes: jest
        .fn()
        .mockResolvedValue([{ id: 'q1', correctIndex: 2 }]),
      getLectureQuizzesForStudent: jest.fn(),
    };
    const controller = new LectureController(
      topicService as unknown as TopicService,
    );

    await expect(
      controller.getLectureQuizzes('topic-1', 'lecture-1'),
    ).resolves.toEqual([{ id: 'q1', correctIndex: 2 }]);

    expect(topicService.getLectureQuizzes).toHaveBeenCalledWith('lecture-1');
    expect(topicService.getLectureQuizzesForStudent).not.toHaveBeenCalled();
  });
});
