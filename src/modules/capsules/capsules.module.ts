import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeCapsule } from '../../entities/time-capsule.entity';
import { Profile } from '../../entities/profile.entity';
import { CapsulesController } from './capsules.controller';
import { CapsulesService } from './capsules.service';

@Module({
  imports: [TypeOrmModule.forFeature([TimeCapsule, Profile])],
  controllers: [CapsulesController],
  providers: [CapsulesService],
  exports: [CapsulesService],
})
export class CapsulesModule {}
