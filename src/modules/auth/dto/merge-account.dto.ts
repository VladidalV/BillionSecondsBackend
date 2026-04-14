import { IsString, IsNotEmpty } from 'class-validator';

export class MergeAccountDto {
  @IsString()
  @IsNotEmpty()
  anonymous_token: string;

  @IsString()
  @IsNotEmpty()
  provider_token: string;
}
