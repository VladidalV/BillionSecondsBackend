import { IsString, IsNotEmpty } from 'class-validator';

export class AnonymousAuthDto {
  @IsString()
  @IsNotEmpty()
  device_id: string;
}
