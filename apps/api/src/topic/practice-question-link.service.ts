import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  QuestionLinkCreateDto,
  QuestionLinkUpdateDto,
  QuestionLinkResponseDto,
  QuestionLinkSummaryDto,
} from 'src/dtos/topic.dto';
import { TopicKind } from 'generated/enums';
import {
  ActionHistoryActor,
  TopicSupportService,
} from './topic-support.service';

@Injectable()
export class PracticeQuestionLinkService extends TopicSupportService {
  protected readonly logger = new Logger(PracticeQuestionLinkService.name);

  // ─── Question Link CRUD (Practice Topic / Đề) ───

  private async validatePracticeTopic(topicId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });
    if (!topic) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }
    if (topic.kind !== TopicKind.practice) {
      throw new BadRequestException(
        'Chỉ chuyên đề luyện tập mới có danh sách câu hỏi',
      );
    }
    let courseId = topic.courseId;
    if (!courseId) {
      if (!topic.classId) {
        throw new BadRequestException(
          'Chuyên đề luyện tập phải thuộc một khoá học hoặc một lớp',
        );
      }
      const cls = await this.prisma.class.findUnique({
        where: { id: topic.classId },
        select: { courseId: true },
      });
      if (!cls) {
        throw new NotFoundException(`Class ${topic.classId} not found`);
      }
      courseId = cls.courseId;
    }
    return { topic, courseId };
  }

  /**
   * Course-level đề / cây Kiến thức: assertCanManageCourse — dạy lớp ≠ soạn giáo án.
   * Class-owned practice: staff who can access that class (incl. gia sư).
   */

  /**
   * Course-level đề / cây Kiến thức: assertCanManageCourse — dạy lớp ≠ soạn giáo án.
   * Class-owned practice: staff who can access that class (incl. gia sư).
   */
  private async assertCanLinkPracticeQuestions(
    topic: { classId: string | null; courseId: string | null },
    courseId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    if (topic.classId) {
      await this.validateStaffClassAccess(topic.classId, actor);
      return;
    }
    await this.assertCanManageCourseContent(actor, courseId);
  }

  async getQuestionsByTopicId(
    topicId: string,
    actor: ActionHistoryActor,
  ): Promise<QuestionLinkResponseDto[]> {
    const { topic, courseId } = await this.validatePracticeTopic(topicId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    const links = await this.prisma.questionLink.findMany({
      where: { topicId },
      orderBy: { order: 'asc' },
      include: {
        question: {
          select: {
            id: true,
            courseId: true,
            chapterId: true,
            difficultyLevelId: true,
            type: true,
            content: true,
            options: true,
            correctIndex: true,
            explanation: true,
            answerGuide: true,
          },
        },
      },
    });

    return links.map((link) => ({
      id: link.id,
      topicId: link.topicId,
      questionId: link.questionId,
      order: link.order,
      points: link.points,
      question: link.question,
    }));
  }

  async addQuestionToTopic(
    topicId: string,
    dto: QuestionLinkCreateDto,
    actor: ActionHistoryActor,
  ): Promise<QuestionLinkResponseDto> {
    const { topic, courseId } = await this.validatePracticeTopic(topicId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    // Validate question exists and belongs to same course
    const question = await this.prisma.question.findUnique({
      where: { id: dto.questionId },
    });
    if (!question || question.deletedAt) {
      throw new NotFoundException(`Question ${dto.questionId} not found`);
    }
    if (question.courseId !== courseId) {
      throw new BadRequestException(
        'Câu hỏi phải thuộc cùng khoá học với chuyên đề',
      );
    }

    // Check duplicate
    const existing = await this.prisma.questionLink.findUnique({
      where: { topicId_questionId: { topicId, questionId: dto.questionId } },
    });
    if (existing) {
      throw new BadRequestException('Câu hỏi đã được thêm vào chuyên đề này');
    }

    // Determine order: append at end
    const maxOrder = await this.prisma.questionLink.aggregate({
      where: { topicId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const link = await this.prisma.questionLink.create({
      data: {
        topicId,
        questionId: dto.questionId,
        order: dto.order ?? nextOrder,
        points: dto.points ?? null,
      },
      include: {
        question: {
          select: {
            id: true,
            courseId: true,
            chapterId: true,
            difficultyLevelId: true,
            type: true,
            content: true,
            options: true,
            correctIndex: true,
            explanation: true,
            answerGuide: true,
          },
        },
      },
    });

    this.logger.log(
      `Question linked to topic: question ${dto.questionId} → topic ${topicId} by ${actor.userEmail}`,
    );

    return {
      id: link.id,
      topicId: link.topicId,
      questionId: link.questionId,
      order: link.order,
      points: link.points,
      question: link.question,
    };
  }

  async updateQuestionLink(
    topicId: string,
    linkId: string,
    dto: QuestionLinkUpdateDto,
    actor: ActionHistoryActor,
  ): Promise<QuestionLinkResponseDto> {
    const { topic, courseId } = await this.validatePracticeTopic(topicId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    const link = await this.prisma.questionLink.findUnique({
      where: { id: linkId },
    });
    if (!link || link.topicId !== topicId) {
      throw new NotFoundException('Question link not found');
    }

    const updated = await this.prisma.questionLink.update({
      where: { id: linkId },
      data: {
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.points !== undefined && { points: dto.points }),
      },
      include: {
        question: {
          select: {
            id: true,
            courseId: true,
            chapterId: true,
            difficultyLevelId: true,
            type: true,
            content: true,
            options: true,
            correctIndex: true,
            explanation: true,
            answerGuide: true,
          },
        },
      },
    });

    this.logger.log(`Question link updated: ${linkId} by ${actor.userEmail}`);

    return {
      id: updated.id,
      topicId: updated.topicId,
      questionId: updated.questionId,
      order: updated.order,
      points: updated.points,
      question: updated.question,
    };
  }

  async removeQuestionFromTopic(
    topicId: string,
    linkId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    const { topic, courseId } = await this.validatePracticeTopic(topicId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    const link = await this.prisma.questionLink.findUnique({
      where: { id: linkId },
    });
    if (!link || link.topicId !== topicId) {
      throw new NotFoundException('Question link not found');
    }

    await this.prisma.questionLink.delete({ where: { id: linkId } });
    this.logger.log(
      `Question unlinked from topic: link ${linkId} from topic ${topicId} by ${actor.userEmail}`,
    );
  }

  async reorderQuestionLinks(
    topicId: string,
    linkIds: string[],
    actor: ActionHistoryActor,
  ): Promise<void> {
    const { topic, courseId } = await this.validatePracticeTopic(topicId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    // Verify all links belong to this topic
    const owned = await this.prisma.questionLink.findMany({
      where: { id: { in: linkIds }, topicId },
      select: { id: true },
    });
    if (owned.length !== linkIds.length) {
      throw new BadRequestException(
        'Some IDs do not belong to this topic or do not exist',
      );
    }

    await this.prisma.$transaction(
      linkIds.map((id, index) =>
        this.prisma.questionLink.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    this.logger.log(
      `Question links reordered for topic ${topicId} by ${actor.userEmail}`,
    );
  }

  async getQuestionLinkSummary(
    topicId: string,
  ): Promise<QuestionLinkSummaryDto> {
    await this.validatePracticeTopic(topicId);

    const result = await this.prisma.questionLink.aggregate({
      where: { topicId },
      _count: { id: true },
      _sum: { points: true },
    });

    return {
      totalQuestions: result._count.id,
      totalPoints: result._sum.points ?? 0,
    };
  }

  async isTopicAssignedToClass(topicId: string): Promise<boolean> {
    const count = await this.prisma.classContentItem.count({
      where: { topicId },
    });
    return count > 0;
  }
}
