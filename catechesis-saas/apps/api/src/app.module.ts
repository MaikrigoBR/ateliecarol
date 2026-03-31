import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module.js';
import { TenantModule } from './modules/tenant/tenant.module.js';
import { TenantContextMiddleware } from './common/tenant/tenant-context.middleware.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    DatabaseModule,
    HealthModule,
    TenantModule,
    AuthModule,
    CatalogModule,
    SettingsModule,
    SubscriptionsModule
  ],
  providers: [TenantContextMiddleware]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
