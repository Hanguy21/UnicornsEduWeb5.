import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActionHistoryService } from 'src/action-history/action-history.service';
import { CourseAccessService } from 'src/class/course-access.service';
import { TopicCreateDto } from 'src/dtos/topic.dto';
import { StaffRole, TopicKind, UserRole } from 'generated/enums';

export interface ActionHistoryActor {
  userId: string;
  userEmail: string;
  roleType: UserRole;
}

@Injectable()
export class TopicSupportService {
  protected readonly logger = new Logger(TopicSupportService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly actionHistory: ActionHistoryService,
    protected readonly courseAccess: CourseAccessService,
  ) {}

  async findStudentIdByUserId(userId: string): Promise<string | null> {
    const studentInfo = await this.prisma.studentInfo.findFirst({
      where: { userId },
      select: { id: true },
    });
    return studentInfo?.id ?? null;
  }

  protected async validateTopicOwnership(dto: TopicCreateDto): Promise<void> {
    const hasCourse = Boolean(dto.courseId);
    const hasClass = Boolean(dto.classId);

    if (hasCourse && hasClass) {
      throw new BadRequestException(
        'Chuyên đề chỉ thuộc Khoá học HOẶC Lớp học, không được cả hai',
      );
    }

    if (!hasCourse && !hasClass) {
      throw new BadRequestException(
        'Chuyên đề phải thuộc một Khoá học hoặc một Lớp học',
      );
    }

    if (hasCourse && !dto.chapterId && dto.kind !== TopicKind.practice) {
      throw new BadRequestException(
        'Chuyên đề thuộc Khoá học phải có Chủ đề (chapter)',
      );
    }

    // practice topics at course level (exam library) can have chapterId null
    if (hasCourse && dto.chapterId) {
      const chapter = await this.prisma.chapter.findUnique({
        where: { id: dto.chapterId },
      });
      if (!chapter || chapter.courseId !== dto.courseId) {
        throw new BadRequestException(
          `Chapter ${dto.chapterId} không thuộc Course ${dto.courseId}`,
        );
      }
    }
  }

  protected async validateTopicExists(topicId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!topic) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }
    return topic;
  }

  protected async validateCourseExists(courseId: string): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }
  }

  /**
   * Soạn nội dung cấp khoá (cây Kiến thức, thư viện đề, đáp án).
   * Không dùng assertCanWriteCourseQuestions — quyền đó chỉ cho ngân hàng câu hỏi.
   */
  protected async assertCanManageCourseContent(
    actor: ActionHistoryActor,
    courseId: string,
  ): Promise<void> {
    const courseActor = await this.courseAccess.resolveActor(
      actor.userId,
      actor.roleType,
    );
    await this.courseAccess.assertCanManageCourse(courseActor, courseId);
  }

  /** Course-owned academic content vs class-owned (gia sư lớp). */
  protected async assertCanManageOwnedAcademicContent(
    actor: ActionHistoryActor,
    owner: { courseId: string | null; classId: string | null },
  ): Promise<void> {
    if (owner.classId) {
      await this.validateStaffClassAccess(owner.classId, actor);
      return;
    }
    if (owner.courseId) {
      await this.assertCanManageCourseContent(actor, owner.courseId);
    }
  }

  protected async validateChapterExists(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
    });
    if (!chapter) {
      throw new NotFoundException(`Chapter ${chapterId} not found`);
    }
    return chapter;
  }

  protected async validateClassExists(classId: string): Promise<void> {
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      throw new NotFoundException(`Class ${classId} not found`);
    }
  }

  protected async validateStaffClassAccess(
    classId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    if (actor.roleType === UserRole.admin) return;

    const staffInfo = await this.prisma.staffInfo.findFirst({
      where: { userId: actor.userId },
    });
    if (!staffInfo) {
      throw new ForbiddenException('Staff profile not found');
    }

    const isTeacher = await this.prisma.classTeacher.findFirst({
      where: { classId, teacherId: staffInfo.id, status: 'active' },
    });

    const isAssistant = staffInfo.roles.includes(StaffRole.assistant);

    if (!isTeacher && !isAssistant) {
      throw new ForbiddenException('You do not have access to this class');
    }
  }

  protected async validateStudentClassAccess(
    classId: string,
    studentId: string,
  ): Promise<void> {
    const enrollment = await this.prisma.studentClass.findFirst({
      where: { classId, studentId, status: 'active' },
      include: { class: { select: { contentAccessExpiresAt: true } } },
    });
    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this class');
    }
    if (
      enrollment.class.contentAccessExpiresAt &&
      enrollment.class.contentAccessExpiresAt < new Date()
    ) {
      throw new ForbiddenException('This class has expired');
    }
  }

  /**
   * Block course-level Chapter/Topic/Lecture deletes while any class still
   * references the topic via ClassContentItem (including hidden items).
   */
  protected async assertTopicsNotUsedByClasses(
    topicIds: string[],
    entityLabel: 'Chủ đề' | 'Chuyên đề' | 'Bài học',
  ): Promise<void> {
    if (topicIds.length === 0) return;
    const used = await this.prisma.classContentItem.groupBy({
      by: ['classId'],
      where: { topicId: { in: topicIds } },
    });
    if (used.length > 0) {
      throw new ConflictException(
        `${entityLabel} đang được ${used.length} lớp sử dụng`,
      );
    }
  }
}
