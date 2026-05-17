import {
  Controller,
  Get,
  Post,
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
import { VentesService } from './ventes.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'

class LigneVenteDto {
  @IsString() varianteProduitId!: string
  @IsNumber() @Min(0) @Type(() => Number) qte!: number
  @IsNumber() @Min(0) @Type(() => Number) prixUnitaireHT!: number
  @IsNumber() @Min(0) @Type(() => Number) tauxTVA!: number
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) remise?: number
}

class PaiementDto {
  @IsEnum(['ESPECES', 'CB', 'CHEQUE', 'VIREMENT', 'TICKET_RESTO']) mode!: string
  @IsNumber() @Min(0) @Type(() => Number) montant!: number
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) renduMonnaie?: number
  @IsOptional() @IsString() reference?: string
}

export class CreateVenteDto {
  @IsString() vendeurId!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneVenteDto)
  lignes!: LigneVenteDto[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaiementDto)
  paiements!: PaiementDto[]

  @IsNumber() @Min(0) @Type(() => Number) totalHT!: number
  @IsNumber() @Min(0) @Type(() => Number) totalTVA!: number
  @IsNumber() @Min(0) @Type(() => Number) totalTTC!: number
}

export class AnnulerVenteDto {
  @IsString() @MinLength(1) motif!: string
}

@ApiTags('ventes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ventes')
export class VentesController {
  constructor(private readonly ventes: VentesService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('vendeurId') vendeurId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('statut') statut?: string,
  ) {
    return this.ventes.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      vendeurId,
      from,
      to,
      statut,
    )
  }

  @Post()
  create(@Body() dto: CreateVenteDto) {
    return this.ventes.create(dto)
  }

  @Get('today')
  findToday(@CurrentUser() user: JwtPayload) {
    return this.ventes.findToday(user.sub, user.role)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ventes.findOne(id)
  }

  @Post(':id/annuler')
  @Roles('GERANT')
  @HttpCode(200)
  annuler(
    @Param('id') id: string,
    @Body() dto: AnnulerVenteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ventes.annuler(id, dto, user.sub)
  }
}
