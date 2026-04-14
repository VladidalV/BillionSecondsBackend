import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Profile } from './profile.entity';
import { UserSettings } from './user-settings.entity';
import { TimeCapsule } from './time-capsule.entity';
import { AnalyticsEvent } from './analytics-event.entity';
import { ScheduledNotification } from './scheduled-notification.entity';
import { RefreshToken } from './refresh-token.entity';

export enum AuthProvider {
  ANONYMOUS = 'anonymous',
  APPLE = 'apple',
  GOOGLE = 'google',
  EMAIL = 'email',
}

export enum Platform {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'anonymous_id', type: 'varchar', nullable: true })
  anonymousId: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({ name: 'display_name', type: 'varchar', nullable: true })
  displayName: string | null;

  @Column({
    name: 'auth_provider',
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.ANONYMOUS,
  })
  authProvider: AuthProvider;

  @Column({ name: 'auth_provider_id', type: 'varchar', nullable: true })
  authProviderId: string | null;

  @Column({ name: 'fcm_token', type: 'varchar', nullable: true })
  fcmToken: string | null;

  @Column({ type: 'enum', enum: Platform, nullable: true })
  platform: Platform | null;

  @Column({ name: 'app_version', type: 'varchar', nullable: true })
  appVersion: string | null;

  @Column({ type: 'varchar', nullable: true })
  timezone: string | null;

  @Column({ type: 'varchar', nullable: true })
  locale: string | null;

  @OneToMany(() => Profile, (profile) => profile.user)
  profiles: Profile[];

  @OneToOne(() => UserSettings, (settings) => settings.user)
  settings: UserSettings;

  @OneToMany(() => TimeCapsule, (capsule) => capsule.user)
  capsules: TimeCapsule[];

  @OneToMany(() => AnalyticsEvent, (event) => event.user)
  analyticsEvents: AnalyticsEvent[];

  @OneToMany(() => ScheduledNotification, (notif) => notif.user)
  scheduledNotifications: ScheduledNotification[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];
}
