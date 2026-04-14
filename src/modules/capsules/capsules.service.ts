import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TimeCapsule, UnlockConditionType } from '../../entities/time-capsule.entity';
import { Profile } from '../../entities/profile.entity';
import { CapsuleWriteDto } from './dto/capsule-write.dto';

const MIN_UNLOCK_AHEAD_MS = 3_600_000; // 1 hour

@Injectable()
export class CapsulesService {
  constructor(
    @InjectRepository(TimeCapsule) private readonly repo: Repository<TimeCapsule>,
    @InjectRepository(Profile) private readonly profilesRepo: Repository<Profile>,
  ) {}

  async findAll(userId: string) {
    const capsules = await this.repo.find({
      where: { userId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return { capsules: capsules.map(this.toResponse) };
  }

  async create(userId: string, dto: CapsuleWriteDto) {
    await this.validateCapsuleDto(userId, dto);

    const capsule = this.repo.create({
      userId,
      title: dto.title,
      message: dto.message,
      recipientProfileId: dto.recipient_profile_id ?? null,
      unlockConditionType: dto.unlock_condition_type,
      unlockAtEpochMs: dto.unlock_at_epoch_ms != null ? String(dto.unlock_at_epoch_ms) : null,
      unlockProfileId: dto.unlock_profile_id ?? null,
      isDraft: dto.is_draft ?? false,
    });

    const saved = await this.repo.save(capsule);
    return this.toResponse(saved);
  }

  async update(userId: string, capsuleId: string, dto: CapsuleWriteDto) {
    const capsule = await this.findOwned(userId, capsuleId);

    if (capsule.openedAt) {
      throw new BadRequestException({
        error: { code: 'CAPSULE_ALREADY_OPENED', message: 'Cannot edit an opened capsule', field: null },
      });
    }

    await this.validateCapsuleDto(userId, dto);

    capsule.title = dto.title;
    capsule.message = dto.message;
    capsule.recipientProfileId = dto.recipient_profile_id ?? null;
    capsule.unlockConditionType = dto.unlock_condition_type;
    capsule.unlockAtEpochMs = dto.unlock_at_epoch_ms != null ? String(dto.unlock_at_epoch_ms) : null;
    capsule.unlockProfileId = dto.unlock_profile_id ?? null;
    capsule.isDraft = dto.is_draft ?? false;

    const saved = await this.repo.save(capsule);
    return this.toResponse(saved);
  }

  async remove(userId: string, capsuleId: string): Promise<void> {
    const capsule = await this.findOwned(userId, capsuleId);
    await this.repo.softDelete(capsule.id);
  }

  async open(userId: string, capsuleId: string) {
    const capsule = await this.findOwned(userId, capsuleId);

    if (capsule.openedAt) {
      return this.toResponse(capsule); // idempotent
    }

    if (capsule.isDraft) {
      throw new UnprocessableEntityException({
        error: { code: 'CAPSULE_IS_DRAFT', message: 'Cannot open a draft capsule', field: null },
      });
    }

    const isAvailable = this.isCapsuleAvailable(capsule);
    if (!isAvailable) {
      throw new UnprocessableEntityException({
        error: { code: 'CAPSULE_NOT_AVAILABLE', message: 'Capsule is not yet available', field: null },
      });
    }

    capsule.openedAt = new Date();
    const saved = await this.repo.save(capsule);
    return this.toResponse(saved);
  }

  private isCapsuleAvailable(capsule: TimeCapsule): boolean {
    if (capsule.unlockConditionType === UnlockConditionType.EXACT_DATE_TIME) {
      return capsule.unlockAtEpochMs != null && Number(capsule.unlockAtEpochMs) <= Date.now();
    }
    // BILLION_SECONDS_EVENT: client decides availability
    return true;
  }

  private async validateCapsuleDto(userId: string, dto: CapsuleWriteDto): Promise<void> {
    if (dto.unlock_condition_type === UnlockConditionType.EXACT_DATE_TIME) {
      if (!dto.unlock_at_epoch_ms) {
        throw new BadRequestException({
          error: { code: 'MISSING_UNLOCK_DATE', message: 'unlock_at_epoch_ms is required', field: 'unlock_at_epoch_ms' },
        });
      }
      if (dto.unlock_at_epoch_ms < Date.now() + MIN_UNLOCK_AHEAD_MS) {
        throw new BadRequestException({
          error: { code: 'UNLOCK_DATE_TOO_SOON', message: 'unlock_at_epoch_ms must be at least 1 hour in the future', field: 'unlock_at_epoch_ms' },
        });
      }
    }

    if (dto.unlock_condition_type === UnlockConditionType.BILLION_SECONDS_EVENT && dto.unlock_profile_id) {
      await this.assertProfileOwned(userId, dto.unlock_profile_id, 'unlock_profile_id');
    }

    if (dto.recipient_profile_id) {
      await this.assertProfileOwned(userId, dto.recipient_profile_id, 'recipient_profile_id');
    }
  }

  private async assertProfileOwned(userId: string, profileId: string, field: string): Promise<void> {
    const profile = await this.profilesRepo.findOne({ where: { id: profileId, userId, deletedAt: IsNull() } });
    if (!profile) {
      throw new UnprocessableEntityException({
        error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found or does not belong to user', field },
      });
    }
  }

  async findOwned(userId: string, capsuleId: string): Promise<TimeCapsule> {
    const capsule = await this.repo.findOne({ where: { id: capsuleId, userId, deletedAt: IsNull() } });
    if (!capsule) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Capsule not found', field: null } });
    }
    return capsule;
  }

  toResponse(capsule: TimeCapsule) {
    return {
      id: capsule.id,
      title: capsule.title,
      message: capsule.message,
      recipient_profile_id: capsule.recipientProfileId,
      unlock_condition_type: capsule.unlockConditionType,
      unlock_at_epoch_ms: capsule.unlockAtEpochMs != null ? Number(capsule.unlockAtEpochMs) : null,
      unlock_profile_id: capsule.unlockProfileId,
      is_draft: capsule.isDraft,
      opened_at: capsule.openedAt,
      created_at: capsule.createdAt,
      updated_at: capsule.updatedAt,
    };
  }
}
