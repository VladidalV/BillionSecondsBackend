import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AnalyticsEventItemDto {
  @IsString()
  @IsNotEmpty()
  event_type: string;

  @IsDateString()
  occurred_at: string;

  @IsObject()
  @IsOptional()
  properties?: Record<string, any>;
}

export class AnalyticsEventsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AnalyticsEventItemDto)
  events: AnalyticsEventItemDto[];
}
