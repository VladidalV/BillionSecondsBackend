import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMilestoneProgress } from '../../entities/user-milestone-progress.entity';
import { Profile } from '../../entities/profile.entity';
import { IsNull } from 'typeorm';

@Injectable()
export class MilestonesService {
  constructor(
    @InjectRepository(UserMilestoneProgress) private readonly repo: Repository<UserMilestoneProgress>,
    @InjectRepository(Profile) private readonly profilesRepo: Repository<Profile>,
  ) {}

  async getProgress(userId: string, profileId: string) {
    await this.assertProfileOwned(userId, profileId);
    const progress = await this.repo.findOne({ where: { userId, profileId } });
    return { profile_id: profileId, last_seen_reached_id: progress?.lastSeenReachedId ?? null };
  }

  async updateProgress(userId: string, profileId: string, lastSeenReachedId: string): Promise<void> {
    await this.assertProfileOwned(userId, profileId);

    let progress = await this.repo.findOne({ where: { userId, profileId } });
    if (!progress) {
      progress = this.repo.create({ userId, profileId });
    }
    progress.lastSeenReachedId = lastSeenReachedId;
    await this.repo.save(progress);
  }

  async findAllForUser(userId: string) {
    const records = await this.repo.find({ where: { userId } });
    return records.map((r) => ({ profile_id: r.profileId, last_seen_reached_id: r.lastSeenReachedId }));
  }

  private async assertProfileOwned(userId: string, profileId: string): Promise<void> {
    const profile = await this.profilesRepo.findOne({ where: { id: profileId, userId, deletedAt: IsNull() } });
    if (!profile) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Profile not found', field: null } });
    }
  }
}
