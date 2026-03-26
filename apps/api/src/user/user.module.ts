import { Module } from '@nestjs/common';
import { ActionHistoryModule } from 'src/action-history/action-history.module';
import { BonusModule } from 'src/bonus/bonus.module';
import { ExtraAllowanceModule } from 'src/extra-allowance/extra-allowance.module';
import { LessonModule } from 'src/lesson/lesson.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SessionModule } from 'src/session/session.module';
import { StaffModule } from 'src/staff/staff.module';
import { UserController } from './user.controller';
import { UserProfileController } from './user-profile.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    PrismaModule,
    ActionHistoryModule,
    StaffModule,
    BonusModule,
    SessionModule,
    ExtraAllowanceModule,
    LessonModule,
  ],
  controllers: [UserController, UserProfileController],
  providers: [UserService],
})
export class UserModule {}
