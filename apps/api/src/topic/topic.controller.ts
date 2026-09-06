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
  ChapterCreateDto,
  ChapterUpdateDto,
  ChapterResponseDto,
  LectureCreateDto,
  LectureUpdateDto,
  LectureResponseDto,
  ClassContentCreateDto,
  ClassContentScheduleUpdateDto,
  QuestionLinkCreateDto,
  QuestionLinkUpdateDto,
  ReorderQuestionLinksDto,
  LectureQuizLinkDto,
  CourseTopicForClassDto,
} from 'src/dtos/topic.dto';
import { TopicService } from './topic.service';

@Controller('course/:courseId/chapters')
@ApiTags('course-chapters')
@ApiCookieAuth('access_token')
export class CourseChapterController {
  constructor(private readonly topicService: TopicService) {}

  @Post()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Tạo chủ đề mới cho khoá học' })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiBody({ type: ChapterCreateDto })
  @ApiResponse({
    status: 201,
    description: 'Chủ đề đã được tạo.',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Lỗi khi tạo chủ đề.' })
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
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Lấy danh sách chủ đề của khoá học' })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiResponse({ status: 200, description: 'Danh sách chủ đề.' })
  async getChapters(
    @Param('courseId') courseId: string,
  ): Promise<ChapterResponseDto[]> {
    return this.topicService.getChaptersByCourseId(courseId);
  }

  @Get(':chapterId')
  @Roles(UserRole.admin, UserRole.student)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Lấy chi tiết 1 chủ đề' })
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
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Cập nhật chủ đề' })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiParam({ name: 'chapterId', description: 'ID chủ đề' })
  @ApiBody({ type: ChapterUpdateDto })
  @ApiResponse({
    status: 200,
    description: 'Chủ đề đã được cập nhật.',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Chủ đề không tồn tại.' })
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
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Xóa chủ đề' })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiParam({ name: 'chapterId', description: 'ID chủ đề' })
  @ApiResponse({ status: 200, description: 'Chủ đề đã được xóa.' })
  @ApiResponse({ status: 404, description: 'Chủ đề không tồn tại.' })
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
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Sắp xếp lại thứ tự chủ đề' })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { chapterIds: { type: 'array', items: { type: 'string' } } },
    },
  })
  @ApiResponse({ status: 200, description: 'Đã sắp xếp lại.' })
  async reorderChapters(
    @Param('courseId') courseId: string,
    @Body('chapterIds') chapterIds: string[],
  ): Promise<void> {
    return this.topicService.reorderChapters(courseId, chapterIds);
  }
}

@Controller('course/:courseId/chapters/:chapterId/topics')
@ApiTags('course-topics')
@ApiCookieAuth('access_token')
export class CourseTopicController {
  constructor(private readonly topicService: TopicService) {}

  @Post()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Tạo chuyên đề mới trong chủ đề (khoá học)' })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiParam({ name: 'chapterId', description: 'ID chủ đề' })
  @ApiBody({ type: TopicCreateDto })
  @ApiResponse({
    status: 201,
    description: 'Chuyên đề đã được tạo.',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Lỗi khi tạo chuyên đề.' })
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
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Lấy danh sách chuyên đề trong chủ đề (khoá học)' })
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
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Sắp xếp lại thứ tự chuyên đề trong chủ đề' })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiParam({ name: 'chapterId', description: 'ID chủ đề' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { topicIds: { type: 'array', items: { type: 'string' } } },
    },
  })
  @ApiResponse({ status: 200, description: 'Đã sắp xếp lại.' })
  async reorderTopics(
    @Param('courseId') courseId: string,
    @Param('chapterId') chapterId: string,
    @Body('topicIds') topicIds: string[],
  ): Promise<void> {
    return this.topicService.reorderTopics(topicIds, { chapterId });
  }
}

@Controller('class/:classId/topics')
@ApiTags('class-topics')
@ApiCookieAuth('access_token')
export class ClassTopicController {
  constructor(private readonly topicService: TopicService) {}

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
      return this.topicService.getTopicForStudent(topicId, studentId, classId);
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
    @Param('classId', new ParseClassIdPipe()) classId: string,
    @Body('topicIds') topicIds: string[],
  ): Promise<void> {
    return this.topicService.reorderTopics(topicIds, { classId });
  }
}

