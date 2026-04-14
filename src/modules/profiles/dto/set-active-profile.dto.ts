import { IsUUID } from 'class-validator';

export class SetActiveProfileDto {
  @IsUUID(4)
  profile_id: string;
}
