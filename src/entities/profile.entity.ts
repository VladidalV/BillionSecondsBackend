import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { EventHistory } from './event-history.entity';
import { UserMilestoneProgress } from './user-milestone-progress.entity';
import { ScheduledNotification } from './scheduled-notification.entity';

export enum RelationType {
  SELF = 'SELF',
  CHILD = 'CHILD',
  PARTNER = 'PARTNER',
  MOTHER = 'MOTHER',
  FATHER = 'FATHER',
  SIBLING = 'SIBLING',
  OTHER = 'OTHER',
}

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.profiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ name: 'relation_type', type: 'enum', enum: RelationType })
  relationType: RelationType;

  @Column({ name: 'custom_relation_name', type: 'varchar', length: 80, nullable: true })
  customRelationName: string | null;

  @Column({ name: 'birth_year', type: 'smallint' })
  birthYear: number;

  @Column({ name: 'birth_month', type: 'smallint' })
  birthMonth: number;

  @Column({ name: 'birth_day', type: 'smallint' })
  birthDay: number;

  @Column({ name: 'birth_hour', type: 'smallint', default: 12 })
  birthHour: number;

  @Column({ name: 'birth_minute', type: 'smallint', default: 0 })
  birthMinute: number;

  @Column({ name: 'unknown_birth_time', type: 'boolean', default: false })
  unknownBirthTime: boolean;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder: number;

  @OneToOne(() => EventHistory, (eh) => eh.profile)
  eventHistory: EventHistory;

  @OneToMany(() => UserMilestoneProgress, (mp) => mp.profile)
  milestoneProgress: UserMilestoneProgress[];

  @OneToMany(() => ScheduledNotification, (notif) => notif.profile)
  scheduledNotifications: ScheduledNotification[];
}
