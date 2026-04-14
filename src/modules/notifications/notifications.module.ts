import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledNotification } from '../../entities/scheduled-notification.entity';
import { UserSettings } from '../../entities/user-settings.entity';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([ScheduledNotification, UserSettings])],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
