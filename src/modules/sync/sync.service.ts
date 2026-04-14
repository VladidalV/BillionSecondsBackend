import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Profile } from '../../entities/profile.entity';
import { UserSettings } from '../../entities/user-settings.entity';
import { EventHistory } from '../../entities/event-history.entity';
import { TimeCapsule } from '../../entities/time-capsule.entity';
import { UserMilestoneProgress } from '../../entities/user-milestone-progress.entity';
import { ProfilesService } from '../profiles/profiles.service';
import { SettingsService } from '../settings/settings.service';
import { EventHistoryService } from '../event-history/event-history.service';
import { CapsulesService } from '../capsules/capsules.service';

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Profile) private readonly profilesRepo: Repository<Profile>,
    @InjectRepository(UserSettings) private readonly settingsRepo: Repository<UserSettings>,
    @InjectRepository(EventHistory) private readonly eventHistoryRepo: Repository<EventHistory>,
    @InjectRepository(TimeCapsule) private readonly capsulesRepo: Repository<TimeCapsule>,
    @InjectRepository(UserMilestoneProgress) private readonly milestoneRepo: Repository<UserMilestoneProgress>,
    private readonly profilesService: ProfilesService,
    private readonly settingsService: SettingsService,
    private readonly eventHistoryService: EventHistoryService,
    private readonly capsulesService: CapsulesService,
  ) {}

  async getSync(userId: string) {
    const [user, profiles, settings, eventHistory, capsules, milestoneProgress] = await Promise.all([
      this.usersRepo.findOne({ where: { id: userId } }),
      this.profilesRepo.find({ where: { userId, deletedAt: IsNull() }, order: { sortOrder: 'ASC' } }),
      this.settingsRepo.findOne({ where: { userId } }),
      this.eventHistoryRepo.find({ where: { userId } }),
      this.capsulesRepo.find({ where: { userId, deletedAt: IsNull() }, order: { createdAt: 'DESC' } }),
      this.milestoneRepo.find({ where: { userId } }),
    ]);

    return {
      server_time: new Date().toISOString(),
      user: user ? this.userToResponse(user) : null,
      settings: settings ? this.settingsService.toResponse(settings) : null,
      profiles: profiles.map((p) => this.profilesService.toResponse(p)),
      event_history: eventHistory.map((e) => this.eventHistoryService.toResponse(e)),
      capsules: capsules.map((c) => this.capsulesService.toResponse(c)),
      milestone_progress: milestoneProgress.map((m) => ({
        profile_id: m.profileId,
        last_seen_reached_id: m.lastSeenReachedId,
      })),
    };
  }

  private userToResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      display_name: user.displayName,
      auth_provider: user.authProvider,
      platform: user.platform,
      app_version: user.appVersion,
      timezone: user.timezone,
      locale: user.locale,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }
}
