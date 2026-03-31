import { Global, Module } from '@nestjs/common';
import { ControlPlanePrismaService } from './control-plane-prisma.service.js';
import { TenantClientFactory } from './tenant-client.factory.js';

@Global()
@Module({
  providers: [ControlPlanePrismaService, TenantClientFactory],
  exports: [ControlPlanePrismaService, TenantClientFactory]
})
export class DatabaseModule {}
