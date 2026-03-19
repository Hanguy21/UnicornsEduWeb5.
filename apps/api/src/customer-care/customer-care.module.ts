import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CustomerCareController } from './customer-care.controller';
import { CustomerCareService } from './customer-care.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerCareController],
  providers: [CustomerCareService],
  exports: [CustomerCareService],
})
export class CustomerCareModule {}
