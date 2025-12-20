import { randomUUID } from 'crypto';
import { redis } from './redis';
import { config } from '../config';

const ttlSeconds = config.SESSION_TTL_DAYS * 24 * 60 * 60;

export interface SessionData {
  userId: number;
  createdAt: number;
}

export async function createSession(userId: number): Promise<string> {
  const sid = randomUUID();
  const key = sessionKey(sid);
  const now = Date.now();
  const value: SessionData = { userId, createdAt: now };
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const raw = await redis.get(sessionKey(sid));
  if (!raw) return null;
  // Sliding expiration
  await redis.expire(sessionKey(sid), ttlSeconds);
  return JSON.parse(raw) as SessionData;
}

export async function deleteSession(sid: string): Promise<void> {
  await redis.del(sessionKey(sid));
}

function sessionKey(sid: string) {
  return `session:${sid}`;
}


