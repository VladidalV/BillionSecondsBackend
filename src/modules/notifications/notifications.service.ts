import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Profile } from '../../entities/profile.entity';
import {
  NotificationType,
  ScheduledNotification,
} from '../../entities/scheduled-notification.entity';
import { UserSettings } from '../../entities/user-settings.entity';

const MILESTONE_THRESHOLDS: { id: string; seconds: number }[] = [
  { id: '100m', seconds: 100_000_000 },
  { id: '250m', seconds: 250_000_000 },
  { id: '500m', seconds: 500_000_000 },
  { id: '750m', seconds: 750_000_000 },
  { id: '1b',   seconds: 1_000_000_000 },
];

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(ScheduledNotification)
    private readonly notifRepo: Repository<ScheduledNotification>,
    @InjectRepository(UserSettings)
    private readonly settingsRepo: Repository<UserSettings>,
  ) {}

  async rescheduleForProfile(profile: Profile): Promise<void> {
    await this.cancelForProfile(profile.id);

    const settings = await this.settingsRepo.findOne({ where: { userId: profile.userId } });
    if (!settings?.notificationsEnabled) return;

    const birthMs = this.profileBirthMs(profile);
    const isPrimary = profile.isPrimary;
    const approachType = isPrimary ? NotificationType.MILESTONE_APPROACHING : NotificationType.FAMILY_MILESTONE_APPROACHING;
    const reachedType = isPrimary ? NotificationType.MILESTONE_REACHED : NotificationType.FAMILY_MILESTONE_REACHED;

    const enabled = isPrimary ? settings.milestoneRemindersEnabled : settings.familyRemindersEnabled;
    if (!enabled) return;

    const now = Date.now();
    const newNotifs: Partial<ScheduledNotification>[] = [];

    for (const milestone of MILESTONE_THRESHOLDS) {
      const milestoneMs = birthMs + milestone.seconds * 1000;
      if (milestoneMs <= now) continue;

      const deeplink = isPrimary
        ? `billionseconds://milestones?profile_id=${profile.id}`
        : `billionseconds://event?profile_id=${profile.id}&source=notification`;

      // -7 days, -1 day, -1 hour, exact
      const offsets = [
        { ms: -7 * 24 * 3600 * 1000, type: approachType },
        { ms: -1 * 24 * 3600 * 1000, type: approachType },
        { ms: -3600 * 1000, type: approachType },
        { ms: 0, type: reachedType },
      ];

      for (const offset of offsets) {
        const scheduledAt = new Date(milestoneMs + offset.ms);
        if (scheduledAt.getTime() <= now) continue;

        newNotifs.push({
          userId: profile.userId,
          profileId: profile.id,
          type: offset.type,
          scheduledAt,
          payload: {
            milestone_id: milestone.id,
            profile_name: profile.name,
            deeplink,
          },
        });
      }
    }

    if (newNotifs.length > 0) {
      await this.notifRepo.save(this.notifRepo.create(newNotifs as any));
    }
  }

  async cancelForProfile(profileId: string): Promise<void> {
    await this.notifRepo
      .createQueryBuilder()
      .update()
      .set({ cancelledAt: new Date() })
      .where('profile_id = :profileId AND sent_at IS NULL AND cancelled_at IS NULL', { profileId })
      .execute();
  }

  async cancelByTypeForUser(userId: string, types: NotificationType[]): Promise<void> {
    if (types.length === 0) return;
    await this.notifRepo
      .createQueryBuilder()
      .update()
      .set({ cancelledAt: new Date() })
      .where(
        'user_id = :userId AND type IN (:...types) AND sent_at IS NULL AND cancelled_at IS NULL',
        { userId, types },
      )
      .execute();
  }

  private profileBirthMs(profile: Profile): number {
    return new Date(
      profile.birthYear,
      profile.birthMonth - 1,
      profile.birthDay,
      profile.birthHour,
      profile.birthMinute,
    ).getTime();
  }
}
