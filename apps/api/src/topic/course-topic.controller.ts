import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
import { TopicCreateDto, TopicResponseDto } from 'src/dtos/topic.dto';
import { CourseTopicService } from './course-topic.service';

const COURSE_CONTENT_FORBIDDEN =
  'Không thuộc đội giáo án của khoá. Dạy lớp không đồng nghĩa soạn giáo án.';

const COURSE_TREE_STAFF_ROLES = [
  StaffRole.assistant,
  StaffRole.teacher,
  StaffRole.lesson_plan_head,
] as const;

@Controller('course/:courseId/chapters/:chapterId/topics')
@ApiTags('course-topics')
@ApiCookieAuth('access_token')
export class CourseTopicController {
  constructor(private readonly topicService: CourseTopicService) {}

  @Post()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(...COURSE_TREE_STAFF_ROLES)
  @ApiOperation({
    summary: 'Tạo chuyên đề mới trong chủ đề (khoá học)',
    description: 'Staff: assistant, teacher, lesson_plan_head.',
  })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiParam({ name: 'chapterId', description: 'ID chủ đề' })
  @ApiBody({ type: TopicCreateDto })
  @ApiResponse({
    status: 201,
    description: 'Chuyên đề đã được tạo.',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Lỗi khi tạo chuyên đề.' })
  @ApiResponse({ status: 403, description: COURSE_CONTENT_FORBIDDEN })
  async createTopic(
    @CurrentUser() user: JwtPayload,
    @Param('courseId') courseId: string,
    @Param('chapterId') chapterId: string,
    @Body() dto: TopicCreateDto,
  ): Promise<TopicResponseDto> {
    return this.topicService.createTopic(
      { ...dto, courseId, chapterId },
      { userId: user.id, userEmail: user.email, roleType: user.roleType },
    );
  }

  @Get()
  @Roles(UserRole.admin, UserRole.student)
  @AllowStaffRolesOnAdminRoutes(...COURSE_TREE_STAFF_ROLES)
  @ApiOperation({
    summary: 'Lấy danh sách chuyên đề trong chủ đề (khoá học)',
    description: 'Staff: assistant, teacher, lesson_plan_head.',
  })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiParam({ name: 'chapterId', description: 'ID chủ đề' })
  @ApiResponse({ status: 200, description: 'Danh sách chuyên đề.' })
  async getTopics(
    @Param('courseId') courseId: string,
    @Param('chapterId') chapterId: string,
  ): Promise<TopicResponseDto[]> {
    return this.topicService.getTopicsByCourseId(courseId, chapterId);
  }

  @Post('reorder')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(...COURSE_TREE_STAFF_ROLES)
  @ApiOperation({
    summary: 'Sắp xếp lại thứ tự chuyên đề trong chủ đề',
    description: 'Staff: assistant, teacher, lesson_plan_head.',
  })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiParam({ name: 'chapterId', description: 'ID chủ đề' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { topicIds: { type: 'array', items: { type: 'string' } } },
    },
  })
  @ApiResponse({ status: 200, description: 'Đã sắp xếp lại.' })
  @ApiResponse({ status: 403, description: COURSE_CONTENT_FORBIDDEN })
  async reorderTopics(
    @CurrentUser() user: JwtPayload,
    @Param('courseId') _courseId: string,
    @Param('chapterId') chapterId: string,
    @Body('topicIds') topicIds: string[],
  ): Promise<void> {
    return this.topicService.reorderTopics(
      topicIds,
      { chapterId },
      { userId: user.id, userEmail: user.email, roleType: user.roleType },
    );
  }
}
