import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { createNoteSchema, updateNoteSchema } from '../validation/schemas';

export const notesRouter = Router();

notesRouter.use(requireAuth);

notesRouter.get('/', async (req, res) => {
	const userId = req.user!.id;
	const notes = await prisma.note.findMany({
		where: { userId },
		orderBy: { updatedAt: 'desc' }
	});
	return res.json({ notes });
});

notesRouter.post('/', async (req, res) => {
	const userId = req.user!.id;
	const parsed = createNoteSchema.safeParse(req.body);
	if (!parsed.success) {
		return res.status(400).json({ error: parsed.error.flatten() });
	}
	const note = await prisma.note.create({
		data: { ...parsed.data, userId }
	});
	return res.status(201).json({ note });
});

notesRouter.put('/:id', async (req, res) => {
	const userId = req.user!.id;
	const id = Number(req.params.id);
	if (Number.isNaN(id)) {
		return res.status(400).json({ error: 'Invalid note id' });
	}
	const parsed = updateNoteSchema.safeParse(req.body);
	if (!parsed.success) {
		return res.status(400).json({ error: parsed.error.flatten() });
	}
	const existing = await prisma.note.findFirst({ where: { id, userId } });
	if (!existing) {
		return res.status(404).json({ error: 'Not found' });
	}
	const note = await prisma.note.update({
		where: { id },
		data: parsed.data
	});
	return res.json({ note });
});

notesRouter.delete('/:id', async (req, res) => {
	const userId = req.user!.id;
	const id = Number(req.params.id);
	if (Number.isNaN(id)) {
		return res.status(400).json({ error: 'Invalid note id' });
	}
	const existing = await prisma.note.findFirst({ where: { id, userId } });
	if (!existing) {
		return res.status(404).json({ error: 'Not found' });
	}
	await prisma.note.delete({ where: { id } });
	return res.json({ success: true });
});


