import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module.js';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [TenantModule],
  controllers: [CatalogController],
  providers: [CatalogService]
})
export class CatalogModule {}
