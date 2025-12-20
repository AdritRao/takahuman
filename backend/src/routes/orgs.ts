import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireOrgContext, requireRole } from '../middleware/org';
import { z } from 'zod';

export const orgsRouter = Router();

orgsRouter.use(requireAuth);

orgsRouter.get('/', async (req, res) => {
  const userId = req.user!.id;
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { organization: true },
  });
  res.json({
    organizations: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      role: m.role,
    })),
  });
});

orgsRouter.post('/', async (req, res) => {
  const userId = req.user!.id;
  const parsed = z.object({ name: z.string().min(1).max(120) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const org = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      members: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
    },
  });
  res.status(201).json({ organization: { id: org.id, name: org.name } });
});

// Minimal invite endpoints (token delivery to be integrated with a mailer)
const inviteSchema = z.object({ email: z.string().email(), role: z.enum(['ADMIN', 'MEMBER']) });

orgsRouter.post('/:orgId/invites', requireOrgContext, requireRole(['OWNER', 'ADMIN']), async (req, res) => {
  const orgId = Number(req.params.orgId);
  if (Number.isNaN(orgId)) return res.status(400).json({ error: 'Invalid org id' });
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const token = cryptoToken();
  const invite = await prisma.invite.create({
    data: {
      organizationId: orgId,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  // Integrate with an email service here
  res.status(201).json({ inviteId: invite.id, token });
});

orgsRouter.post('/invites/accept', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const parsed = z.object({ token: z.string().min(10) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const invite = await prisma.invite.findUnique({ where: { token: parsed.data.token } });
  if (!invite || invite.expiresAt < new Date() || invite.acceptedAt) {
    return res.status(400).json({ error: 'Invalid or expired invite' });
  }
  await prisma.$transaction([
    prisma.membership.upsert({
      where: { userId_organizationId: { userId, organizationId: invite.organizationId } },
      update: { role: invite.role },
      create: { userId, organizationId: invite.organizationId, role: invite.role },
    }),
    prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);
  res.json({ success: true });
});

function cryptoToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url');
}


