import { Inject, Injectable } from '@nestjs/common';
import type { CourseSummary, PlanSummary } from '@catechesis-saas/types';
import { TenantClientFactory } from '../../database/tenant-client.factory.js';
import {
  getFallbackCoursesForTenant,
  getFallbackTenant,
  getFallbackTenantSettings,
  listFallbackPlansForTenant
} from '../../demo/fallback-data.js';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(TenantClientFactory) private readonly tenantClientFactory: TenantClientFactory
  ) {}

  async getCoursesForTenant(tenantSlug: string): Promise<CourseSummary[]> {
    const tenant = getFallbackTenant(tenantSlug);

    if (!tenant) {
      return [];
    }

    try {
      const client = await this.tenantClientFactory.getClient(tenant.schemaName);
      const settings = getFallbackTenantSettings(tenantSlug);
      const courses = await client.course.findMany({
        include: {
          modules: true
        },
        orderBy: {
          title: 'asc'
        }
      });

      return courses.map((course) => ({
        id: course.id,
        slug: course.slug,
        title: course.title,
        audienceLabel: settings.audience.ageRangeLabel,
        moduleCount: course.modules.length,
        progressLabel: course.isPublished ? 'Curso publicado no tenant' : 'Curso em rascunho'
      }));
    } catch {
      return getFallbackCoursesForTenant(tenantSlug);
    }
  }

  async getPlansForTenant(tenantSlug: string): Promise<PlanSummary[]> {
    const tenant = getFallbackTenant(tenantSlug);
    const settings = getFallbackTenantSettings(tenantSlug);

    if (!tenant) {
      return [];
    }

    try {
      const client = await this.tenantClientFactory.getClient(tenant.schemaName);
      const plans = await client.coursePlan.findMany({
        where: { isActive: true },
        include: {
          course: true
        },
        orderBy: {
          title: 'asc'
        }
      });

      return plans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        courseId: plan.courseId,
        courseTitle: plan.course.title,
        priceCents: plan.priceCents,
        currency: 'BRL',
        interval: plan.billingInterval,
        intervalUnit: plan.billingIntervalUnit.toLowerCase() as PlanSummary['intervalUnit'],
        paymentOwnershipMode: tenant.paymentMode ?? settings.billing.paymentOwnershipMode
      }));
    } catch {
      return listFallbackPlansForTenant(tenantSlug);
    }
  }
}
