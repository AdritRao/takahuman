import { Router } from 'express';
import argon2 from 'argon2';
import { prisma } from '../lib/prisma';
import { loginSchema, signupSchema } from '../validation/schemas';
import { config } from '../config';
import { requireAuth } from '../middleware/auth';
import { redis } from '../lib/redis';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/jwt';
import {
  createRefreshSession,
  getRefreshSession,
  rotateRefreshSession,
  revokeRefreshSession,
} from '../lib/refreshStore';
import { rateLimit } from '../middleware/rateLimit';

export const authRouter = Router();

const rlAuthTight = rateLimit({ windowSec: 60, max: 15, key: (req) => `auth:${req.ip}` });
const rlAuthEmail = rateLimit({
  windowSec: 60 * 15,
  max: 50,
  key: (req) => {
    const email = (req.body?.email as string | undefined)?.toLowerCase() ?? 'na';
    return `auth-email:${email}:${req.ip}`;
  },
});

function setAuthCookies(res: any, access: string, refresh: string) {
  const secure = config.NODE_ENV === 'production';
  res.cookie(config.ACCESS_COOKIE_NAME, access, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: config.JWT_ACCESS_TTL_MIN * 60 * 1000,
  });
  res.cookie(config.REFRESH_COOKIE_NAME, refresh, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: config.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

authRouter.post('/signup', rlAuthTight, rlAuthEmail, async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, passwordHash },
        select: { id: true, email: true, tokenVersion: true }
      });
      await tx.organization.create({
        data: {
          name: `${created.email}'s Org`,
          members: { create: { userId: created.id, role: 'OWNER' } },
        },
      });
      return created;
    });
    const { sessionId, jti } = await createRefreshSession(user.id);
    const access = signAccessToken(user.id, user.tokenVersion);
    const refresh = signRefreshToken({
      userId: user.id,
      sessionId,
      jti,
      tokenVersion: user.tokenVersion,
    });
    setAuthCookies(res, access, refresh);
    return res.status(201).json({ user: { id: user.id, email: user.email } });
  } catch (_e) {
    return res.status(500).json({ error: 'Failed to signup' });
  }
});

authRouter.post('/login', rlAuthTight, rlAuthEmail, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;
    const key = `login:${email}:${req.ip}`;
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, 15 * 60);
    }
    if (attempts > 10) {
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, passwordHash: true, tokenVersion: true } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await redis.del(key);
    const { sessionId, jti } = await createRefreshSession(user.id);
    const access = signAccessToken(user.id, user.tokenVersion);
    const refresh = signRefreshToken({
      userId: user.id,
      sessionId,
      jti,
      tokenVersion: user.tokenVersion,
    });
    setAuthCookies(res, access, refresh);
    return res.json({ user: { id: user.id, email: user.email } });
  } catch (_e) {
    return res.status(500).json({ error: 'Failed to login' });
  }
});

authRouter.post('/logout', requireAuth, async (req, res) => {
  try {
    const refresh = req.cookies?.[config.REFRESH_COOKIE_NAME];
    if (refresh) {
      try {
        const payload = verifyRefreshToken(refresh);
        await revokeRefreshSession(payload.sessionId);
      } catch {
        // ignore invalid token
      }
    }
    res.clearCookie(config.ACCESS_COOKIE_NAME, { path: '/' });
    res.clearCookie(config.REFRESH_COOKIE_NAME, { path: '/' });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to logout' });
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  return res.json({ user: req.user });
});

// Rotate refresh token and issue new access
authRouter.post('/refresh', rlAuthTight, async (req, res) => {
  try {
    const token = req.cookies?.[config.REFRESH_COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = verifyRefreshToken(token);
    const record = await getRefreshSession(payload.sessionId);
    if (!record) return res.status(401).json({ error: 'Unauthorized' });
    if (record.jti !== payload.jti) {
      // Reuse detection: revoke and bump tokenVersion to force global logout
      await revokeRefreshSession(payload.sessionId);
      await prisma.user.update({
        where: { id: payload.sub },
        data: { tokenVersion: { increment: 1 } },
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const nextJti = jwt.sign({ j: 'r' }, config.JWT_SECRET).slice(0, 24);
    await rotateRefreshSession(payload.sessionId, nextJti);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, tokenVersion: true },
    });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const access = signAccessToken(user.id, user.tokenVersion);
    const refresh = signRefreshToken({
      userId: user.id,
      sessionId: payload.sessionId,
      jti: nextJti,
      tokenVersion: user.tokenVersion,
    });
    setAuthCookies(res, access, refresh);
    return res.json({ success: true });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

// Email verification: request and confirm
authRouter.post('/verify/request', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const token = jwt.sign({ sub: user.id, email: user.email, typ: 'email-verify' }, config.JWT_SECRET, { expiresIn: '24h' });
  // Integrate an email provider; for now, return token for manual testing
  return res.json({ token });
});

authRouter.post('/verify/confirm', requireAuth, async (req, res) => {
  const parsed = z.object({ token: z.string().min(10) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const payload = jwt.verify(parsed.data.token, config.JWT_SECRET) as any;
    if (payload.typ !== 'email-verify' || payload.sub !== req.user!.id) {
      return res.status(400).json({ error: 'Invalid token' });
    }
    // In a real system you'd mark emailVerified on User
    return res.json({ success: true });
  } catch {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// Password reset: request and reset
authRouter.post('/password/request', async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return res.json({ success: true }); // do not reveal user existence
  const token = jwt.sign({ sub: user.id, typ: 'password-reset' }, config.JWT_SECRET, { expiresIn: '1h' });
  // Integrate an email provider; for now, return token for manual testing
  return res.json({ token });
});

authRouter.post('/password/reset', async (req, res) => {
  const parsed = z.object({ token: z.string().min(10), password: z.string().min(8).max(100) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const payload = jwt.verify(parsed.data.token, config.JWT_SECRET) as any;
    if (payload.typ !== 'password-reset') {
      return res.status(400).json({ error: 'Invalid token' });
    }
    const passwordHash = await argon2.hash(parsed.data.password, { type: argon2.argon2id });
    await prisma.user.update({
      where: { id: payload.sub },
      data: {
        passwordHash,
        // bump tokenVersion to revoke all existing tokens post reset
        tokenVersion: { increment: 1 },
      },
    });
    return res.json({ success: true });
  } catch {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
});


