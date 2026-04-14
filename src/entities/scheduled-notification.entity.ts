import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Profile } from './profile.entity';
import { TimeCapsule } from './time-capsule.entity';

export enum NotificationType {
  MILESTONE_APPROACHING = 'milestone_approaching',
  MILESTONE_REACHED = 'milestone_reached',
  FAMILY_MILESTONE_APPROACHING = 'family_milestone_approaching',
  FAMILY_MILESTONE_REACHED = 'family_milestone_reached',
  REENGAGEMENT = 'reengagement',
  CAPSULE_UNLOCKED = 'capsule_unlocked',
}

@Entity('scheduled_notifications')
export class ScheduledNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.scheduledNotifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'profile_id', type: 'uuid', nullable: true })
  profileId: string | null;

  @ManyToOne(() => Profile, (profile) => profile.scheduledNotifications, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile: Profile | null;

  @Column({ name: 'capsule_id', type: 'uuid', nullable: true })
  capsuleId: string | null;

  @ManyToOne(() => TimeCapsule, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'capsule_id' })
  capsule: TimeCapsule | null;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, any>;
}
