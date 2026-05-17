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
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  MinLength,
  IsNumber,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ClientsService } from './clients.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'

export class CreateClientDto {
  @IsString() @MinLength(1) raisonSociale!: string
  @IsOptional() @IsString() siret?: string
  @IsOptional() @IsString() tvaIntracommunautaire?: string
  @IsOptional() @IsString() adresse?: string
  @IsOptional() @IsString() codePostal?: string
  @IsOptional() @IsString() ville?: string
  @IsOptional() @IsString() pays?: string
  @IsOptional() @IsEmail() email?: string
  @IsOptional() @IsString() telephone?: string
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) conditionsPaiement?: number
  @IsOptional() @IsString() notes?: string
}

export class UpdateClientDto {
  @IsOptional() @IsString() @MinLength(1) raisonSociale?: string
  @IsOptional() @IsString() siret?: string
  @IsOptional() @IsString() tvaIntracommunautaire?: string
  @IsOptional() @IsString() adresse?: string
  @IsOptional() @IsString() codePostal?: string
  @IsOptional() @IsString() ville?: string
  @IsOptional() @IsString() pays?: string
  @IsOptional() @IsEmail() email?: string
  @IsOptional() @IsString() telephone?: string
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) conditionsPaiement?: number
  @IsOptional() @IsString() notes?: string
}

export class ToggleActifDto {
  @IsBoolean() actif!: boolean
}

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GERANT')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('actif') actif?: string) {
    const actifBool = actif === 'true' ? true : actif === 'false' ? false : undefined
    return this.clients.findAll(search, actifBool)
  }

  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clients.create(dto)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clients.findOne(id)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clients.update(id, dto)
  }

  @Patch(':id/statut')
  toggleActif(@Param('id') id: string, @Body() dto: ToggleActifDto) {
    return this.clients.toggleActif(id, dto.actif)
  }
}
