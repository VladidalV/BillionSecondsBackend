import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { RelationType } from '../../../entities/profile.entity';

export class ProfileWriteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsEnum(RelationType)
  relation_type: RelationType;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  custom_relation_name?: string | null;

  @IsInt()
  @Min(1900)
  birth_year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  birth_month: number;

  @IsInt()
  @Min(1)
  @Max(31)
  birth_day: number;

  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  birth_hour?: number;

  @IsInt()
  @Min(0)
  @Max(59)
  @IsOptional()
  birth_minute?: number;

  @IsBoolean()
  @IsOptional()
  unknown_birth_time?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  sort_order?: number;
}
