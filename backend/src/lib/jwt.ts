import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config';

type JwtBase = {
  iss: 'takahuman-api';
  aud: 'takahuman-client';
};

export type AccessTokenPayload = JwtBase & {
  sub: number; // userId
  tokenVersion: number;
  typ: 'access';
};

export type RefreshTokenPayload = JwtBase & {
  sub: number; // userId
  sessionId: string;
  jti: string;
  tokenVersion: number;
  typ: 'refresh';
};

const commonClaims: JwtBase = {
  iss: 'takahuman-api',
  aud: 'takahuman-client',
};

export function signAccessToken(userId: number, tokenVersion: number): string {
  const payload: AccessTokenPayload = {
    ...commonClaims,
    sub: userId,
    tokenVersion,
    typ: 'access',
  };
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: `${config.JWT_ACCESS_TTL_MIN}m`,
  });
}

export function signRefreshToken(params: {
  userId: number;
  sessionId: string;
  jti?: string;
  tokenVersion: number;
}): string {
  const jti = params.jti ?? randomUUID();
  const payload: RefreshTokenPayload = {
    ...commonClaims,
    sub: params.userId,
    sessionId: params.sessionId,
    jti,
    tokenVersion: params.tokenVersion,
    typ: 'refresh',
  };
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: `${config.JWT_REFRESH_TTL_DAYS}d`,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, config.JWT_SECRET) as AccessTokenPayload;
  if (decoded.typ !== 'access') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, config.JWT_SECRET) as RefreshTokenPayload;
  if (decoded.typ !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
}


