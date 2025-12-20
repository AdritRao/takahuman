import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { requireAuth } from '../middleware/auth';
import { createNoteSchema, updateNoteSchema } from '../validation/schemas';
import { requireOrgContext, requireRole } from '../middleware/org';

export const notesRouter = Router();

notesRouter.use(requireAuth, requireOrgContext, requireRole(['OWNER', 'ADMIN', 'MEMBER']));

notesRouter.get('/', async (req, res) => {
  const orgId = req.membership!.organizationId;
  const cacheKey = `notes:list:${orgId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json({ notes: JSON.parse(cached) });
  }
  const notes = await prisma.note.findMany({
    where: { organizationId: orgId },
    orderBy: { updatedAt: 'desc' }
  });
  await redis.set(cacheKey, JSON.stringify(notes), 'EX', 30);
  return res.json({ notes });
});

notesRouter.post('/', async (req, res) => {
  const userId = req.user!.id;
  const orgId = req.membership!.organizationId;
  const parsed = createNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const note = await prisma.note.create({
    data: { ...parsed.data, userId, createdByUserId: userId, organizationId: orgId }
  });
  await redis.del(`notes:list:${orgId}`);
  return res.status(201).json({ note });
});

notesRouter.put('/:id', async (req, res) => {
  const orgId = req.membership!.organizationId;
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid note id' });
  }
  const parsed = updateNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const existing = await prisma.note.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) {
    return res.status(404).json({ error: 'Not found' });
  }
  const note = await prisma.note.update({
    where: { id },
    data: parsed.data
  });
  await redis.del(`notes:list:${orgId}`);
  return res.json({ note });
});

notesRouter.delete('/:id', async (req, res) => {
  const orgId = req.membership!.organizationId;
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid note id' });
  }
  const existing = await prisma.note.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) {
    return res.status(404).json({ error: 'Not found' });
  }
  await prisma.note.delete({ where: { id } });
  await redis.del(`notes:list:${orgId}`);
  return res.json({ success: true });
});


