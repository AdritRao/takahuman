import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { loginSchema, signupSchema } from '../validation/schemas';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
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
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await prisma.user.create({
			data: { email, passwordHash },
			select: { id: true, email: true }
		});
		const token = createToken(user.id, user.email);
		return res.status(201).json({ token, user });
	} catch (e: any) {
		return res.status(500).json({ error: 'Failed to signup' });
	}
});

authRouter.post('/login', async (req, res) => {
	try {
		const parsed = loginSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ error: parsed.error.flatten() });
		}
		const { email, password } = parsed.data;
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}
		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}
		const token = createToken(user.id, user.email);
		return res.json({ token, user: { id: user.id, email: user.email } });
	} catch (_e) {
		return res.status(500).json({ error: 'Failed to login' });
	}
});

function createToken(id: number, email: string) {
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error('JWT_SECRET not set');
	}
	return jwt.sign({ id, email }, secret, { algorithm: 'HS256', expiresIn: '7d' });
}


