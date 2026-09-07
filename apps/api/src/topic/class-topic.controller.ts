import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
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
import { ParseClassIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import {
  TopicCreateDto,
  TopicUpdateDto,
  TopicResponseDto,
} from 'src/dtos/topic.dto';
import { CourseTopicService } from './course-topic.service';
import { ClassContentService } from './class-content.service';

@Controller('class/:classId/topics')
@ApiTags('class-topics')
@ApiCookieAuth('access_token')
export class ClassTopicController {
  constructor(
    private readonly topicService: CourseTopicService,
    private readonly classContentService: ClassContentService,
  ) {}

  @Post()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Tạo chuyên đề mới cho lớp (legacy)' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiBody({ type: TopicCreateDto })
  @ApiResponse({
    status: 201,
    description: 'Chuyên đề đã được tạo.',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Lỗi khi tạo chuyên đề.' })
  @ApiResponse({ status: 404, description: 'Lớp không tồn tại.' })
  async createTopic(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
    @Body() dto: TopicCreateDto,
  ): Promise<TopicResponseDto> {
    return this.topicService.createTopic(
      { ...dto, classId },
      { userId: user.id, userEmail: user.email, roleType: user.roleType },
    );
  }

  @Patch(':topicId')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Cập nhật chuyên đề (legacy)' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề' })
  @ApiBody({ type: TopicUpdateDto })
  @ApiResponse({
    status: 200,
    description: 'Chuyên đề đã được cập nhật.',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Chuyên đề không tồn tại.' })
  async updateTopic(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
    @Param('topicId') topicId: string,
    @Body() dto: TopicUpdateDto,
  ): Promise<TopicResponseDto> {
    return this.topicService.updateTopic(topicId, dto, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Delete(':topicId')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Xóa chuyên đề (legacy)' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề' })
  @ApiResponse({ status: 200, description: 'Chuyên đề đã được xóa.' })
  @ApiResponse({ status: 404, description: 'Chuyên đề không tồn tại.' })
  @ApiResponse({
    status: 409,
    description: 'Chuyên đề đang được N lớp sử dụng (kể cả nội dung đã ẩn).',
  })
  async deleteTopic(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
    @Param('topicId') topicId: string,
  ): Promise<void> {
    return this.topicService.deleteTopic(topicId, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Get()
  @Roles(UserRole.admin, UserRole.student)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Lấy danh sách chuyên đề của lớp (legacy)' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng mỗi trang',
  })
  @ApiResponse({ status: 200, description: 'Danh sách chuyên đề.' })
  async getTopics(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    if (user.roleType === UserRole.student) {
      const studentId = await this.topicService.findStudentIdByUserId(user.id);
      if (!studentId) {
        return { data: [], total: 0, page: pageNum, limit: limitNum };
      }
      return this.topicService.getTopicsForStudent(
        classId,
        studentId,
        pageNum,
        limitNum,
      );
    }
    return this.topicService.getTopicsByClassId(classId, pageNum, limitNum);
  }

  @Get(':topicId')
  @Roles(UserRole.admin, UserRole.student)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Lấy chi tiết 1 chuyên đề (legacy)' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết chuyên đề.',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Chuyên đề không tồn tại.' })
  @ApiResponse({
    status: 403,
    description: 'Chưa tới thời điểm mở bài (lần giao luyện tập).',
  })
  async getTopic(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
    @Param('topicId') topicId: string,
  ): Promise<TopicResponseDto> {
    if (user.roleType === UserRole.student) {
      const studentId = await this.topicService.findStudentIdByUserId(user.id);
      if (!studentId) {
        throw new NotFoundException('Student profile not found');
      }
      return this.classContentService.getTopicForStudent(
        topicId,
        studentId,
        classId,
      );
    }
    return this.topicService.getTopicById(topicId);
  }

  @Post('reorder')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Sắp xếp lại thứ tự chuyên đề (legacy)' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { topicIds: { type: 'array', items: { type: 'string' } } },
    },
  })
  @ApiResponse({ status: 200, description: 'Đã sắp xếp lại.' })
  async reorderTopics(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
    @Body('topicIds') topicIds: string[],
  ): Promise<void> {
    return this.topicService.reorderTopics(
      topicIds,
      { classId },
      { userId: user.id, userEmail: user.email, roleType: user.roleType },
    );
  }
}
