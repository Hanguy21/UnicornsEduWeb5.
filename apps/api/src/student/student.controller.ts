import { Body, Controller, Delete, Get, Param, Patch, Put } from "@nestjs/common";
import { StudentService } from "./student.service";
import { type UpdateStudentDto } from "src/dtos/student.dto";


@Controller('student')
export class StudentController {
    constructor(private readonly studentService: StudentService) { }

    @Get()
    async getStudents() {
        return this.studentService.getStudents();
    }

    @Patch('update-student')
    async updateStudent(@Body() data: UpdateStudentDto) {
        return this.studentService.updateStudent(data);
    }

    @Get(':id')
    async getStudentById(@Param('id') id: string) {
        return this.studentService.getStudentById(id);
    }

    @Delete(':id')
    async deleteStudent(@Param('id') id: string) {
        return this.studentService.deleteStudent(id);
    }

}