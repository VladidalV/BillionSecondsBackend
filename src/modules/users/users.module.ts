import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Profile } from '../../entities/profile.entity';
import { UserSettings } from '../../entities/user-settings.entity';
import { EventHistory } from '../../entities/event-history.entity';
import { TimeCapsule } from '../../entities/time-capsule.entity';
import { UserMilestoneProgress } from '../../entities/user-milestone-progress.entity';
import { AnalyticsEvent } from '../../entities/analytics-event.entity';
import { SyncModule } from '../sync/sync.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Profile,
      UserSettings,
      EventHistory,
      TimeCapsule,
      UserMilestoneProgress,
      AnalyticsEvent,
    ]),
    SyncModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
