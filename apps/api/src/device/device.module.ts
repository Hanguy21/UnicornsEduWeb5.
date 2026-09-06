import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActionHistoryModule } from 'src/action-history/action-history.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';

@Module({
  imports: [PrismaModule, ConfigModule, ActionHistoryModule],
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
