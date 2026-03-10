import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public } from './decorators/public.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from './decorators/current-user.decorator';
import type {
  ForgotPasswordDto,
  ResetPasswordDto,
  UserAuthDto,
} from '../../dtos/user.dto';
import type { RefreshValidateResult } from './strategies/jwt-refresh.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: UserAuthDto) {
    return this.authService.login(body.email, body.password, body.rememberMe);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request & { user: RefreshValidateResult }) {
    const { user, rememberMe } = req.user;
    const refreshToken = req.cookies?.refresh_token ?? '';
    return this.authService.refreshTokens(user.id, refreshToken, rememberMe);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('register')
  async register(@Body() body: UserAuthDto) {
    return this.authService.register(body.email, body.password);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Get('verify')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmailToken(token);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return {
      message: 'Logged out successfully',
    };
  }
}
