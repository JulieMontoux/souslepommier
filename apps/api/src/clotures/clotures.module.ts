import { Module } from '@nestjs/common'
import { CloturesService } from './clotures.service'
import { CloturesController } from './clotures.controller'

@Module({
  providers: [CloturesService],
  controllers: [CloturesController],
  exports: [CloturesService],
})
export class CloturesModule {}
