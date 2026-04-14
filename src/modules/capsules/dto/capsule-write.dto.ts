import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { UnlockConditionType } from '../../../entities/time-capsule.entity';

export class CapsuleWriteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsUUID(4)
  @IsOptional()
  recipient_profile_id?: string | null;

  @IsBoolean()
  @IsOptional()
  is_draft?: boolean;

  @IsEnum(UnlockConditionType)
  unlock_condition_type: UnlockConditionType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @ValidateIf((o) => o.unlock_condition_type === UnlockConditionType.EXACT_DATE_TIME)
  unlock_at_epoch_ms?: number | null;

  @IsUUID(4)
  @IsOptional()
  @ValidateIf((o) => o.unlock_condition_type === UnlockConditionType.BILLION_SECONDS_EVENT)
  unlock_profile_id?: string | null;
}
