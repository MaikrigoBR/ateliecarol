import { Controller, Get, Inject } from '@nestjs/common';
import { TenantContext } from '../../common/tenant/tenant-context.decorator.js';
import type { TenantContextValue } from '../../common/tenant/tenant-context.js';
import { CatalogService } from './catalog.service.js';

@Controller('catalog')
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalogService: CatalogService) {}

  @Get('courses')
  async listCourses(@TenantContext() tenantContext?: TenantContextValue) {
    const slug = tenantContext?.tenant.slug ?? 'emmaus';
    return {
      tenant: tenantContext?.tenant,
      courses: await this.catalogService.getCoursesForTenant(slug)
    };
  }

  @Get('plans')
  async listPlans(@TenantContext() tenantContext?: TenantContextValue) {
    const slug = tenantContext?.tenant.slug ?? 'emmaus';
    return {
      tenant: tenantContext?.tenant,
      plans: await this.catalogService.getPlansForTenant(slug)
    };
  }
}
