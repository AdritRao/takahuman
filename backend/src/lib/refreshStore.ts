import { randomUUID } from 'crypto';
import { redis } from './redis';
import { config } from '../config';

const ttlSeconds = config.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60;

export type RefreshSessionRecord = {
  userId: number;
  jti: string;
  createdAt: number;
};

function key(sessionId: string) {
  return `rt:${sessionId}`;
}

export async function createRefreshSession(userId: number) {
  const sessionId = randomUUID();
  const jti = randomUUID();
  const record: RefreshSessionRecord = { userId, jti, createdAt: Date.now() };
  await redis.set(key(sessionId), JSON.stringify(record), 'EX', ttlSeconds);
  return { sessionId, jti };
}

export async function getRefreshSession(sessionId: string): Promise<RefreshSessionRecord | null> {
  const raw = await redis.get(key(sessionId));
  if (!raw) return null;
  return JSON.parse(raw) as RefreshSessionRecord;
}

export async function rotateRefreshSession(sessionId: string, nextJti: string) {
  const existing = await getRefreshSession(sessionId);
  if (!existing) return false;
  const updated: RefreshSessionRecord = { ...existing, jti: nextJti };
  await redis.set(key(sessionId), JSON.stringify(updated), 'EX', ttlSeconds);
  return true;
}

export async function revokeRefreshSession(sessionId: string) {
  await redis.del(key(sessionId));
}


