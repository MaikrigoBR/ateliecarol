import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantContextValue } from './tenant-context.js';

export const TenantContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContextValue | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantContext as TenantContextValue | undefined;
  }
);
