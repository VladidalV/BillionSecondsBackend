import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventHistory } from '../../entities/event-history.entity';
import { EventHistoryController } from './event-history.controller';
import { EventHistoryService } from './event-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventHistory])],
  controllers: [EventHistoryController],
  providers: [EventHistoryService],
  exports: [EventHistoryService],
})
export class EventHistoryModule {}
