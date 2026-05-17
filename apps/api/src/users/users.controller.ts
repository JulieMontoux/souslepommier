import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import {
  IsEmail,
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  MinLength,
} from 'class-validator'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator'

export class CreateUserDto {
  @IsEmail() email!: string
  @IsString() @MinLength(1) nom!: string
  @IsString() @MinLength(1) prenom!: string
  @IsString() @MinLength(8) password!: string
  @IsOptional() @IsEnum(['GERANT', 'VENDEUR']) role?: 'GERANT' | 'VENDEUR'
}

export class UpdateUserDto {
  @IsOptional() @IsEmail() email?: string
  @IsOptional() @IsString() @MinLength(1) nom?: string
  @IsOptional() @IsString() @MinLength(1) prenom?: string
  @IsOptional() @IsEnum(['GERANT', 'VENDEUR']) role?: 'GERANT' | 'VENDEUR'
}

class ToggleActifDto {
  @IsBoolean() actif!: boolean
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GERANT')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll() {
    return this.users.findAll()
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto)
  }

  @Patch(':id/statut')
  @HttpCode(200)
  toggleActif(
    @Param('id') id: string,
    @Body() dto: ToggleActifDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.toggleActif(id, dto.actif, user.sub)
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  resetPassword(@Param('id') id: string) {
    return this.users.resetPassword(id)
  }

  @Delete(':id')
  @HttpCode(200)
  anonymize(@Param('id') id: string) {
    return this.users.anonymizeRgpd(id)
  }
}
