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
  ChapterCreateDto,
  ChapterUpdateDto,
  ChapterResponseDto,
} from 'src/dtos/topic.dto';
import { CourseChapterService } from './course-chapter.service';

const COURSE_CONTENT_FORBIDDEN =
  'Không thuộc đội giáo án của khoá. Dạy lớp không đồng nghĩa soạn giáo án.';

const COURSE_TREE_STAFF_ROLES = [
  StaffRole.assistant,
  StaffRole.teacher,
  StaffRole.lesson_plan_head,
] as const;

@Controller('course/:courseId/chapters')
@ApiTags('course-chapters')
@ApiCookieAuth('access_token')
export class CourseChapterController {
  constructor(private readonly topicService: CourseChapterService) {}

  @Post()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(...COURSE_TREE_STAFF_ROLES)
  @ApiOperation({
    summary: 'Tạo chủ đề mới cho khoá học',
    description:
      'Staff: assistant, teacher, lesson_plan_head. Tầng service vẫn từ chối teacher không thuộc đội giáo án.',
  })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiBody({ type: ChapterCreateDto })
  @ApiResponse({
    status: 201,
    description: 'Chủ đề đã được tạo.',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Lỗi khi tạo chủ đề.' })
  @ApiResponse({ status: 403, description: COURSE_CONTENT_FORBIDDEN })
  async createChapter(
    @CurrentUser() user: JwtPayload,
    @Param('courseId') courseId: string,
    @Body() dto: ChapterCreateDto,
  ): Promise<ChapterResponseDto> {
    return this.topicService.createChapter(
      { ...dto, courseId },
      { userId: user.id, userEmail: user.email, roleType: user.roleType },
    );
  }

  @Get()
  @Roles(UserRole.admin, UserRole.student)
  @AllowStaffRolesOnAdminRoutes(...COURSE_TREE_STAFF_ROLES)
  @ApiOperation({
    summary: 'Lấy danh sách chủ đề của khoá học',
    description:
      'Staff: assistant, teacher, lesson_plan_head (cùng GET chi tiết).',
  })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiResponse({ status: 200, description: 'Danh sách chủ đề.' })
  async getChapters(
    @Param('courseId') courseId: string,
  ): Promise<ChapterResponseDto[]> {
    return this.topicService.getChaptersByCourseId(courseId);
  }

  @Get(':chapterId')
  @Roles(UserRole.admin, UserRole.student)
  @AllowStaffRolesOnAdminRoutes(...COURSE_TREE_STAFF_ROLES)
  @ApiOperation({
    summary: 'Lấy chi tiết 1 chủ đề',
    description: 'Staff: assistant, teacher, lesson_plan_head.',
  })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiParam({ name: 'chapterId', description: 'ID chủ đề' })
  @ApiResponse({ status: 200, description: 'Chi tiết chủ đề.', type: Object })
  @ApiResponse({ status: 404, description: 'Chủ đề không tồn tại.' })
  async getChapter(
    @Param('courseId') courseId: string,
    @Param('chapterId') chapterId: string,
  ): Promise<ChapterResponseDto> {
    return this.topicService.getChapterById(chapterId);
  }

  @Patch(':chapterId')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(...COURSE_TREE_STAFF_ROLES)
  @ApiOperation({
    summary: 'Cập nhật chủ đề',
    description: 'Staff: assistant, teacher, lesson_plan_head.',
  })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiParam({ name: 'chapterId', description: 'ID chủ đề' })
  @ApiBody({ type: ChapterUpdateDto })
  @ApiResponse({
    status: 200,
    description: 'Chủ đề đã được cập nhật.',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Chủ đề không tồn tại.' })
  @ApiResponse({ status: 403, description: COURSE_CONTENT_FORBIDDEN })
  async updateChapter(
    @CurrentUser() user: JwtPayload,
    @Param('courseId') courseId: string,
    @Param('chapterId') chapterId: string,
    @Body() dto: ChapterUpdateDto,
  ): Promise<ChapterResponseDto> {
    return this.topicService.updateChapter(chapterId, dto, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Delete(':chapterId')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(...COURSE_TREE_STAFF_ROLES)
  @ApiOperation({
    summary: 'Xóa chủ đề',
    description: 'Staff: assistant, teacher, lesson_plan_head.',
  })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiParam({ name: 'chapterId', description: 'ID chủ đề' })
  @ApiResponse({ status: 200, description: 'Chủ đề đã được xóa.' })
  @ApiResponse({ status: 404, description: 'Chủ đề không tồn tại.' })
  @ApiResponse({ status: 403, description: COURSE_CONTENT_FORBIDDEN })
  @ApiResponse({
    status: 409,
    description: 'Chủ đề đang được N lớp sử dụng (kể cả nội dung đã ẩn).',
  })
  async deleteChapter(
    @CurrentUser() user: JwtPayload,
    @Param('courseId') courseId: string,
    @Param('chapterId') chapterId: string,
  ): Promise<void> {
    return this.topicService.deleteChapter(chapterId, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Post('reorder')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(...COURSE_TREE_STAFF_ROLES)
  @ApiOperation({
    summary: 'Sắp xếp lại thứ tự chủ đề',
    description: 'Staff: assistant, teacher, lesson_plan_head.',
  })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { chapterIds: { type: 'array', items: { type: 'string' } } },
    },
  })
  @ApiResponse({ status: 200, description: 'Đã sắp xếp lại.' })
  @ApiResponse({ status: 403, description: COURSE_CONTENT_FORBIDDEN })
  async reorderChapters(
    @CurrentUser() user: JwtPayload,
    @Param('courseId') courseId: string,
    @Body('chapterIds') chapterIds: string[],
  ): Promise<void> {
    return this.topicService.reorderChapters(courseId, chapterIds, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }
}
