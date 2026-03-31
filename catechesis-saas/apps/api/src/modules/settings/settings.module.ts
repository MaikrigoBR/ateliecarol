import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  imports: [TenantModule],
  controllers: [SettingsController],
  providers: [SettingsService]
})
export class SettingsModule {}
