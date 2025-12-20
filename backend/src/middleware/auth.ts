import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../lib/jwt';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token =
      req.cookies?.[config.ACCESS_COOKIE_NAME] ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice('Bearer '.length)
        : undefined);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, tokenVersion: true },
    });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { id: user.id, email: user.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}


