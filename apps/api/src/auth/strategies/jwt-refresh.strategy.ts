import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

export interface JwtRefreshPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}

export interface RefreshValidateResult {
  user: { id: string; email: string; role: string };
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[REFRESH_TOKEN_COOKIE] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtRefreshPayload): Promise<RefreshValidateResult> {
    return {
      user: { id: payload.sub, email: payload.email, role: payload.role },
      refreshTokenExpiresAt: new Date(payload.exp * 1000),
    };
  }
}
