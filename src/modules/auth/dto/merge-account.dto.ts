import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class MergeAccountDto {
  @IsString()
  @IsNotEmpty()
  anonymous_token: string;

  @IsString()
  @IsNotEmpty()
  provider_token: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['google', 'apple'])
  provider: 'google' | 'apple';
}
