import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdateSettingsDto {
  @IsUUID(4)
  @IsOptional()
  active_profile_id?: string | null;

  @IsBoolean()
  @IsOptional()
  onboarding_completed?: boolean;

  @IsBoolean()
  @IsOptional()
  notifications_enabled?: boolean;

  @IsBoolean()
  @IsOptional()
  milestone_reminders_enabled?: boolean;

  @IsBoolean()
  @IsOptional()
  family_reminders_enabled?: boolean;

  @IsBoolean()
  @IsOptional()
  reengagement_enabled?: boolean;

  @IsBoolean()
  @IsOptional()
  approximate_labels_enabled?: boolean;

  @IsBoolean()
  @IsOptional()
  use_24_hour_format?: boolean;
}
