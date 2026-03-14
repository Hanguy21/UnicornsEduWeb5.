import { SessionService } from './session.service';
import { Controller, Get, Query, Param } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@Controller('sessions')
@ApiTags('sessions')
@ApiCookieAuth('access_token')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('/staff/:staffId')
  @ApiOperation({ summary: 'Lấy session theo staff + tháng/năm' })
  @ApiParam({ name: 'staffId', description: 'ID staff' })
  @ApiQuery({ name: 'month', required: true, description: 'Tháng (01-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Năm (YYYY)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách session của staff trong tháng.',
  })
  @ApiResponse({ status: 400, description: 'month/year không hợp lệ.' })
  async getSessionsByTeacherId(
    @Param('staffId') teacherId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.sessionService.getSessionsByTeacherId(teacherId, month, year);
  }

  @Get('/class/:classId')
  @ApiOperation({ summary: 'Lấy session theo class + tháng/năm' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiQuery({ name: 'month', required: true, description: 'Tháng (01-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Năm (YYYY)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách session của lớp trong tháng.',
  })
  @ApiResponse({ status: 400, description: 'month/year không hợp lệ.' })
  async getSessionsByClassId(
    @Param('classId') classId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    console.log(month, year);
    return this.sessionService.getSessionsByClassId(classId, month, year);
  }
}
