import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StudentService } from './student.service';
import { UpdateStudentDto } from 'src/dtos/student.dto';

@ApiTags('student')
@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  @ApiOperation({ summary: 'List students', description: 'Get all students.' })
  @ApiResponse({ status: 200, description: 'List of students.' })
  async getStudents() {
    return this.studentService.getStudents();
  }

  @Patch('update-student')
  @ApiOperation({
    summary: 'Update student',
    description: 'Update a student by payload.',
  })
  @ApiBody({
    type: UpdateStudentDto,
    description: 'Student update payload (id required)',
  })
  @ApiResponse({ status: 200, description: 'Updated student.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Student not found.' })
  async updateStudent(@Body() data: UpdateStudentDto) {
    return this.studentService.updateStudent(data);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get student by ID',
    description: 'Get a student by ID.',
  })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student found.' })
  @ApiResponse({ status: 404, description: 'Student not found.' })
  async getStudentById(@Param('id') id: string) {
    return this.studentService.getStudentById(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete student',
    description: 'Delete a student by ID.',
  })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student deleted.' })
  @ApiResponse({ status: 404, description: 'Student not found.' })
  async deleteStudent(@Param('id') id: string) {
    return this.studentService.deleteStudent(id);
  }
}
