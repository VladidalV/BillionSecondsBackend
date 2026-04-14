import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../entities/user.entity';
import { UpdateMilestoneProgressDto } from './dto/update-milestone-progress.dto';
import { MilestonesService } from './milestones.service';

@Controller('api/v1/profiles')
@UseGuards(JwtAuthGuard)
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get(':profile_id/milestone-progress')
  getProgress(@CurrentUser() user: User, @Param('profile_id', ParseUUIDPipe) profileId: string) {
    return this.milestonesService.getProgress(user.id, profileId);
  }

  @Put(':profile_id/milestone-progress')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateProgress(
    @CurrentUser() user: User,
    @Param('profile_id', ParseUUIDPipe) profileId: string,
    @Body() dto: UpdateMilestoneProgressDto,
  ) {
    return this.milestonesService.updateProgress(user.id, profileId, dto.last_seen_reached_id);
  }
}
