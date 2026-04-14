import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Profile, RelationType } from '../../entities/profile.entity';
import { UserSettings } from '../../entities/user-settings.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ProfileWriteDto } from './dto/create-profile.dto';

const MAX_PROFILES = 5;

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile) private readonly profilesRepo: Repository<Profile>,
    @InjectRepository(UserSettings) private readonly settingsRepo: Repository<UserSettings>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(userId: string) {
    const profiles = await this.profilesRepo.find({
      where: { userId, deletedAt: IsNull() },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const settings = await this.settingsRepo.findOne({ where: { userId } });
    return { profiles: profiles.map(this.toResponse), active_profile_id: settings?.activeProfileId ?? null };
  }

  async create(userId: string, dto: ProfileWriteDto): Promise<object> {
    const activeCount = await this.profilesRepo.count({ where: { userId, deletedAt: IsNull() } });
    if (activeCount >= MAX_PROFILES) {
      throw new UnprocessableEntityException({
        error: { code: 'MAX_PROFILES_REACHED', message: 'Cannot create more than 5 profiles', field: null },
      });
    }

    this.validateBirthDate(dto);

    const profile = this.profilesRepo.create({
      userId,
      name: dto.name,
      relationType: dto.relation_type,
      customRelationName: dto.relation_type === RelationType.OTHER ? (dto.custom_relation_name ?? null) : null,
      birthYear: dto.birth_year,
      birthMonth: dto.birth_month,
      birthDay: dto.birth_day,
      birthHour: dto.birth_hour ?? 12,
      birthMinute: dto.birth_minute ?? 0,
      unknownBirthTime: dto.unknown_birth_time ?? false,
      isPrimary: activeCount === 0,
      sortOrder: dto.sort_order ?? activeCount,
    });

    const saved = await this.profilesRepo.save(profile);

    // Set as active if first profile
    if (activeCount === 0) {
      await this.settingsRepo.update({ userId }, { activeProfileId: saved.id });
    }

    await this.notificationsService.rescheduleForProfile(saved);

    return this.toResponse(saved);
  }

  async update(userId: string, profileId: string, dto: ProfileWriteDto): Promise<object> {
    const profile = await this.findOwned(userId, profileId);
    this.validateBirthDate(dto);

    profile.name = dto.name;
    profile.relationType = dto.relation_type;
    profile.customRelationName = dto.relation_type === RelationType.OTHER ? (dto.custom_relation_name ?? null) : null;
    profile.birthYear = dto.birth_year;
    profile.birthMonth = dto.birth_month;
    profile.birthDay = dto.birth_day;
    profile.birthHour = dto.birth_hour ?? profile.birthHour;
    profile.birthMinute = dto.birth_minute ?? profile.birthMinute;
    profile.unknownBirthTime = dto.unknown_birth_time ?? profile.unknownBirthTime;
    profile.sortOrder = dto.sort_order ?? profile.sortOrder;

    const saved = await this.profilesRepo.save(profile);
    await this.notificationsService.rescheduleForProfile(saved);

    return this.toResponse(saved);
  }

  async remove(userId: string, profileId: string): Promise<void> {
    const profile = await this.findOwned(userId, profileId);

    if (profile.isPrimary) {
      throw new BadRequestException({
        error: { code: 'CANNOT_DELETE_PRIMARY', message: 'Cannot delete primary profile', field: null },
      });
    }

    const activeCount = await this.profilesRepo.count({ where: { userId, deletedAt: IsNull() } });
    if (activeCount <= 1) {
      throw new BadRequestException({
        error: { code: 'CANNOT_DELETE_LAST_PROFILE', message: 'Cannot delete the last profile', field: null },
      });
    }

    // Cancel scheduled notifications
    await this.notificationsService.cancelForProfile(profileId);

    // Soft delete
    await this.profilesRepo.softDelete(profileId);

    // If this was the active profile, switch to primary
    const settings = await this.settingsRepo.findOne({ where: { userId } });
    if (settings?.activeProfileId === profileId) {
      const primary = await this.profilesRepo.findOne({ where: { userId, isPrimary: true, deletedAt: IsNull() } });
      await this.settingsRepo.update({ userId }, { activeProfileId: primary?.id ?? null });
    }
  }

  async setActive(userId: string, profileId: string): Promise<void> {
    await this.findOwned(userId, profileId);
    await this.settingsRepo.update({ userId }, { activeProfileId: profileId });
  }

  async findOwned(userId: string, profileId: string): Promise<Profile> {
    const profile = await this.profilesRepo.findOne({
      where: { id: profileId, userId, deletedAt: IsNull() },
    });
    if (!profile) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Profile not found', field: null } });
    }
    return profile;
  }

  private validateBirthDate(dto: ProfileWriteDto) {
    const currentYear = new Date().getFullYear();
    if (dto.birth_year > currentYear) {
      throw new BadRequestException({
        error: { code: 'INVALID_BIRTH_DATE', message: 'Birth year cannot be in the future', field: 'birth_year' },
      });
    }
    const date = new Date(dto.birth_year, dto.birth_month - 1, dto.birth_day);
    if (
      date.getFullYear() !== dto.birth_year ||
      date.getMonth() !== dto.birth_month - 1 ||
      date.getDate() !== dto.birth_day
    ) {
      throw new BadRequestException({
        error: { code: 'INVALID_BIRTH_DATE', message: 'Invalid birth date', field: 'birth_day' },
      });
    }
    if (date > new Date()) {
      throw new BadRequestException({
        error: { code: 'INVALID_BIRTH_DATE', message: 'Birth date cannot be in the future', field: null },
      });
    }
  }

  toResponse(profile: Profile) {
    return {
      id: profile.id,
      name: profile.name,
      relation_type: profile.relationType,
      custom_relation_name: profile.customRelationName,
      birth_year: profile.birthYear,
      birth_month: profile.birthMonth,
      birth_day: profile.birthDay,
      birth_hour: profile.birthHour,
      birth_minute: profile.birthMinute,
      unknown_birth_time: profile.unknownBirthTime,
      is_primary: profile.isPrimary,
      sort_order: profile.sortOrder,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    };
  }
}
