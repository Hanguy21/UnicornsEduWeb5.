import { Module } from '@nestjs/common';
import { ActionHistoryModule } from '../action-history/action-history.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DeductionSettingsController } from './deduction-settings.controller';
import { DeductionSettingsService } from './deduction-settings.service';

@Module({
  imports: [PrismaModule, ActionHistoryModule],
  controllers: [DeductionSettingsController],
  providers: [DeductionSettingsService],
  exports: [DeductionSettingsService],
})
export class DeductionSettingsModule {}
