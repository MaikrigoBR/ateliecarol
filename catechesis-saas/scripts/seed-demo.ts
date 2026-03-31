import { mergeTenantSettings, platformDefaults } from '@catechesis-saas/config';
import { PrismaClient as ControlPlanePrismaClient } from '../apps/api/generated/control-plane/index.js';
import { PrismaClient as TenantPrismaClient } from '../apps/api/generated/tenant/index.js';
import { hashPassword } from '../apps/api/src/common/auth/password.util.js';
import {
  fallbackCourses,
  fallbackDemoUsers,
  fallbackPlans,
  fallbackTenantSettings,
  fallbackTenants
} from '../apps/api/src/demo/fallback-data.js';

function buildTenantUrl(schemaName: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const url = new URL(databaseUrl);
  url.searchParams.set('schema', schemaName);
  return url.toString();
}

async function main() {
  const controlPlane = new ControlPlanePrismaClient();
  await controlPlane.$connect();

  for (const tenant of fallbackTenants) {
    await controlPlane.tenant.upsert({
      where: { slug: tenant.slug },
      update: {
        displayName: mergeTenantSettings(platformDefaults, fallbackTenantSettings[tenant.slug] ?? {}).branding
          .displayName,
        schemaName: tenant.schemaName,
        paymentMode: tenant.paymentMode,
        status: tenant.status.toUpperCase() as 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
      },
      create: {
        id: tenant.id,
        slug: tenant.slug,
        schemaName: tenant.schemaName,
        displayName: mergeTenantSettings(platformDefaults, fallbackTenantSettings[tenant.slug] ?? {}).branding
          .displayName,
        paymentMode: tenant.paymentMode,
        status: tenant.status.toUpperCase() as 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
      }
    });
  }

  const tenantIdBySlug = new Map<string, string>();
  for (const tenant of fallbackTenants) {
    const row = await controlPlane.tenant.findUniqueOrThrow({
      where: { slug: tenant.slug }
    });
    tenantIdBySlug.set(tenant.slug, row.id);
  }

  for (const [email, user] of Object.entries(fallbackDemoUsers)) {
    const identity = await controlPlane.identity.upsert({
      where: { email },
      update: {
        passwordHash: hashPassword(user.password)
      },
      create: {
        email,
        passwordHash: hashPassword(user.password)
      }
    });

    for (const membership of user.memberships) {
      const tenantSlug =
        fallbackTenants.find((tenant) => tenant.id === membership.tenantId)?.slug ?? 'emmaus';
      const tenantId = tenantIdBySlug.get(tenantSlug);

      if (!tenantId) {
        continue;
      }

      await controlPlane.tenantMembership.upsert({
        where: {
          tenantId_identityId: {
            tenantId,
            identityId: identity.id
          }
        },
        update: {
          displayName: membership.displayName,
          roles: membership.roles,
          isActive: true
        },
        create: {
          tenantId,
          identityId: identity.id,
          displayName: membership.displayName,
          roles: membership.roles,
          isActive: true
        }
      });
    }

    for (const globalRole of user.globalRoles) {
      const exists = await controlPlane.platformUserRole.findFirst({
        where: {
          identityId: identity.id,
          role: globalRole as 'DEVELOPER' | 'PLATFORM_OPERATOR'
        }
      });

      if (!exists) {
        await controlPlane.platformUserRole.create({
          data: {
            identityId: identity.id,
            role: globalRole as 'DEVELOPER' | 'PLATFORM_OPERATOR'
          }
        });
      }
    }
  }

  for (const tenant of fallbackTenants) {
    const client = new TenantPrismaClient({
      datasources: {
        db: {
          url: buildTenantUrl(tenant.schemaName)
        }
      }
    });

    const effectiveSettings = mergeTenantSettings(platformDefaults, fallbackTenantSettings[tenant.slug] ?? {});

    for (const [key, value] of Object.entries({
      branding: effectiveSettings.branding,
      audience: effectiveSettings.audience,
      billing: effectiveSettings.billing,
      pedagogy: effectiveSettings.pedagogy,
      notifications: effectiveSettings.notifications
    })) {
      await client.tenantSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
    }

    const audienceProfile = await client.audienceProfile.upsert({
      where: { id: `${tenant.slug}-audience-profile` },
      update: {
        label: effectiveSettings.audience.ageRangeLabel,
        youthFirst: effectiveSettings.audience.youthFirst,
        inclusiveForAdults: effectiveSettings.audience.inclusiveForAdults,
        toneOfVoice: effectiveSettings.audience.toneOfVoice,
        consentMode: effectiveSettings.audience.consentMode
      },
      create: {
        id: `${tenant.slug}-audience-profile`,
        label: effectiveSettings.audience.ageRangeLabel,
        youthFirst: effectiveSettings.audience.youthFirst,
        inclusiveForAdults: effectiveSettings.audience.inclusiveForAdults,
        toneOfVoice: effectiveSettings.audience.toneOfVoice,
        consentMode: effectiveSettings.audience.consentMode
      }
    });

    for (const course of fallbackCourses[tenant.slug] ?? []) {
      const dbCourse = await client.course.upsert({
        where: { slug: course.slug },
        update: {
          title: course.title,
          summary: course.progressLabel ?? course.audienceLabel,
          audienceProfileId: audienceProfile.id,
          isPublished: true
        },
        create: {
          id: course.id,
          slug: course.slug,
          title: course.title,
          summary: course.progressLabel ?? course.audienceLabel,
          audienceProfileId: audienceProfile.id,
          isPublished: true
        }
      });

      await client.courseModule.upsert({
        where: { id: `${dbCourse.id}-module-1` },
        update: {
          title: 'Boas-vindas',
          orderIndex: 1,
          passingScore: '7.0'
        },
        create: {
          id: `${dbCourse.id}-module-1`,
          courseId: dbCourse.id,
          title: 'Boas-vindas',
          orderIndex: 1,
          passingScore: '7.0'
        }
      });
    }

    for (const plan of Object.values(fallbackPlans[tenant.slug] ?? {})) {
      await client.coursePlan.upsert({
        where: { id: plan.id },
        update: {
          courseId: plan.courseId,
          title: plan.title,
          priceCents: plan.priceCents,
          billingInterval: effectiveSettings.billing.interval,
          billingIntervalUnit: effectiveSettings.billing.intervalUnit,
          gracePeriodDays: effectiveSettings.billing.gracePeriodDays,
          releaseMode: effectiveSettings.pedagogy.releaseMode.toUpperCase() as
            | 'MANUAL'
            | 'SCHEDULED'
            | 'PERFORMANCE_BASED',
          minimumGrade: String(effectiveSettings.pedagogy.minimumGrade),
          maxAttempts: effectiveSettings.pedagogy.maxAttempts
        },
        create: {
          id: plan.id,
          courseId: plan.courseId,
          title: plan.title,
          priceCents: plan.priceCents,
          billingInterval: effectiveSettings.billing.interval,
          billingIntervalUnit: effectiveSettings.billing.intervalUnit,
          gracePeriodDays: effectiveSettings.billing.gracePeriodDays,
          releaseMode: effectiveSettings.pedagogy.releaseMode.toUpperCase() as
            | 'MANUAL'
            | 'SCHEDULED'
            | 'PERFORMANCE_BASED',
          minimumGrade: String(effectiveSettings.pedagogy.minimumGrade),
          maxAttempts: effectiveSettings.pedagogy.maxAttempts
        }
      });
    }

    await client.$disconnect();
  }

  await controlPlane.$disconnect();
  console.log('Demo seed completed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
