import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Platform } from '../../../entities/user.entity';

export class UpdateDeviceDto {
  @IsString()
  @IsNotEmpty()
  fcm_token: string;

  @IsEnum(Platform)
  platform: Platform;

  @IsString()
  @IsNotEmpty()
  app_version: string;

  @IsString()
  @IsNotEmpty()
  timezone: string;
}
