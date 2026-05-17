import { Module } from '@nestjs/common'
import { TvaService } from './tva.service'
import { TvaController } from './tva.controller'

@Module({
  providers: [TvaService],
  controllers: [TvaController],
  exports: [TvaService],
})
export class TvaModule {}
