import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../entities/user.entity';
import { UpdateEventHistoryDto } from './dto/update-event-history.dto';
import { EventHistoryService } from './event-history.service';

@Controller('api/v1/event-history')
@UseGuards(JwtAuthGuard)
export class EventHistoryController {
  constructor(private readonly service: EventHistoryService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.id);
  }

  @Get(':profile_id')
  findOne(@CurrentUser() user: User, @Param('profile_id', ParseUUIDPipe) profileId: string) {
    return this.service.findOne(user.id, profileId);
  }

  @Patch(':profile_id')
  upsert(
    @CurrentUser() user: User,
    @Param('profile_id', ParseUUIDPipe) profileId: string,
    @Body() dto: UpdateEventHistoryDto,
  ) {
    return this.service.upsert(user.id, profileId, dto);
  }
}
