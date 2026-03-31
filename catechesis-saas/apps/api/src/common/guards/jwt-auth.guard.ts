import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser } from '@catechesis-saas/types';
import { verifyJwt } from '../auth/jwt.util.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token Bearer não informado');
    }

    const token = authHeader.slice('Bearer '.length);
    const user = verifyJwt(token);
    request.user = user satisfies AuthenticatedUser;
    return true;
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
