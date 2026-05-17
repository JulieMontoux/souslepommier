import { Module } from '@nestjs/common'
import { RgpdService } from './rgpd.service'
import { RgpdController } from './rgpd.controller'

@Module({
  providers: [RgpdService],
  controllers: [RgpdController],
  exports: [RgpdService],
})
export class RgpdModule {}
