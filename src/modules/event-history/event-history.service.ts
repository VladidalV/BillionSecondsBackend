import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventHistory } from '../../entities/event-history.entity';
import { UpdateEventHistoryDto } from './dto/update-event-history.dto';

@Injectable()
export class EventHistoryService {
  constructor(
    @InjectRepository(EventHistory) private readonly repo: Repository<EventHistory>,
  ) {}

  async findAll(userId: string) {
    const records = await this.repo.find({ where: { userId } });
    return { records: records.map(this.toResponse) };
  }

  async findOne(userId: string, profileId: string) {
    const record = await this.repo.findOne({ where: { userId, profileId } });
    if (!record) {
      throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Event history record not found', field: null } });
    }
    return this.toResponse(record);
  }

  async upsert(userId: string, profileId: string, dto: UpdateEventHistoryDto) {
    let record = await this.repo.findOne({ where: { userId, profileId } });

    if (!record) {
      record = this.repo.create({ userId, profileId });
    }

    // Idempotent: only set if currently null/undefined
    if (dto.first_shown_at !== undefined && record.firstShownAt == null) {
      record.firstShownAt = dto.first_shown_at ? new Date(dto.first_shown_at) : null;
    }
    if (dto.celebration_shown_at !== undefined && record.celebrationShownAt == null) {
      record.celebrationShownAt = dto.celebration_shown_at ? new Date(dto.celebration_shown_at) : null;
    }
    if (dto.share_prompt_shown_at !== undefined && record.sharePromptShownAt == null) {
      record.sharePromptShownAt = dto.share_prompt_shown_at ? new Date(dto.share_prompt_shown_at) : null;
    }

    const saved = await this.repo.save(record);
    return this.toResponse(saved);
  }

  toResponse(record: EventHistory) {
    return {
      profile_id: record.profileId,
      first_shown_at: record.firstShownAt,
      celebration_shown_at: record.celebrationShownAt,
      share_prompt_shown_at: record.sharePromptShownAt,
      updated_at: record.updatedAt,
    };
  }
}
