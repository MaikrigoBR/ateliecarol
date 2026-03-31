import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser, Role } from '@catechesis-saas/types';
import { signJwt } from '../../common/auth/jwt.util.js';
import { verifyPassword } from '../../common/auth/password.util.js';
import { ControlPlanePrismaService } from '../../database/control-plane-prisma.service.js';
import { fallbackDemoUsers, getFallbackTenant } from '../../demo/fallback-data.js';
import { TenantService } from '../tenant/tenant.service.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(ControlPlanePrismaService)
    private readonly controlPlanePrisma: ControlPlanePrismaService,
    @Inject(TenantService)
    private readonly tenantService: TenantService
  ) {}

  async login(email: string, password: string, tenantSlug: string) {
    const tenant = await this.tenantService.resolveTenant(tenantSlug);
    const authenticatedUser =
      (await this.loginAgainstDatabase(email, password, tenant.tenant.slug)) ??
      this.loginAgainstFallback(email, password, tenant.tenant.slug);

    return {
      accessToken: signJwt(authenticatedUser),
      tokenType: 'Bearer',
      tenantSlug: authenticatedUser.tenantSlug,
      user: authenticatedUser
    };
  }

  me(user: AuthenticatedUser) {
    return { user };
  }

  private async loginAgainstDatabase(
    email: string,
    password: string,
    tenantSlug: string
  ): Promise<AuthenticatedUser | null> {
    try {
      const prisma = (await this.controlPlanePrisma.client()) as any;
      const identity = await prisma.identity.findUnique({
        where: { email },
        include: {
          memberships: {
            where: { isActive: true },
            include: { tenant: true }
          },
          platformRoles: true
        }
      });

      if (!identity || !verifyPassword(password, identity.passwordHash)) {
        return null;
      }

      const membership = identity.memberships.find((item: any) => item.tenant.slug === tenantSlug);
      const globalRoles = identity.platformRoles.map((item: any) => item.role as Role);

      if (!membership && !globalRoles.includes('DEVELOPER')) {
        return null;
      }

      await prisma.identity.update({
        where: { id: identity.id },
        data: { lastLoginAt: new Date() }
      });

      const roles = Array.from(
        new Set([...(membership?.roles ?? []), ...globalRoles.filter((role: Role) => role === 'DEVELOPER')])
      ) as Role[];

      return {
        identityId: identity.id,
        email: identity.email,
        tenantId: membership?.tenantId ?? getFallbackTenant(tenantSlug)?.id ?? 'tenant-emmaus',
        tenantSlug,
        roles,
        globalRoles,
        displayName: membership?.displayName ?? identity.email
      };
    } catch {
      return null;
    }
  }

  private loginAgainstFallback(email: string, password: string, tenantSlug: string): AuthenticatedUser {
    const user = fallbackDemoUsers[email];
    if (!user || user.password !== password) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const tenant = getFallbackTenant(tenantSlug);
    const membership =
      user.memberships.find((item) => item.tenantId === tenant?.id) ??
      user.memberships.find((item) => item.roles.includes('DEVELOPER'));

    if (!membership) {
      throw new UnauthorizedException('Usuario sem vinculo com o tenant informado');
    }

    return {
      identityId: `demo-${email}`,
      email,
      tenantId: membership.tenantId,
      tenantSlug,
      roles: membership.roles,
      globalRoles: user.globalRoles,
      displayName: membership.displayName
    };
  }
}
