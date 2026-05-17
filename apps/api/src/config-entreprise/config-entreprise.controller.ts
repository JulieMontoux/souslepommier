import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { IsString, IsOptional, IsNumber, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ConfigEntrepriseService } from './config-entreprise.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'

export class UpsertConfigEntrepriseDto {
  @IsOptional() @IsString() raisonSociale?: string
  @IsOptional() @IsString() formeJuridique?: string
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) capitalSocial?: number
  @IsOptional() @IsString() siret?: string
  @IsOptional() @IsString() tvaIntracommunautaire?: string
  @IsOptional() @IsString() adresse?: string
  @IsOptional() @IsString() codePostal?: string
  @IsOptional() @IsString() ville?: string
  @IsOptional() @IsString() pays?: string
  @IsOptional() @IsString() telephone?: string
  @IsOptional() @IsString() email?: string
  @IsOptional() @IsString() iban?: string
  @IsOptional() @IsString() rcs?: string
  @IsOptional() @IsString() villeRCS?: string
  @IsOptional() @IsString() codeAPE?: string
  @IsOptional() @IsString() regimeTVA?: string
  @IsOptional() @IsString() responsableRGPD?: string
  @IsOptional() @IsString() emailRGPD?: string
  @IsOptional() @IsString() logoUrl?: string
}

@ApiTags('config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('config')
export class ConfigEntrepriseController {
  constructor(private readonly configEntreprise: ConfigEntrepriseService) {}

  @Get()
  get() {
    return this.configEntreprise.get()
  }

  @Put()
  @Roles('GERANT')
  upsert(@Body() dto: UpsertConfigEntrepriseDto) {
    return this.configEntreprise.upsert(dto)
  }
}
