import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent } from '../../entities/analytics-event.entity';
import { AnalyticsEventsDto } from './dto/analytics-events.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEvent) private readonly repo: Repository<AnalyticsEvent>,
  ) {}

  async saveEvents(userId: string, dto: AnalyticsEventsDto): Promise<void> {
    const entities = dto.events.map((e) =>
      this.repo.create({
        userId,
        eventType: e.event_type,
        occurredAt: new Date(e.occurred_at),
        properties: e.properties ?? {},
      }),
    );
    await this.repo.save(entities);
  }
}
