import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

async function signupAndGetToken() {
	const res = await request(app)
		.post('/auth/signup')
		.send({ email: 'user2@example.com', password: 'password123' });
	return res.body.token as string;
}

describe('Notes', () => {
	let token: string;

	beforeAll(async () => {
		token = await signupAndGetToken();
	});

	afterAll(async () => {
		await prisma.note.deleteMany();
		await prisma.user.deleteMany();
		await prisma.$disconnect();
	});

	it('creates, lists, updates, and deletes a note', async () => {
		const createRes = await request(app)
			.post('/notes')
			.set('Authorization', `Bearer ${token}`)
			.send({ title: 'First', content: 'Hello' });
		expect(createRes.status).toBe(201);
		const noteId = createRes.body.note.id as number;

		const listRes = await request(app)
			.get('/notes')
			.set('Authorization', `Bearer ${token}`);
		expect(listRes.status).toBe(200);
		expect(Array.isArray(listRes.body.notes)).toBe(true);
		expect(listRes.body.notes.length).toBeGreaterThanOrEqual(1);

		const updateRes = await request(app)
			.put(`/notes/${noteId}`)
			.set('Authorization', `Bearer ${token}`)
			.send({ content: 'Updated' });
		expect(updateRes.status).toBe(200);
		expect(updateRes.body.note.content).toBe('Updated');

		const deleteRes = await request(app)
			.delete(`/notes/${noteId}`)
			.set('Authorization', `Bearer ${token}`);
		expect(deleteRes.status).toBe(200);
		expect(deleteRes.body.success).toBe(true);
	});
});


