import { Module } from '@nestjs/common'
import { FacturesService } from './factures.service'
import { FacturesController } from './factures.controller'

@Module({
  providers: [FacturesService],
  controllers: [FacturesController],
  exports: [FacturesService],
})
export class FacturesModule {}
