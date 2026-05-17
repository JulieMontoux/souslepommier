import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'
import { CategoriesService } from './categories.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'

export class CreateCategorieDto {
  @IsString() @MinLength(1) nom!: string
}

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  findAll() {
    return this.categories.findAll()
  }

  @Post()
  @Roles('GERANT')
  create(@Body() dto: CreateCategorieDto) {
    return this.categories.create(dto)
  }

  @Delete(':id')
  @Roles('GERANT')
  @HttpCode(200)
  delete(@Param('id') id: string) {
    return this.categories.delete(id)
  }
}
