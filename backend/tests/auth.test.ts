import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Auth', () => {
	afterAll(async () => {
		await prisma.note.deleteMany();
		await prisma.user.deleteMany();
		await prisma.$disconnect();
	});

	it('signs up a new user and returns token', async () => {
		const res = await request(app)
			.post('/auth/signup')
			.send({ email: 'test@example.com', password: 'password123' });
		expect(res.status).toBe(201);
		expect(res.body.token).toBeDefined();
		expect(res.body.user).toMatchObject({ email: 'test@example.com' });
	});

	it('logs in an existing user and returns token', async () => {
		const res = await request(app)
			.post('/auth/login')
			.send({ email: 'test@example.com', password: 'password123' });
		expect(res.status).toBe(200);
		expect(res.body.token).toBeDefined();
		expect(res.body.user).toMatchObject({ email: 'test@example.com' });
	});
});


