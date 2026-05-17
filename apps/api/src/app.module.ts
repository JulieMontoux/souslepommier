import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { ProduitsModule } from './produits/produits.module'
import { CategoriesModule } from './categories/categories.module'
import { VentesModule } from './ventes/ventes.module'
import { ClientsModule } from './clients/clients.module'
import { FacturesModule } from './factures/factures.module'
import { CloturesModule } from './clotures/clotures.module'
import { StatsModule } from './stats/stats.module'
import { AuditModule } from './audit/audit.module'
import { TvaModule } from './tva/tva.module'
import { RgpdModule } from './rgpd/rgpd.module'
import { ConfigEntrepriseModule } from './config-entreprise/config-entreprise.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProduitsModule,
    CategoriesModule,
    VentesModule,
    ClientsModule,
    FacturesModule,
    CloturesModule,
    StatsModule,
    AuditModule,
    TvaModule,
    RgpdModule,
    ConfigEntrepriseModule,
  ],
})
export class AppModule {}
