import {
  Controller,
  Get,
  Post,
  Put,
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
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  MinLength,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ProduitsService } from './produits.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'

export class CreateProduitDto {
  @IsString() @MinLength(1) nom!: string
  @IsOptional() @IsString() categorieId?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() image?: string
}

export class UpdateProduitDto {
  @IsOptional() @IsString() @MinLength(1) nom?: string
  @IsOptional() @IsString() categorieId?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() image?: string
}

export class CreateVarianteDto {
  @IsNumber() @Min(0) @Type(() => Number) prixHT!: number
  @IsNumber() @Min(0) @Type(() => Number) tauxTVA!: number
  @IsOptional() @IsEnum(['VRAC', 'BARQUETTE', 'FILET', 'SAC', 'CAISSE', 'PLATEAU']) emballage?: string
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) poids?: number
  @IsOptional() @IsString() sku?: string
}

export class UpdateVarianteDto {
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) prixHT?: number
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) tauxTVA?: number
  @IsOptional() @IsEnum(['VRAC', 'BARQUETTE', 'FILET', 'SAC', 'CAISSE', 'PLATEAU']) emballage?: string
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) poids?: number
  @IsOptional() @IsString() sku?: string
}

class ToggleActifDto {
  @IsBoolean() actif!: boolean
}

@ApiTags('produits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('produits')
export class ProduitsController {
  constructor(private readonly produits: ProduitsService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('categorieId') categorieId?: string,
    @Query('actif') actif?: string,
  ) {
    const actifBool = actif === 'true' ? true : actif === 'false' ? false : undefined
    return this.produits.findAll(search, categorieId, actifBool)
  }

  @Post()
  @Roles('GERANT')
  create(@Body() dto: CreateProduitDto) {
    return this.produits.create(dto)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.produits.findOne(id)
  }

  @Put(':id')
  @Roles('GERANT')
  update(@Param('id') id: string, @Body() dto: UpdateProduitDto) {
    return this.produits.update(id, dto)
  }

  @Patch(':id/statut')
  @Roles('GERANT')
  @HttpCode(200)
  toggleActif(@Param('id') id: string, @Body() dto: ToggleActifDto) {
    return this.produits.toggleActif(id, dto.actif)
  }

  @Post(':id/variantes')
  @Roles('GERANT')
  createVariante(@Param('id') produitId: string, @Body() dto: CreateVarianteDto) {
    return this.produits.createVariante(produitId, dto)
  }
}

@ApiTags('variantes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GERANT')
@Controller('variantes')
export class VariantesController {
  constructor(private readonly produits: ProduitsService) {}

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVarianteDto) {
    return this.produits.updateVariante(id, dto)
  }

  @Patch(':id/statut')
  @HttpCode(200)
  toggleActif(@Param('id') id: string, @Body() dto: ToggleActifDto) {
    return this.produits.toggleVarianteActif(id, dto.actif)
  }
}
