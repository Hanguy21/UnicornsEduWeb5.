import { Controller, Get, Post, Patch, Delete, Param, Query, Body, ParseUUIDPipe, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiConflictResponse } from '@nestjs/swagger';
import { QuestionService } from './question.service';
import { CreateQuestionDto, UpdateQuestionDto, QuestionFilterDto } from '../dtos/question.dto';

@ApiTags('question')
@Controller('questions')
export class QuestionController {
  constructor(private readonly service: QuestionService) {}

  @Get()
  @ApiOperation({ summary: 'List questions with optional filters' })
  async list(
    @Query() filter: QuestionFilterDto,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
  ) {
    return this.service.list(filter, skip, take);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single question by ID' })
  @ApiNotFoundResponse({ description: 'Question not found' })
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new question' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async create(@Body() dto: CreateQuestionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing question' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Question not found' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQuestionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft‑delete a question' })
  @ApiConflictResponse({ description: 'Question is used by practice topics' })
  @ApiNotFoundResponse({ description: 'Question not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('force', new DefaultValuePipe(false), ParseBoolPipe) force: boolean,
  ) {
    return this.service.delete(id, force);
  }
}
