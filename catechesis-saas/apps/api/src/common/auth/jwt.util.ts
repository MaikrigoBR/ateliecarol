import { createHmac } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser } from '@catechesis-saas/types';

type JwtPayload = AuthenticatedUser & {
  iat: number;
  exp: number;
};

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function signSegment(content: string, secret: string) {
  return createHmac('sha256', secret).update(content).digest('base64url');
}

function getJwtSecret() {
  return process.env.JWT_SECRET || 'local-dev-secret';
}

export function signJwt(user: AuthenticatedUser, expiresInSeconds = 60 * 60 * 8) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    ...user,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signSegment(`${encodedHeader}.${encodedPayload}`, getJwtSecret());

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJwt(token: string): AuthenticatedUser {
  const [encodedHeader, encodedPayload, signature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new UnauthorizedException('Token inválido');
  }

  const expectedSignature = signSegment(`${encodedHeader}.${encodedPayload}`, getJwtSecret());
  if (signature !== expectedSignature) {
    throw new UnauthorizedException('Assinatura inválida');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload;
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp <= now) {
    throw new UnauthorizedException('Token expirado');
  }

  const { iat, exp, ...user } = payload;
  return user;
}
