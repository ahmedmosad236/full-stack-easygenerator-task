import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SafeUser, UsersService } from '../../users/users.service';
import { AUTH_COOKIE_NAME } from '../auth.constants';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

function extractJwtFromCookie(req: Request): string | null {
  if (req && req.cookies && typeof req.cookies[AUTH_COOKIE_NAME] === 'string') {
    const token = req.cookies[AUTH_COOKIE_NAME].trim();
    return token.length > 0 ? token : null;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractJwtFromCookie]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<SafeUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid authentication token.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Authentication session is no longer valid.');
    }

    return this.usersService.toSafeUser(user);
  }
}
