import { Module } from '@nestjs/common'
import { ConfigEntrepriseService } from './config-entreprise.service'
import { ConfigEntrepriseController } from './config-entreprise.controller'

@Module({
  providers: [ConfigEntrepriseService],
  controllers: [ConfigEntrepriseController],
  exports: [ConfigEntrepriseService],
})
export class ConfigEntrepriseModule {}
