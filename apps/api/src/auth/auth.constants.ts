import { CookieOptions } from 'express';

export const AUTH_COOKIE_NAME = 'access_token';
export const DEFAULT_JWT_EXPIRES_IN_MS = 15 * 60 * 1000; // 15 minutes

export function parseDurationToMs(duration: string): number {
  const trimmed = duration.trim();
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(trimmed);
  if (!match) {
    return DEFAULT_JWT_EXPIRES_IN_MS;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = (match[2] ?? 's').toLowerCase();

  switch (unit) {
    case 'ms':
      return amount;
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return DEFAULT_JWT_EXPIRES_IN_MS;
  }
}

export function buildAuthCookieOptions(
  isProduction: boolean,
  maxAgeMs?: number,
): CookieOptions {
  const baseOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  };

  if (typeof maxAgeMs === 'number') {
    baseOptions.maxAge = maxAgeMs;
  }

  return baseOptions;
}
