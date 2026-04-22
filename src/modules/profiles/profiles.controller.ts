import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../entities/user.entity';
import { ProfileWriteDto } from './dto/create-profile.dto';
import { SetActiveProfileDto } from './dto/set-active-profile.dto';
import { ProfilesService } from './profiles.service';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('profiles')
  findAll(@CurrentUser() user: User) {
    return this.profilesService.findAll(user.id);
  }

  @Post('profiles')
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: User, @Body() dto: ProfileWriteDto) {
    return this.profilesService.create(user.id, dto);
  }

  // NOTE: literal routes must be declared BEFORE parameterised ones so NestJS
  // does not swallow "active" as an :id value.
  @Put('profiles/active')
  @HttpCode(HttpStatus.NO_CONTENT)
  setActive(@CurrentUser() user: User, @Body() dto: SetActiveProfileDto) {
    return this.profilesService.setActive(user.id, dto.profile_id);
  }

  @Put('profiles/:id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProfileWriteDto,
  ) {
    return this.profilesService.update(user.id, id, dto);
  }

  @Delete('profiles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.profilesService.remove(user.id, id);
  }
}
