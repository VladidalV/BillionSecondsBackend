import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import configuration from './config/configuration';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { EventHistory } from './entities/event-history.entity';
import { Profile } from './entities/profile.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { ScheduledNotification } from './entities/scheduled-notification.entity';
import { TimeCapsule } from './entities/time-capsule.entity';
import { User } from './entities/user.entity';
import { UserMilestoneProgress } from './entities/user-milestone-progress.entity';
import { UserSettings } from './entities/user-settings.entity';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { CapsulesModule } from './modules/capsules/capsules.module';
import { EventHistoryModule } from './modules/event-history/event-history.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SyncModule } from './modules/sync/sync.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        entities: [
          User,
          Profile,
          UserSettings,
          EventHistory,
          TimeCapsule,
          UserMilestoneProgress,
          ScheduledNotification,
          AnalyticsEvent,
          RefreshToken,
        ],
        migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
        synchronize: config.get('nodeEnv') === 'development',
        logging: config.get('nodeEnv') === 'development',
      }),
    }),

    AuthModule,
    ProfilesModule,
    SettingsModule,
    EventHistoryModule,
    CapsulesModule,
    MilestonesModule,
    SyncModule,
    NotificationsModule,
    AnalyticsModule,
    UsersModule,
  ],
})
export class AppModule {}
