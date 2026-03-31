import { Body, Controller, Get, Inject, Patch, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Roles } from '../../common/auth/roles.decorator.js';
import { TenantContext } from '../../common/tenant/tenant-context.decorator.js';
import type { TenantContextValue } from '../../common/tenant/tenant-context.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { SettingsService } from './settings.service.js';

class TenantSettingsPatchDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  ageRangeLabel?: string;

  @IsOptional()
  @IsBoolean()
  youthFirst?: boolean;
}

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get('effective')
  async getEffective(@TenantContext() tenantContext?: TenantContextValue) {
    const slug = tenantContext?.tenant.slug ?? 'emmaus';
    return this.settingsService.getEffectiveSettings(slug);
  }

  @Get('layers')
  @Roles('ADMINISTRATOR', 'DEVELOPER')
  async getLayers(@TenantContext() tenantContext?: TenantContextValue) {
    const slug = tenantContext?.tenant.slug ?? 'emmaus';
    return this.settingsService.getConfigLayers(slug);
  }

  @Patch('tenant-preview')
  @Roles('ADMINISTRATOR', 'DEVELOPER')
  async previewTenantPatch(
    @TenantContext() tenantContext: TenantContextValue | undefined,
    @Body() body: TenantSettingsPatchDto
  ) {
    const slug = tenantContext?.tenant.slug ?? 'emmaus';
    return this.settingsService.previewMergedSettings(slug, {
      branding: body.displayName ? { displayName: body.displayName } : undefined,
      audience:
        body.ageRangeLabel || body.youthFirst !== undefined
          ? {
              ageRangeLabel: body.ageRangeLabel,
              youthFirst: body.youthFirst
            }
          : undefined
    });
  }
}