@Controller('topics/:topicId/lectures')
@ApiTags('topic-lectures')
@ApiCookieAuth('access_token')
export class LectureController {
  constructor(private readonly topicService: TopicService) {}

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
  async reorderLectures(
    @Param('topicId') topicId: string,
    @Body('lectureIds') lectureIds: string[],
  ): Promise<void> {
    return this.topicService.reorderLectures(topicId, lectureIds);
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
    description: 'Không đủ quyền — học sinh phải dùng route student-classes.',
  })
  async getLectureQuizzes(
    @Param('topicId') topicId: string,
    @Param('lectureId') lectureId: string,
  ) {
    return this.topicService.getLectureQuizzes(lectureId);
  }
}

@Controller('class/:classId/content')
@ApiTags('class-content')
@ApiCookieAuth('access_token')
export class ClassContentController {
  constructor(private readonly topicService: TopicService) {}

  @Post()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Thêm nội dung vào lớp học' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiBody({ type: ClassContentCreateDto })
  @ApiResponse({ status: 201, description: 'Đã thêm nội dung.' })
  @ApiResponse({ status: 400, description: 'Lỗi dữ liệu đầu vào.' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
    @Body() dto: ClassContentCreateDto,
  ) {
    return this.topicService.createClassContentItem(classId, dto, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Get()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Lấy danh sách nội dung lớp học' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiResponse({ status: 200, description: 'Danh sách nội dung.' })
  async listItems(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
  ) {
    return this.topicService.listClassContentItems(classId, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Get('course-topics')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Lấy danh sách chuyên đề từ khoá học của lớp' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiResponse({ status: 200, description: 'Danh sách chuyên đề từ khoá học.' })
  async listCourseTopics(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
  ): Promise<CourseTopicForClassDto[]> {
    return this.topicService.listCourseTopicsForClass(classId, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Post('reorder')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Sắp xếp lại thứ tự nội dung lớp học' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { orderedIds: { type: 'array', items: { type: 'string' } } },
    },
  })
  @ApiResponse({ status: 200, description: 'Đã sắp xếp lại.' })
  async reorder(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
    @Body('orderedIds') orderedIds: string[],
  ) {
    return this.topicService.reorderClassContentItems(classId, orderedIds, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch(':itemId')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({
    summary: 'Cập nhật lịch lần giao (openAt, durationMinutes) — không sửa đề',
  })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiParam({ name: 'itemId', description: 'ID lần giao / class content item' })
  @ApiBody({ type: ClassContentScheduleUpdateDto })
  @ApiResponse({ status: 200, description: 'Đã cập nhật lịch lần giao.' })
  @ApiResponse({ status: 400, description: 'Không phải chuyên đề luyện tập.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lần giao.' })
  async updateSchedule(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
    @Param('itemId') itemId: string,
    @Body() dto: ClassContentScheduleUpdateDto,
  ) {
    return this.topicService.updateClassContentSchedule(classId, itemId, dto, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Delete(':itemId')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant, StaffRole.teacher)
  @ApiOperation({ summary: 'Xóa nội dung lớp học' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiParam({ name: 'itemId', description: 'ID nội dung' })
  @ApiResponse({ status: 200, description: 'Đã xóa.' })
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.topicService.deleteClassContentItem(classId, itemId, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Get('student')
  @Roles(UserRole.student)
  @ApiOperation({ summary: 'Lấy danh sách nội dung lớp học cho học sinh' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiResponse({ status: 200, description: 'Danh sách nội dung.' })
  async listForStudent(
    @CurrentUser() user: JwtPayload,
    @Param('classId', new ParseClassIdPipe()) classId: string,
  ) {
    const studentId = await this.topicService.findStudentIdByUserId(user.id);
    if (!studentId) {
      throw new NotFoundException('Student profile not found');
    }
    return this.topicService.listClassContentForStudent(classId, studentId);
  }
}

@Controller('topics/:topicId/questions')
@ApiTags('practice-topic-questions')
@ApiCookieAuth('access_token')
export class PracticeTopicQuestionController {
  constructor(private readonly topicService: TopicService) {}

  @Get()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(
    StaffRole.assistant,
    StaffRole.lesson_plan,
    StaffRole.lesson_plan_head,
    StaffRole.teacher,
  )
  @ApiOperation({ summary: 'Lấy danh sách câu hỏi của chuyên đề luyện tập' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề luyện tập' })
  @ApiResponse({ status: 200, description: 'Danh sách câu hỏi.' })
  async getQuestions(@Param('topicId') topicId: string) {
    return this.topicService.getQuestionsByTopicId(topicId);
  }

  @Post()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(
    StaffRole.assistant,
    StaffRole.lesson_plan,
    StaffRole.lesson_plan_head,
    StaffRole.teacher,
  )
  @ApiOperation({ summary: 'Thêm câu hỏi vào chuyên đề luyện tập' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề luyện tập' })
  @ApiBody({ type: QuestionLinkCreateDto })
  @ApiResponse({ status: 201, description: 'Đã thêm câu hỏi.' })
  @ApiResponse({ status: 400, description: 'Lỗi dữ liệu đầu vào.' })
  async addQuestion(
    @CurrentUser() user: JwtPayload,
    @Param('topicId') topicId: string,
    @Body() dto: QuestionLinkCreateDto,
  ) {
    return this.topicService.addQuestionToTopic(topicId, dto, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch(':linkId')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(
    StaffRole.assistant,
    StaffRole.lesson_plan,
    StaffRole.lesson_plan_head,
    StaffRole.teacher,
  )
  @ApiOperation({ summary: 'Cập nhật thứ tự/điểm câu hỏi' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề luyện tập' })
  @ApiParam({ name: 'linkId', description: 'ID liên kết câu hỏi' })
  @ApiBody({ type: QuestionLinkUpdateDto })
  @ApiResponse({ status: 200, description: 'Đã cập nhật.' })
  async updateQuestionLink(
    @CurrentUser() user: JwtPayload,
    @Param('topicId') topicId: string,
    @Param('linkId') linkId: string,
    @Body() dto: QuestionLinkUpdateDto,
  ) {
    return this.topicService.updateQuestionLink(topicId, linkId, dto, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Delete(':linkId')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(
    StaffRole.assistant,
    StaffRole.lesson_plan,
    StaffRole.lesson_plan_head,
    StaffRole.teacher,
  )
  @ApiOperation({ summary: 'Xóa câu hỏi khỏi chuyên đề luyện tập' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề luyện tập' })
  @ApiParam({ name: 'linkId', description: 'ID liên kết câu hỏi' })
  @ApiResponse({ status: 200, description: 'Đã xóa.' })
  async removeQuestion(
    @CurrentUser() user: JwtPayload,
    @Param('topicId') topicId: string,
    @Param('linkId') linkId: string,
  ) {
    return this.topicService.removeQuestionFromTopic(topicId, linkId, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Post('reorder')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(
    StaffRole.assistant,
    StaffRole.lesson_plan,
    StaffRole.lesson_plan_head,
    StaffRole.teacher,
  )
  @ApiOperation({ summary: 'Sắp xếp lại thứ tự câu hỏi' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề luyện tập' })
  @ApiBody({ type: ReorderQuestionLinksDto })
  @ApiResponse({ status: 200, description: 'Đã sắp xếp lại.' })
  async reorderQuestions(
    @CurrentUser() user: JwtPayload,
    @Param('topicId') topicId: string,
    @Body() dto: ReorderQuestionLinksDto,
  ) {
    return this.topicService.reorderQuestionLinks(topicId, dto.linkIds, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Get('summary')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(
    StaffRole.assistant,
    StaffRole.lesson_plan,
    StaffRole.lesson_plan_head,
    StaffRole.teacher,
  )
  @ApiOperation({ summary: 'Tổng quan câu hỏi và điểm' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề luyện tập' })
  @ApiResponse({ status: 200, description: 'Tổng số câu hỏi và tổng điểm.' })
  async getSummary(@Param('topicId') topicId: string) {
    return this.topicService.getQuestionLinkSummary(topicId);
  }

  @Get('is-assigned')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(StaffRole.assistant)
  @ApiOperation({ summary: 'Kiểm tra chuyên đề đã được giao cho lớp nào chưa' })
  @ApiParam({ name: 'topicId', description: 'ID chuyên đề luyện tập' })
  @ApiResponse({ status: 200, description: 'Đã giao hay chưa.' })
  async isAssigned(@Param('topicId') topicId: string) {
    const assigned = await this.topicService.isTopicAssignedToClass(topicId);
    return { assigned };
  }
}

// ─── Exam Library (practice topics at course level, chapterId null) ───

@Controller('course/:courseId/exam-library')
@ApiTags('exam-library')
@ApiCookieAuth('access_token')
export class CourseExamLibraryController {
  constructor(private readonly topicService: TopicService) {}

  @Get()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(
    StaffRole.assistant,
    StaffRole.lesson_plan,
    StaffRole.lesson_plan_head,
  )
  @ApiOperation({ summary: 'Thư viện đề thi — danh sách đề thi của khoá học' })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Danh sách đề thi.' })
  async list(
    @Param('courseId') courseId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.topicService.getExamLibrary(courseId, {
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post()
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(
    StaffRole.assistant,
    StaffRole.lesson_plan,
    StaffRole.lesson_plan_head,
  )
  @ApiOperation({ summary: 'Tạo đề thi mới trong thư viện' })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiBody({ type: TopicCreateDto })
  @ApiResponse({ status: 201, description: 'Đề thi đã được tạo.' })
  @ApiResponse({ status: 400, description: 'Lỗi dữ liệu đầu vào.' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('courseId') courseId: string,
    @Body() dto: TopicCreateDto,
  ): Promise<TopicResponseDto> {
    return this.topicService.createExamTopic(courseId, dto, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch(':topicId')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(
    StaffRole.assistant,
    StaffRole.lesson_plan,
    StaffRole.lesson_plan_head,
  )
  @ApiOperation({ summary: 'Cập nhật đề thi trong thư viện' })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiParam({ name: 'topicId', description: 'ID đề thi' })
  @ApiBody({ type: TopicUpdateDto })
  @ApiResponse({ status: 200, description: 'Đề thi đã được cập nhật.' })
  @ApiResponse({ status: 404, description: 'Đề thi không tồn tại.' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('courseId') _courseId: string,
    @Param('topicId') topicId: string,
    @Body() dto: TopicUpdateDto,
  ): Promise<TopicResponseDto> {
    return this.topicService.updateExamTopic(topicId, dto, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Delete(':topicId')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(
    StaffRole.assistant,
    StaffRole.lesson_plan,
    StaffRole.lesson_plan_head,
  )
  @ApiOperation({ summary: 'Xóa đề thi khỏi thư viện' })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiParam({ name: 'topicId', description: 'ID đề thi' })
  @ApiResponse({ status: 200, description: 'Đề thi đã được xóa.' })
  @ApiResponse({ status: 404, description: 'Đề thi không tồn tại.' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('courseId') _courseId: string,
    @Param('topicId') topicId: string,
  ): Promise<void> {
    return this.topicService.deleteExamTopic(topicId, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Post('reorder')
  @Roles(UserRole.admin)
  @AllowStaffRolesOnAdminRoutes(
    StaffRole.assistant,
    StaffRole.lesson_plan,
    StaffRole.lesson_plan_head,
  )
  @ApiOperation({ summary: 'Sắp xếp lại thứ tự đề thi trong thư viện' })
  @ApiParam({ name: 'courseId', description: 'ID khoá học' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { topicIds: { type: 'array', items: { type: 'string' } } },
    },
  })
  @ApiResponse({ status: 200, description: 'Đã sắp xếp lại.' })
  async reorder(
    @Param('courseId') courseId: string,
    @Body('topicIds') topicIds: string[],
  ): Promise<void> {
    return this.topicService.reorderExamTopics(courseId, topicIds);
  }
}
