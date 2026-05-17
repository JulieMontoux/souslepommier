import { Module } from '@nestjs/common'
import { ProduitsService } from './produits.service'
import { ProduitsController, VariantesController } from './produits.controller'

@Module({
  providers: [ProduitsService],
  controllers: [ProduitsController, VariantesController],
  exports: [ProduitsService],
})
export class ProduitsModule {}
