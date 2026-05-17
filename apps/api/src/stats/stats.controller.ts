import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  Res,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Response } from 'express'
import { StatsService } from './stats.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'

@ApiTags('stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GERANT')
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('today')
  getToday() {
    return this.stats.getDayStats(new Date())
  }

  @Get('day/:date')
  getDay(@Param('date') date: string) {
    const d = new Date(date)
    if (isNaN(d.getTime())) throw new BadRequestException('Date invalide (format attendu : YYYY-MM-DD)')
    return this.stats.getDayStats(d)
  }

  @Get('year/:year')
  getYear(@Param('year') year: string) {
    const y = parseInt(year, 10)
    if (isNaN(y)) throw new BadRequestException('Année invalide')
    return this.stats.getYearStats(y)
  }

  @Get('period')
  getPeriod(@Query('from') from?: string, @Query('to') to?: string) {
    if (!from || !to) throw new BadRequestException('Les paramètres from et to sont requis')
    const fromDate = new Date(from)
    const toDate = new Date(to)
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Dates invalides (format attendu : YYYY-MM-DD)')
    }
    return this.stats.getPeriodStats(fromDate, toDate)
  }

  @Get('export')
  async exportCsv(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    if (!from || !to) throw new BadRequestException('Les paramètres from et to sont requis')
    const fromDate = new Date(from)
    const toDate = new Date(to)
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Dates invalides (format attendu : YYYY-MM-DD)')
    }

    const rows = await this.stats.exportCsv(fromDate, toDate)

    const header = 'nom;sku;taux_tva;qte;caHT;tva;caTTC\n'
    const body = rows
      .map((r) => `${r.nom};${r.sku};${r.taux};${r.qte};${r.caHT};${r.tva};${r.caTTC}`)
      .join('\n')

    res!
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="export-${from}-${to}.csv"`,
      })
      .send(header + body)
  }
}
