import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { TvaService } from './tva.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'

export class CreateTauxTvaDto {
  @IsString() @MinLength(1) libelle!: string
  @IsNumber() @Min(0) @Type(() => Number) taux!: number
  @IsOptional() @IsBoolean() defaut?: boolean
  @IsOptional() @IsString() dateEffet?: string
}

export class UpdateTauxTvaDto {
  @IsOptional() @IsString() @MinLength(1) libelle?: string
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) taux?: number
  @IsOptional() @IsBoolean() defaut?: boolean
  @IsOptional() @IsString() dateEffet?: string
}

export class ToggleActifDto {
  @IsBoolean() actif!: boolean
}

@ApiTags('tva')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tva')
export class TvaController {
  constructor(private readonly tva: TvaService) {}

  @Get()
  findAll() {
    return this.tva.findAll()
  }

  @Post()
  @Roles('GERANT')
  create(@Body() dto: CreateTauxTvaDto) {
    return this.tva.create(dto)
  }

  @Put(':id')
  @Roles('GERANT')
  update(@Param('id') id: string, @Body() dto: UpdateTauxTvaDto) {
    return this.tva.update(id, dto)
  }

  @Patch(':id/statut')
  @Roles('GERANT')
  toggleActif(@Param('id') id: string, @Body() dto: ToggleActifDto) {
    return this.tva.toggleActif(id, dto.actif)
  }
}
