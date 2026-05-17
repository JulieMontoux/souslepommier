import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  IsEmail,
} from 'class-validator'
import { Response } from 'express'
import { RgpdService } from './rgpd.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'

export class CreateDemandeDto {
  @IsEnum(['ACCES', 'RECTIFICATION', 'EFFACEMENT', 'PORTABILITE', 'OPPOSITION'])
  type!: string

  @IsString() @MinLength(1) nom!: string
  @IsEmail() email!: string
  @IsOptional() @IsString() message?: string
}

export class ProcessDemandeDto {
  @IsEnum(['EN_COURS', 'TRAITEE', 'REFUSEE']) statut!: string
  @IsOptional() @IsString() reponse?: string
}

@ApiTags('rgpd')
@ApiBearerAuth()
@Controller('rgpd')
export class RgpdController {
  constructor(private readonly rgpd: RgpdService) {}

  @Get('demandes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('GERANT')
  findAll() {
    return this.rgpd.findAll()
  }

  @Post('demandes')
  create(@Body() dto: CreateDemandeDto) {
    return this.rgpd.create(dto)
  }

  @Patch('demandes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('GERANT')
  process(
    @Param('id') id: string,
    @Body() dto: ProcessDemandeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.rgpd.process(id, dto, user.sub)
  }

  @Get('export/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('GERANT')
  async exportUser(@Param('userId') userId: string, @Res() res: Response) {
    const data = await this.rgpd.exportUser(userId)
    const filename = `rgpd-export-${userId}-${new Date().toISOString().slice(0, 10)}.json`
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(JSON.stringify(data, null, 2))
  }
}
