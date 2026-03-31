import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import type { AuthenticatedUser } from '@catechesis-saas/types';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AuthService } from './auth.service.js';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  tenantSlug!: string;
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password, body.tenantSlug);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser | undefined) {
    if (!user) {
      return { user: null };
    }

    return this.authService.me(user);
  }
}
