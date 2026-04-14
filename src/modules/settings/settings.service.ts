import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings } from '../../entities/user-settings.entity';
import {
  NotificationType,
  ScheduledNotification,
} from '../../entities/scheduled-notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSettings) private readonly settingsRepo: Repository<UserSettings>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findOne(userId: string): Promise<object> {
    const settings = await this.getOrCreate(userId);
    return this.toResponse(settings);
  }

  async update(userId: string, dto: UpdateSettingsDto): Promise<object> {
    const settings = await this.getOrCreate(userId);

    const prevNotificationsEnabled = settings.notificationsEnabled;
    const prevMilestoneReminders = settings.milestoneRemindersEnabled;
    const prevFamilyReminders = settings.familyRemindersEnabled;

    if (dto.active_profile_id !== undefined) settings.activeProfileId = dto.active_profile_id ?? null;
    if (dto.onboarding_completed !== undefined) settings.onboardingCompleted = dto.onboarding_completed;
    if (dto.notifications_enabled !== undefined) settings.notificationsEnabled = dto.notifications_enabled;
    if (dto.milestone_reminders_enabled !== undefined) settings.milestoneRemindersEnabled = dto.milestone_reminders_enabled;
    if (dto.family_reminders_enabled !== undefined) settings.familyRemindersEnabled = dto.family_reminders_enabled;
    if (dto.reengagement_enabled !== undefined) settings.reengagementEnabled = dto.reengagement_enabled;
    if (dto.approximate_labels_enabled !== undefined) settings.approximateLabelsEnabled = dto.approximate_labels_enabled;
    if (dto.use_24_hour_format !== undefined) settings.use24HourFormat = dto.use_24_hour_format;

    await this.settingsRepo.save(settings);

    // Cancel notifications if flags turned off
    if (!settings.notificationsEnabled && prevNotificationsEnabled) {
      await this.notificationsService.cancelByTypeForUser(userId, [
        NotificationType.MILESTONE_APPROACHING,
        NotificationType.MILESTONE_REACHED,
        NotificationType.FAMILY_MILESTONE_APPROACHING,
        NotificationType.FAMILY_MILESTONE_REACHED,
        NotificationType.REENGAGEMENT,
        NotificationType.CAPSULE_UNLOCKED,
      ]);
    } else {
      if (!settings.milestoneRemindersEnabled && prevMilestoneReminders) {
        await this.notificationsService.cancelByTypeForUser(userId, [
          NotificationType.MILESTONE_APPROACHING,
          NotificationType.MILESTONE_REACHED,
        ]);
      }
      if (!settings.familyRemindersEnabled && prevFamilyReminders) {
        await this.notificationsService.cancelByTypeForUser(userId, [
          NotificationType.FAMILY_MILESTONE_APPROACHING,
          NotificationType.FAMILY_MILESTONE_REACHED,
        ]);
      }
    }

    return this.toResponse(settings);
  }

  async getOrCreate(userId: string): Promise<UserSettings> {
    let settings = await this.settingsRepo.findOne({ where: { userId } });
    if (!settings) {
      settings = this.settingsRepo.create({ userId });
      settings = await this.settingsRepo.save(settings);
    }
    return settings;
  }

  toResponse(settings: UserSettings) {
    return {
      active_profile_id: settings.activeProfileId,
      onboarding_completed: settings.onboardingCompleted,
      notifications_enabled: settings.notificationsEnabled,
      milestone_reminders_enabled: settings.milestoneRemindersEnabled,
      family_reminders_enabled: settings.familyRemindersEnabled,
      reengagement_enabled: settings.reengagementEnabled,
      approximate_labels_enabled: settings.approximateLabelsEnabled,
      use_24_hour_format: settings.use24HourFormat,
      updated_at: settings.updatedAt,
    };
  }
}
