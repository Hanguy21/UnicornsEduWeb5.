import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns a hello message.',
  })
  @ApiResponse({ status: 200, description: 'Success.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
