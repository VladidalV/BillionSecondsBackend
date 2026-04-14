import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Profile } from './profile.entity';

@Entity('user_settings')
export class UserSettings {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => User, (user) => user.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'active_profile_id', type: 'uuid', nullable: true })
  activeProfileId: string | null;

  @ManyToOne(() => Profile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'active_profile_id' })
  activeProfile: Profile | null;

  @Column({ name: 'onboarding_completed', type: 'boolean', default: false })
  onboardingCompleted: boolean;

  @Column({ name: 'notifications_enabled', type: 'boolean', default: false })
  notificationsEnabled: boolean;

  @Column({ name: 'milestone_reminders_enabled', type: 'boolean', default: true })
  milestoneRemindersEnabled: boolean;

  @Column({ name: 'family_reminders_enabled', type: 'boolean', default: true })
  familyRemindersEnabled: boolean;

  @Column({ name: 'reengagement_enabled', type: 'boolean', default: true })
  reengagementEnabled: boolean;

  @Column({ name: 'approximate_labels_enabled', type: 'boolean', default: true })
  approximateLabelsEnabled: boolean;

  @Column({ name: 'use_24_hour_format', type: 'boolean', default: false })
  use24HourFormat: boolean;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
