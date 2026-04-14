import { IsDateString, IsOptional } from 'class-validator';

export class UpdateEventHistoryDto {
  @IsDateString()
  @IsOptional()
  first_shown_at?: string | null;

  @IsDateString()
  @IsOptional()
  celebration_shown_at?: string | null;

  @IsDateString()
  @IsOptional()
  share_prompt_shown_at?: string | null;
}
