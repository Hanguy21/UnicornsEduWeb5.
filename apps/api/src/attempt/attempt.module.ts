import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TopicModule } from 'src/topic/topic.module';
import { StudentAttemptController } from './attempt.controller';
import { AttemptService } from './attempt.service';

@Module({
  imports: [PrismaModule, TopicModule],
  controllers: [StudentAttemptController],
  providers: [AttemptService],
  exports: [AttemptService],
})
export class AttemptModule {}
