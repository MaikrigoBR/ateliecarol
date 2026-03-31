import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantService } from './tenant.service.js';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DEVELOPER')
  async listTenants() {
    return this.tenantService.listTenants();
  }

  @Get(':slug')
  async getTenant(@Param('slug') slug: string) {
    return this.tenantService.resolveTenant(slug);
  }
}
