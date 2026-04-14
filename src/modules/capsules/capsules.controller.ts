import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../entities/user.entity';
import { CapsulesService } from './capsules.service';
import { CapsuleWriteDto } from './dto/capsule-write.dto';

@Controller('api/v1/capsules')
@UseGuards(JwtAuthGuard)
export class CapsulesController {
  constructor(private readonly capsulesService: CapsulesService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.capsulesService.findAll(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: User, @Body() dto: CapsuleWriteDto) {
    return this.capsulesService.create(user.id, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CapsuleWriteDto,
  ) {
    return this.capsulesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.capsulesService.remove(user.id, id);
  }

  @Post(':id/open')
  open(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.capsulesService.open(user.id, id);
  }
}
