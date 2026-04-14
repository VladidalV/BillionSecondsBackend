import { IsIn, IsString } from 'class-validator';

const VALID_MILESTONE_IDS = ['100m', '250m', '500m', '750m', '1b'];

export class UpdateMilestoneProgressDto {
  @IsString()
  @IsIn(VALID_MILESTONE_IDS)
  last_seen_reached_id: string;
}
