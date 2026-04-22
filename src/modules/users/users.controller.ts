import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../entities/user.entity';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { MigrateDto } from './dto/migrate.dto';
import { UsersService } from './users.service';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return this.usersService.getMe(user.id);
  }

  @Put('me/device')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateDevice(@CurrentUser() user: User, @Body() dto: UpdateDeviceDto) {
    return this.usersService.updateDevice(user.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(@CurrentUser() user: User) {
    return this.usersService.deleteAccount(user.id);
  }

  @Post('me/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetAccount(@CurrentUser() user: User, @Body('confirm') confirm: boolean) {
    return this.usersService.resetAccount(user.id, confirm);
  }

  @Get('me/export')
  exportData(@CurrentUser() user: User) {
    return this.usersService.exportData(user.id);
  }

  @Post('migrate')
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  migrateData(@CurrentUser() user: User, @Body() dto: MigrateDto) {
    return this.usersService.migrateData(user.id, dto);
  }
}
