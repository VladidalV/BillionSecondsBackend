import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../entities/user.entity';
import { AuthService } from './auth.service';
import { AnonymousAuthDto } from './dto/anonymous-auth.dto';
import { AppleAuthDto } from './dto/apple-auth.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { MergeAccountDto } from './dto/merge-account.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('api/v1/auth')
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('anonymous')
  loginAnonymous(@Body() dto: AnonymousAuthDto) {
    return this.authService.loginAnonymous(dto.device_id);
  }

  @Post('apple')
  loginApple(@Body() dto: AppleAuthDto) {
    return this.authService.loginApple(dto.identity_token, dto.name);
  }

  @Post('google')
  loginGoogle(@Body() dto: GoogleAuthDto) {
    return this.authService.loginGoogle(dto.id_token);
  }

  @Post('refresh')
  refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refresh_token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard)
  mergeAccounts(@Body() dto: MergeAccountDto) {
    return this.authService.mergeAccounts(dto.anonymous_token, dto.provider_token, dto.provider);
  }
}
