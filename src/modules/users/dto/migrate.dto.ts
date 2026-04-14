import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RelationType } from '../../../entities/profile.entity';
import { UnlockConditionType } from '../../../entities/time-capsule.entity';

export class MigrateProfileDto {
  @IsString()
  local_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsEnum(RelationType)
  relation_type: RelationType;

  @IsString()
  @IsOptional()
  custom_relation_name?: string | null;

  @IsInt()
  birth_year: number;

  @IsInt()
  birth_month: number;

  @IsInt()
  birth_day: number;

  @IsInt()
  @IsOptional()
  birth_hour?: number;

  @IsInt()
  @IsOptional()
  birth_minute?: number;

  @IsBoolean()
  @IsOptional()
  unknown_birth_time?: boolean;

  @IsInt()
  @IsOptional()
  sort_order?: number;
}

export class MigrateEventHistoryDto {
  @IsString()
  profile_local_id: string;

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

export class MigrateCapsuleDto {
  @IsString()
  local_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsString()
  @IsOptional()
  recipient_profile_local_id?: string | null;

  @IsBoolean()
  @IsOptional()
  is_draft?: boolean;

  @IsEnum(UnlockConditionType)
  unlock_condition_type: UnlockConditionType;

  @IsOptional()
  unlock_at_epoch_ms?: number | null;

  @IsString()
  @IsOptional()
  unlock_profile_local_id?: string | null;
}

export class MigrateMilestoneProgressDto {
  @IsString()
  profile_local_id: string;

  @IsString()
  @IsOptional()
  last_seen_reached_id?: string | null;
}

export class MigrateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MigrateProfileDto)
  profiles: MigrateProfileDto[];

  @IsString()
  @IsOptional()
  active_profile_local_id?: string | null;

  @IsOptional()
  settings?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MigrateEventHistoryDto)
  @IsOptional()
  event_history?: MigrateEventHistoryDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MigrateCapsuleDto)
  @IsOptional()
  capsules?: MigrateCapsuleDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MigrateMilestoneProgressDto)
  @IsOptional()
  milestone_progress?: MigrateMilestoneProgressDto[];
}
