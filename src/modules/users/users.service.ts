import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Profile } from '../../entities/profile.entity';
import { UserSettings } from '../../entities/user-settings.entity';
import { EventHistory } from '../../entities/event-history.entity';
import { TimeCapsule } from '../../entities/time-capsule.entity';
import { UserMilestoneProgress } from '../../entities/user-milestone-progress.entity';
import { AnalyticsEvent } from '../../entities/analytics-event.entity';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { MigrateDto } from './dto/migrate.dto';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Profile) private readonly profilesRepo: Repository<Profile>,
    @InjectRepository(UserSettings) private readonly settingsRepo: Repository<UserSettings>,
    @InjectRepository(EventHistory) private readonly eventHistoryRepo: Repository<EventHistory>,
    @InjectRepository(TimeCapsule) private readonly capsulesRepo: Repository<TimeCapsule>,
    @InjectRepository(UserMilestoneProgress) private readonly milestoneRepo: Repository<UserMilestoneProgress>,
    @InjectRepository(AnalyticsEvent) private readonly analyticsRepo: Repository<AnalyticsEvent>,
    private readonly dataSource: DataSource,
    private readonly syncService: SyncService,
  ) {}

  async updateDevice(userId: string, dto: UpdateDeviceDto): Promise<void> {
    await this.usersRepo.update(userId, {
      fcmToken: dto.fcm_token,
      platform: dto.platform as any,
      appVersion: dto.app_version,
      timezone: dto.timezone,
    });
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(AnalyticsEvent, { userId });
      await manager.delete(UserMilestoneProgress, { userId });
      await manager.delete(EventHistory, { userId });
      await manager.delete(TimeCapsule, { userId });
      await manager.delete(Profile, { userId });
      await manager.delete(UserSettings, { userId });
      await manager.delete(User, { id: userId });
    });
  }

  async resetAccount(userId: string, confirm: boolean): Promise<void> {
    if (!confirm) {
      throw new BadRequestException({
        error: { code: 'CONFIRM_REQUIRED', message: 'Set confirm: true to proceed', field: 'confirm' },
      });
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(UserMilestoneProgress, { userId });
      await manager.delete(EventHistory, { userId });
      await manager.delete(TimeCapsule, { userId });
      await manager.softDelete(Profile, { userId });
      await manager.update(UserSettings, { userId }, {
        activeProfileId: null,
        onboardingCompleted: false,
      });
    });
  }

  async exportData(userId: string) {
    const syncData = await this.syncService.getSync(userId);
    return syncData;
  }

  async migrateData(userId: string, dto: MigrateDto) {
    const idMapping: { local_id: string; server_id: string }[] = [];

    await this.dataSource.transaction(async (manager) => {
      const profileLocalToServer: Record<string, string> = {};

      // Migrate profiles
      for (const p of dto.profiles) {
        const existing = await manager.findOne(Profile, {
          where: { userId, name: p.name, birthYear: p.birth_year, birthMonth: p.birth_month, birthDay: p.birth_day, deletedAt: IsNull() },
        });

        let serverId: string;
        if (existing) {
          serverId = existing.id;
        } else {
          const count = await manager.count(Profile, { where: { userId, deletedAt: IsNull() } });
          const profile = manager.create(Profile, {
            userId,
            name: p.name,
            relationType: p.relation_type,
            customRelationName: p.custom_relation_name ?? null,
            birthYear: p.birth_year,
            birthMonth: p.birth_month,
            birthDay: p.birth_day,
            birthHour: p.birth_hour ?? 12,
            birthMinute: p.birth_minute ?? 0,
            unknownBirthTime: p.unknown_birth_time ?? false,
            isPrimary: count === 0,
            sortOrder: p.sort_order ?? count,
          });
          const saved = await manager.save(Profile, profile);
          serverId = saved.id;
        }

        profileLocalToServer[p.local_id] = serverId;
        idMapping.push({ local_id: p.local_id, server_id: serverId });
      }

      // Active profile
      if (dto.active_profile_local_id && profileLocalToServer[dto.active_profile_local_id]) {
        await manager.update(UserSettings, { userId }, {
          activeProfileId: profileLocalToServer[dto.active_profile_local_id],
        });
      }

      // Settings (excluding active_profile_id)
      if (dto.settings) {
        const { active_profile_id, ...rest } = dto.settings;
        const settingsUpdate: Partial<UserSettings> = {};
        if (rest.onboarding_completed !== undefined) settingsUpdate.onboardingCompleted = rest.onboarding_completed;
        if (rest.notifications_enabled !== undefined) settingsUpdate.notificationsEnabled = rest.notifications_enabled;
        if (rest.milestone_reminders_enabled !== undefined) settingsUpdate.milestoneRemindersEnabled = rest.milestone_reminders_enabled;
        if (rest.family_reminders_enabled !== undefined) settingsUpdate.familyRemindersEnabled = rest.family_reminders_enabled;
        if (rest.reengagement_enabled !== undefined) settingsUpdate.reengagementEnabled = rest.reengagement_enabled;
        if (rest.approximate_labels_enabled !== undefined) settingsUpdate.approximateLabelsEnabled = rest.approximate_labels_enabled;
        if (rest.use_24_hour_format !== undefined) settingsUpdate.use24HourFormat = rest.use_24_hour_format;
        if (Object.keys(settingsUpdate).length > 0) {
          await manager.update(UserSettings, { userId }, settingsUpdate);
        }
      }

      // Event history
      for (const eh of dto.event_history ?? []) {
        const profileId = profileLocalToServer[eh.profile_local_id];
        if (!profileId) continue;
        let record = await manager.findOne(EventHistory, { where: { userId, profileId } });
        if (!record) {
          record = manager.create(EventHistory, { userId, profileId });
        }
        if (eh.first_shown_at && !record.firstShownAt) record.firstShownAt = new Date(eh.first_shown_at);
        if (eh.celebration_shown_at && !record.celebrationShownAt) record.celebrationShownAt = new Date(eh.celebration_shown_at);
        if (eh.share_prompt_shown_at && !record.sharePromptShownAt) record.sharePromptShownAt = new Date(eh.share_prompt_shown_at);
        await manager.save(EventHistory, record);
      }

      // Capsules
      for (const c of dto.capsules ?? []) {
        const recipientProfileId = c.recipient_profile_local_id ? (profileLocalToServer[c.recipient_profile_local_id] ?? null) : null;
        const unlockProfileId = c.unlock_profile_local_id ? (profileLocalToServer[c.unlock_profile_local_id] ?? null) : null;
        const capsule = manager.create(TimeCapsule, {
          userId,
          title: c.title,
          message: c.message,
          recipientProfileId,
          unlockConditionType: c.unlock_condition_type,
          unlockAtEpochMs: c.unlock_at_epoch_ms != null ? String(c.unlock_at_epoch_ms) : null,
          unlockProfileId,
          isDraft: c.is_draft ?? false,
        });
        const saved = await manager.save(TimeCapsule, capsule);
        idMapping.push({ local_id: c.local_id, server_id: saved.id });
      }

      // Milestone progress
      for (const mp of dto.milestone_progress ?? []) {
        const profileId = profileLocalToServer[mp.profile_local_id];
        if (!profileId || !mp.last_seen_reached_id) continue;
        let record = await manager.findOne(UserMilestoneProgress, { where: { userId, profileId } });
        if (!record) {
          record = manager.create(UserMilestoneProgress, { userId, profileId });
        }
        record.lastSeenReachedId = mp.last_seen_reached_id;
        await manager.save(UserMilestoneProgress, record);
      }
    });

    const syncData = await this.syncService.getSync(userId);
    return { id_mapping: idMapping, ...syncData };
  }
}
