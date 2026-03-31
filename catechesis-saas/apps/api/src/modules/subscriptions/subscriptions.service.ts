import { Injectable, NotFoundException } from '@nestjs/common';
import { createPlanSnapshot } from '@catechesis-saas/config';
import { TenantClientFactory } from '../../database/tenant-client.factory.js';
import { getFallbackPlan, getFallbackTenant } from '../../demo/fallback-data.js';
import { TenantService } from '../tenant/tenant.service.js';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantClientFactory: TenantClientFactory
  ) {}

  async createSubscription(tenantSlug: string, input: { studentIdentityId: string; planId: string }) {
    const tenant = getFallbackTenant(tenantSlug);
    const plan = getFallbackPlan(tenantSlug, input.planId);

    if (!plan) {
      throw new NotFoundException(`Plano ${input.planId} não encontrado para ${tenantSlug}`);
    }

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

    if (!tenant) {
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
      return response;
    }
  }
}
