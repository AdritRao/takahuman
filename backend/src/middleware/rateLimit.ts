import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';

type Options = {
  windowSec: number;
  max: number;
  key?: (req: Request) => string;
};

export function rateLimit(opts: Options) {
  const windowSec = opts.windowSec;
  const max = opts.max;
  const keyFn =
    opts.key ||
    ((req: Request) => {
      return `${req.method}:${req.originalUrl}:${req.ip}`;
    });

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const k = `rl:${keyFn(req)}`;
      const count = await redis.incr(k);
      if (count === 1) {
        await redis.expire(k, windowSec);
      }
      if (count > max) {
        return res.status(429).json({ error: 'Too many requests' });
      }
      next();
    } catch {
      next();
    }
  };
}


