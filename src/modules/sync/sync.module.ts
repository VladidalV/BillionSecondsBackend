import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Profile } from '../../entities/profile.entity';
import { UserSettings } from '../../entities/user-settings.entity';
import { EventHistory } from '../../entities/event-history.entity';
import { TimeCapsule } from '../../entities/time-capsule.entity';
import { UserMilestoneProgress } from '../../entities/user-milestone-progress.entity';
import { ProfilesModule } from '../profiles/profiles.module';
import { SettingsModule } from '../settings/settings.module';
import { EventHistoryModule } from '../event-history/event-history.module';
import { CapsulesModule } from '../capsules/capsules.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile, UserSettings, EventHistory, TimeCapsule, UserMilestoneProgress]),
    ProfilesModule,
    SettingsModule,
    EventHistoryModule,
    CapsulesModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
