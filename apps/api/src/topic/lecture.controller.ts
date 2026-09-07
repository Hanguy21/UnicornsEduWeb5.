import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StaffRole, UserRole } from 'generated/enums';
import { AllowStaffRolesOnAdminRoutes } from 'src/auth/decorators/allow-staff-roles-on-admin.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  LectureCreateDto,
  LectureUpdateDto,
  LectureResponseDto,
  LectureQuizLinkDto,
} from 'src/dtos/topic.dto';
import { LectureService } from './lecture.service';

const COURSE_CONTENT_FORBIDDEN =
  'Không thuộc đội giáo án của khoá. Dạy lớp không đồng nghĩa soạn giáo án.';

@Controller('topics/:topicId/lectures')
@ApiTags('topic-lectures')
@ApiCookieAuth('access_token')
export class LectureController {
  constructor(private readonly topicService: LectureService) {}

  @Post()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Tạo bài học mới trong chuyên đề lý thuyết' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề' })
  @ApiBody({ type: LectureCreateDto })
  @ApiResponse({
    status: 201,
    description: 'Bài học đã được tạo.',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Chuyên đề không phải loại lý thuyết.',
  })
  @ApiResponse({ status: 403, description: COURSE_CONTENT_FORBIDDEN })
  async createLecture(
    @CurrentUser() user: JwtPayload,
    @Param('topicId') topicId: string,
    @Body() dto: LectureCreateDto,
  ): Promise<LectureResponseDto> {
    return this.topicService.createLecture(topicId, dto, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Get()
  @Roles(UserRole.admin, UserRole.student)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Lấy danh sách bài học của chuyên đề' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề' })
  @ApiResponse({ status: 200, description: 'Danh sách bài học.' })
  async getLectures(
    @Param('topicId') topicId: string,
  ): Promise<LectureResponseDto[]> {
    return this.topicService.getLecturesByTopicId(topicId);
  }

  @Get(':lectureId')
  @Roles(UserRole.admin, UserRole.student)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Lấy chi tiết 1 bài học' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề' })
  @ApiParam({ name: 'lectureId', description: 'ID bài học' })
  @ApiResponse({ status: 200, description: 'Chi tiết bài học.', type: Object })
  @ApiResponse({ status: 404, description: 'Bài học không tồn tại.' })
  async getLecture(
    @Param('topicId') topicId: string,
    @Param('lectureId') lectureId: string,
  ): Promise<LectureResponseDto> {
    return this.topicService.getLectureById(lectureId);
  }

  @Patch(':lectureId')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Cập nhật bài học' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề' })
  @ApiParam({ name: 'lectureId', description: 'ID bài học' })
  @ApiBody({ type: LectureUpdateDto })
  @ApiResponse({
    status: 200,
    description: 'Bài học đã được cập nhật.',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Bài học không tồn tại.' })
  @ApiResponse({ status: 403, description: COURSE_CONTENT_FORBIDDEN })
  async updateLecture(
    @CurrentUser() user: JwtPayload,
    @Param('topicId') topicId: string,
    @Param('lectureId') lectureId: string,
    @Body() dto: LectureUpdateDto,
  ): Promise<LectureResponseDto> {
    return this.topicService.updateLecture(lectureId, dto, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Delete(':lectureId')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Xóa bài học' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề' })
  @ApiParam({ name: 'lectureId', description: 'ID bài học' })
  @ApiResponse({ status: 200, description: 'Bài học đã được xóa.' })
  @ApiResponse({ status: 404, description: 'Bài học không tồn tại.' })
  @ApiResponse({ status: 403, description: COURSE_CONTENT_FORBIDDEN })
  @ApiResponse({
    status: 409,
    description: 'Bài học đang được N lớp sử dụng (kể cả nội dung đã ẩn).',
  })
  async deleteLecture(
    @CurrentUser() user: JwtPayload,
    @Param('topicId') topicId: string,
    @Param('lectureId') lectureId: string,
  ): Promise<void> {
    return this.topicService.deleteLecture(lectureId, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Post('reorder')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Sắp xếp lại thứ tự bài học' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { lectureIds: { type: 'array', items: { type: 'string' } } },
    },
  })
  @ApiResponse({ status: 200, description: 'Đã sắp xếp lại.' })
  @ApiResponse({ status: 403, description: COURSE_CONTENT_FORBIDDEN })
  async reorderLectures(
    @CurrentUser() user: JwtPayload,
    @Param('topicId') topicId: string,
    @Body('lectureIds') lectureIds: string[],
  ): Promise<void> {
    return this.topicService.reorderLectures(topicId, lectureIds, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  // ─── Lecture Quiz (admin) ───

  @Post(':lectureId/quizzes')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(
    StaffRole.assistant,
    StaffRole.teacher,
    StaffRole.lesson_plan,
    StaffRole.lesson_plan_head,
  )
  @ApiOperation({ summary: 'Gắn câu hỏi ôn nhẹ vào bài học' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề' })
  @ApiParam({ name: 'lectureId', description: 'ID bài học' })
  @ApiBody({ type: LectureQuizLinkDto })
  @ApiResponse({ status: 200, description: 'Đã gắn câu hỏi.' })
  @ApiResponse({ status: 400, description: 'Câu hỏi không thuộc khoá học.' })
  @ApiResponse({ status: 404, description: 'Bài học không tồn tại.' })
  @ApiResponse({ status: 403, description: COURSE_CONTENT_FORBIDDEN })
  async linkQuizQuestions(
    @CurrentUser() user: JwtPayload,
    @Param('topicId') topicId: string,
    @Param('lectureId') lectureId: string,
    @Body() dto: LectureQuizLinkDto,
  ): Promise<void> {
    return this.topicService.linkQuizQuestions(lectureId, dto.questionIds, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Delete(':lectureId/quizzes/:questionId')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(
    StaffRole.assistant,
    StaffRole.teacher,
    StaffRole.lesson_plan,
    StaffRole.lesson_plan_head,
  )
  @ApiOperation({ summary: 'Gỡ câu hỏi ôn nhẹ khỏi bài học' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề' })
  @ApiParam({ name: 'lectureId', description: 'ID bài học' })
  @ApiParam({ name: 'questionId', description: 'ID câu hỏi' })
  @ApiResponse({ status: 200, description: 'Đã gỡ câu hỏi.' })
  @ApiResponse({ status: 404, description: 'Câu hỏi chưa được gắn.' })
  @ApiResponse({ status: 403, description: COURSE_CONTENT_FORBIDDEN })
  async unlinkQuizQuestion(
    @CurrentUser() user: JwtPayload,
    @Param('topicId') topicId: string,
    @Param('lectureId') lectureId: string,
    @Param('questionId') questionId: string,
  ): Promise<void> {
    return this.topicService.unlinkQuizQuestion(lectureId, questionId, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Get(':lectureId/quizzes')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(
    StaffRole.assistant,
    StaffRole.teacher,
    StaffRole.lesson_plan,
    StaffRole.lesson_plan_head,
  )
  @ApiOperation({
    summary: 'Danh sách câu hỏi ôn nhẹ của bài học (admin/staff soạn nội dung)',
    description:
      'Học sinh không dùng route này. Student đọc quiz đã enrollment-check qua GET /users/me/student-classes/:classId/topics/:topicId/lectures/:lectureId/quizzes.',
  })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề' })
  @ApiParam({ name: 'lectureId', description: 'ID bài học' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách câu hỏi (kèm đáp án đúng).',
  })
  @ApiResponse({
    status: 403,
    description: COURSE_CONTENT_FORBIDDEN,
  })
  async getLectureQuizzes(
    @CurrentUser() user: JwtPayload,
    @Param('topicId') topicId: string,
    @Param('lectureId') lectureId: string,
  ) {
    return this.topicService.getLectureQuizzes(lectureId, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }
}
