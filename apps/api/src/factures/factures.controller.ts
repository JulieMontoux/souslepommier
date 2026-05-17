import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import {
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  IsOptional,
  ValidateNested,
  Min,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { FacturesService } from './factures.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'

export class LigneFactureDto {
  @IsString() @MinLength(1) designation!: string
  @IsNumber() @Min(0) @Type(() => Number) quantite!: number
  @IsNumber() @Min(0) @Type(() => Number) prixUnitaireHT!: number
  @IsNumber() @Min(0) @Type(() => Number) tauxTVA!: number
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) remise?: number
}

export class CreateFactureDto {
  @IsString() clientId!: string
  @IsOptional() @IsString() venteId?: string
  @IsOptional() @IsString() dateEmission?: string
  @IsOptional() @IsString() notes?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneFactureDto)
  lignes!: LigneFactureDto[]
}

export class UpdateStatutDto {
  @IsEnum(['BROUILLON', 'EMISE', 'PAYEE', 'ANNULEE']) statut!: string
}

export class AnnulerFactureDto {
  @IsOptional() @IsString() motif?: string
}

@ApiTags('factures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GERANT')
@Controller('factures')
export class FacturesController {
  constructor(private readonly factures: FacturesService) {}

  @Get()
  findAll(
    @Query('statut') statut?: string,
    @Query('clientId') clientId?: string,
    @Query('page') page?: string,
  ) {
    return this.factures.findAll(statut, clientId, page ? parseInt(page, 10) : 1)
  }

  @Post()
  create(@Body() dto: CreateFactureDto) {
    return this.factures.create(dto)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.factures.findOne(id)
  }

  @Patch(':id/statut')
  updateStatut(@Param('id') id: string, @Body() dto: UpdateStatutDto) {
    return this.factures.updateStatut(id, dto)
  }

  @Post(':id/annuler')
  @HttpCode(200)
  annuler(@Param('id') id: string, @Body() dto: AnnulerFactureDto) {
    return this.factures.annuler(id, dto.motif)
  }
}
