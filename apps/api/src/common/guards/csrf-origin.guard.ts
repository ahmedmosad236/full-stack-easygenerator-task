import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfOriginGuard implements CanActivate {
  private readonly allowedOrigins: Set<string>;

  constructor(private readonly configService: ConfigService) {
    const rawOrigins = this.configService.get<string>(
      'WEB_ORIGIN',
      'http://localhost:5173',
    );
    this.allowedOrigins = new Set(
      rawOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    if (SAFE_METHODS.has(method)) {
      return true;
    }

    const originHeader = request.headers.origin;
    if (typeof originHeader === 'string' && originHeader.length > 0) {
      if (!this.allowedOrigins.has(originHeader)) {
        throw new ForbiddenException(
          'Cross-site request blocked: untrusted Origin header.',
        );
      }
      return true;
    }

    const refererHeader = request.headers.referer;
    if (typeof refererHeader === 'string' && refererHeader.length > 0) {
      try {
        const refererOrigin = new URL(refererHeader).origin;
        if (!this.allowedOrigins.has(refererOrigin)) {
          throw new ForbiddenException(
            'Cross-site request blocked: untrusted Referer header.',
          );
        }
      } catch (err) {
        if (err instanceof ForbiddenException) {
          throw err;
        }
        throw new ForbiddenException(
          'Cross-site request blocked: malformed Referer header.',
        );
      }
    }

    return true;
  }
}
