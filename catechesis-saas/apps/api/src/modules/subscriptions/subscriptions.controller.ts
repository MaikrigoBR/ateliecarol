import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { AuthenticatedUser } from '@catechesis-saas/types';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantContext } from '../../common/tenant/tenant-context.decorator.js';
import type { TenantContextValue } from '../../common/tenant/tenant-context.js';
import { SubscriptionsService } from './subscriptions.service.js';

class CreateSubscriptionDto {
  @IsString()
  @IsOptional()
  studentIdentityId?: string;

  @IsString()
  @IsNotEmpty()
  planId!: string;
}

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'ADMINISTRATOR')
  async create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @TenantContext() tenantContext: TenantContextValue | undefined,
    @Body() body: CreateSubscriptionDto
  ) {
    const slug = tenantContext?.tenant.slug ?? 'emmaus';
    const studentIdentityId =
      user?.roles.includes('STUDENT') ? user.identityId : body.studentIdentityId;

    if (!studentIdentityId) {
      throw new BadRequestException('studentIdentityId e obrigatorio para administradores');
    }

    return this.subscriptionsService.createSubscription(slug, {
      ...body,
      studentIdentityId
    });
  }
}
