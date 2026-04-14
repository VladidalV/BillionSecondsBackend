import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Profile } from './profile.entity';

export enum UnlockConditionType {
  EXACT_DATE_TIME = 'exact_date_time',
  BILLION_SECONDS_EVENT = 'billion_seconds_event',
}

@Entity('time_capsules')
export class TimeCapsule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.capsules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'varchar', length: 80 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'recipient_profile_id', type: 'uuid', nullable: true })
  recipientProfileId: string | null;

  @ManyToOne(() => Profile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recipient_profile_id' })
  recipientProfile: Profile | null;

  @Column({
    name: 'unlock_condition_type',
    type: 'enum',
    enum: UnlockConditionType,
  })
  unlockConditionType: UnlockConditionType;

  @Column({ name: 'unlock_at_epoch_ms', type: 'bigint', nullable: true })
  unlockAtEpochMs: string | null;

  @Column({ name: 'unlock_profile_id', type: 'uuid', nullable: true })
  unlockProfileId: string | null;

  @ManyToOne(() => Profile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unlock_profile_id' })
  unlockProfile: Profile | null;

  @Column({ name: 'is_draft', type: 'boolean', default: false })
  isDraft: boolean;

  @Column({ name: 'opened_at', type: 'timestamptz', nullable: true })
  openedAt: Date | null;
}
