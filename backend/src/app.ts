import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { authRouter } from './routes/auth';
import { orgsRouter } from './routes/orgs';
import { notesRouter } from './routes/notes';
import { errorHandler } from './middleware/error';
import { config } from './config';
import { csrfProtect, csrfSetToken } from './middleware/csrf';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';

dotenv.config();

export const app = express();

if (config.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(
  pinoHttp({
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  })
);
app.use(express.json());

app.get('/healthz', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});
app.get('/auth/csrf', csrfSetToken);

// Mount auth routes before CSRF so login/signup/refresh aren't blocked by CSRF
app.use('/auth', authRouter);
// Apply CSRF for state-changing non-auth routes
app.use(csrfProtect);
app.use('/orgs', orgsRouter);
app.use('/notes', notesRouter);

app.use(errorHandler);


