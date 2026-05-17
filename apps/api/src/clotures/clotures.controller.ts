import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CloturesService } from './clotures.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'

@ApiTags('clotures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GERANT')
@Controller('clotures')
export class CloturesController {
  constructor(private readonly clotures: CloturesService) {}

  @Get()
  findAll() {
    return this.clotures.findAll()
  }

  @Get('apercu')
  getApercu() {
    return this.clotures.getApercu()
  }

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: JwtPayload) {
    return this.clotures.create(user.sub)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clotures.findOne(id)
  }
}
