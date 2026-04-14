import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AppleAuthDto {
  @IsString()
  @IsNotEmpty()
  identity_token: string;

  @IsString()
  @IsOptional()
  name?: string;
}
