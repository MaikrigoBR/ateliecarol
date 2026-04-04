import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createPlanSnapshot } from '@catechesis-saas/config';
import type { EnrollmentSummary } from '@catechesis-saas/types';
import { TenantClientFactory } from '../../database/tenant-client.factory.js';
import { getFallbackCoursesForTenant, getFallbackPlan, getFallbackTenant } from '../../demo/fallback-data.js';
import { TenantService } from '../tenant/tenant.service.js';

const runtimeEnrollmentStore = new Map<string, EnrollmentSummary[]>();

function saveRuntimeEnrollment(tenantSlug: string, enrollment: EnrollmentSummary) {
  const current = runtimeEnrollmentStore.get(tenantSlug) ?? [];
  runtimeEnrollmentStore.set(
    tenantSlug,
    [enrollment, ...current.filter((item) => item.id !== enrollment.id)].slice(0, 20)
  );
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject(TenantService)
    private readonly tenantService: TenantService,
    @Inject(TenantClientFactory)
    private readonly tenantClientFactory: TenantClientFactory
  ) {}

  async createSubscription(tenantSlug: string, input: { studentIdentityId: string; planId: string }) {
    const tenant = getFallbackTenant(tenantSlug);
    const plan = getFallbackPlan(tenantSlug, input.planId);

    if (!plan) {
      throw new NotFoundException(`Plano ${input.planId} nao encontrado para ${tenantSlug}`);
    }

    const fallbackCourse = getFallbackCoursesForTenant(tenantSlug).find((course) => course.id === plan.courseId);
    const tenantSettings = await this.tenantService.getEffectiveSettings(tenantSlug);
    const snapshot = createPlanSnapshot(plan.id, plan.title, tenantSettings);
    const response = {
      tenantSlug,
      enrollment: {
        id: `enrollment-${Date.now()}`,
        studentIdentityId: input.studentIdentityId,
        courseId: plan.courseId,
        planId: plan.id,
        status: 'pending_payment',
        planSnapshot: snapshot,
        pricingSnapshot: {
          priceCents: plan.priceCents,
          currency: 'BRL'
        },
        policySnapshot: {
          consentMode: tenantSettings.audience.consentMode,
          releaseMode: tenantSettings.pedagogy.releaseMode
        }
      },
      subscription: {
        provider: 'mercado_pago',
        ownershipMode: tenantSettings.billing.paymentOwnershipMode,
        status: 'PENDING'
      }
    };
    const runtimeEnrollment: EnrollmentSummary = {
      id: response.enrollment.id,
      studentIdentityId: input.studentIdentityId,
      courseId: response.enrollment.courseId,
      courseTitle: fallbackCourse?.title ?? plan.title,
      planId: plan.id,
      planTitle: plan.title,
      enrollmentStatus: response.enrollment.status,
      subscriptionStatus: response.subscription.status,
      startedAt: new Date().toISOString(),
      priceCents: plan.priceCents,
      currency: 'BRL',
      paymentOwnershipMode: tenantSettings.billing.paymentOwnershipMode
    };

    if (!tenant) {
      saveRuntimeEnrollment(tenantSlug, runtimeEnrollment);
      return response;
    }

    try {
      const client = await this.tenantClientFactory.getClient(tenant.schemaName);
      const enrollment = await client.enrollment.create({
        data: {
          studentIdentityId: input.studentIdentityId,
          courseId: plan.courseId,
          planId: plan.id,
          status: 'pending_payment',
          planSnapshot: response.enrollment.planSnapshot,
          pricingSnapshot: response.enrollment.pricingSnapshot,
          policySnapshot: response.enrollment.policySnapshot
        }
      });

      const subscription = await client.subscription.create({
        data: {
          enrollmentId: enrollment.id,
          provider: 'mercado_pago',
          status: 'PENDING'
        }
      });

      saveRuntimeEnrollment(tenantSlug, {
        ...runtimeEnrollment,
        id: enrollment.id
      });

      return {
        ...response,
        enrollment: {
          ...response.enrollment,
          id: enrollment.id
        },
        subscription: {
          ...response.subscription,
          id: subscription.id
        }
      };
    } catch {
      saveRuntimeEnrollment(tenantSlug, runtimeEnrollment);
      return response;
    }
  }

  async listSubscriptionsForStudent(tenantSlug: string, studentIdentityId: string) {
    const tenant = getFallbackTenant(tenantSlug);
    const runtimeItems = (runtimeEnrollmentStore.get(tenantSlug) ?? []).filter(
      (item) => item.studentIdentityId === studentIdentityId
    );

    if (!tenant) {
      return runtimeItems;
    }

    try {
      const client = await this.tenantClientFactory.getClient(tenant.schemaName);
      const rows = await client.enrollment.findMany({
        where: { studentIdentityId },
        include: {
          course: true,
          plan: true,
          subscription: true
        },
        orderBy: {
          startedAt: 'desc'
        }
      });

      const databaseItems: EnrollmentSummary[] = rows.map((row) => ({
        id: row.id,
        studentIdentityId: row.studentIdentityId,
        courseId: row.courseId,
        courseTitle: row.course.title,
        planId: row.planId,
        planTitle: row.plan.title,
        enrollmentStatus: row.status,
        subscriptionStatus: row.subscription?.status ?? 'PENDING',
        startedAt: row.startedAt.toISOString(),
        priceCents: row.pricingSnapshot?.priceCents ?? 0,
        currency: row.pricingSnapshot?.currency ?? 'BRL',
        paymentOwnershipMode: tenant.paymentMode
      }));

      return [
        ...runtimeItems,
        ...databaseItems.filter((item) => !runtimeItems.some((runtime) => runtime.id === item.id))
      ];
    } catch {
      return runtimeItems;
    }
  }
}
