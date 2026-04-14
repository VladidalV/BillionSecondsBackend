import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Profile } from './profile.entity';

@Entity('event_history')
@Unique(['userId', 'profileId'])
export class EventHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'profile_id' })
  profileId: string;

  @OneToOne(() => Profile, (profile) => profile.eventHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profile_id' })
  profile: Profile;

  @Column({ name: 'first_shown_at', type: 'timestamptz', nullable: true })
  firstShownAt: Date | null;

  @Column({ name: 'celebration_shown_at', type: 'timestamptz', nullable: true })
  celebrationShownAt: Date | null;

  @Column({ name: 'share_prompt_shown_at', type: 'timestamptz', nullable: true })
  sharePromptShownAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
