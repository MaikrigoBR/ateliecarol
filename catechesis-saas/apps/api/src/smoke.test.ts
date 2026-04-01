import 'reflect-metadata';
import assert from 'node:assert/strict';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser, Role, TenantSettings, TenantSummary } from '@catechesis-saas/types';
import { signJwt, verifyJwt } from './common/auth/jwt.util.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { TenantContextMiddleware } from './common/tenant/tenant-context.middleware.js';
import { AuthService } from './modules/auth/auth.service.js';
import { getFallbackTenantSettings } from './demo/fallback-data.js';

const adminUser: AuthenticatedUser = {
  identityId: 'demo-admin@emmaus.local',
  email: 'admin@emmaus.local',
  tenantId: 'tenant-emmaus',
  tenantSlug: 'emmaus',
  roles: ['ADMINISTRATOR'],
  globalRoles: [],
  displayName: 'Ana Gestora'
};

function createTenantSummary(slug: string): TenantSummary {
  return {
    id: `tenant-${slug}`,
    slug,
    schemaName: `tenant_${slug}`,
    status: 'active',
    paymentMode: 'HYBRID'
  };
}

function createTenantServiceStub() {
  return {
    resolveTenant: async (slug: string) => ({
      tenant: createTenantSummary(slug),
      settings: getFallbackTenantSettings(slug) as TenantSettings
    })
  };
}

function createControlPlaneStub() {
  return {
    client: async () => {
      throw new Error('database unavailable in smoke tests');
    }
  };
}

function createExecutionContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request
    }),
    getHandler: () => function handler() {},
    getClass: () => class TestClass {}
  };
}

async function runCase(name: string, execute: () => void | Promise<void>) {
  try {
    await execute();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

await runCase('JWT roundtrip keeps the authenticated user payload', () => {
  const token = signJwt(adminUser, 300);
  const restoredUser = verifyJwt(token);

  assert.deepEqual(restoredUser, adminUser);
});

await runCase('JWT verification rejects expired tokens', () => {
  const token = signJwt(adminUser, -1);

  assert.throws(() => verifyJwt(token), UnauthorizedException);
});

await runCase('JwtAuthGuard attaches the user to the request', () => {
  const guard = new JwtAuthGuard();
  const token = signJwt(adminUser, 300);
  const request: Record<string, unknown> = {
    headers: {
      authorization: `Bearer ${token}`
    }
  };

  const allowed = guard.canActivate(createExecutionContext(request) as never);

  assert.equal(allowed, true);
  assert.deepEqual(request.user, adminUser);
});

await runCase('RolesGuard allows matching roles and blocks forbidden roles', () => {
  const allowReflector = {
    getAllAndOverride: () => ['ADMINISTRATOR'] as Role[]
  };
  const denyReflector = {
    getAllAndOverride: () => ['DEVELOPER'] as Role[]
  };
  const request = { user: adminUser };

  const allowGuard = new RolesGuard(allowReflector as never);
  const denyGuard = new RolesGuard(denyReflector as never);

  assert.equal(allowGuard.canActivate(createExecutionContext(request) as never), true);
  assert.throws(() => denyGuard.canActivate(createExecutionContext(request) as never), ForbiddenException);
});

await runCase('TenantContextMiddleware resolves localhost to the default tenant', () => {
  const middleware = new TenantContextMiddleware();
  const request: any = {
    headers: {
      host: 'localhost:3000'
    },
    query: {}
  };

  let nextCalled = false;
  middleware.use(request, {} as never, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(request.tenantContext?.tenant.slug, 'emmaus');
});

await runCase('TenantContextMiddleware resolves custom local hostnames to tenant slugs', () => {
  const middleware = new TenantContextMiddleware();
  const request: any = {
    headers: {
      host: 'agape.local:3000'
    },
    query: {}
  };

  middleware.use(request, {} as never, () => undefined);

  assert.equal(request.tenantContext?.tenant.slug, 'agape');
});

await runCase('AuthService logs in with fallback demo credentials when the database is unavailable', async () => {
  const service = new AuthService(createControlPlaneStub() as never, createTenantServiceStub() as never);

  const session = await service.login('admin@emmaus.local', 'Admin@123', 'emmaus');

  assert.equal(session.user.email, 'admin@emmaus.local');
  assert.deepEqual(session.user.roles, ['ADMINISTRATOR']);
  assert.equal(verifyJwt(session.accessToken).displayName, 'Ana Gestora');
});

await runCase('AuthService rejects invalid fallback demo credentials', async () => {
  const service = new AuthService(createControlPlaneStub() as never, createTenantServiceStub() as never);

  await assert.rejects(
    async () => service.login('admin@emmaus.local', 'senha-incorreta', 'emmaus'),
    UnauthorizedException
  );
});
