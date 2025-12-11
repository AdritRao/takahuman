import { z } from 'zod';

export const signupSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(100)
});

export const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(100)
});

export const createNoteSchema = z.object({
	title: z.string().min(1).max(200),
	content: z.string().max(5000)
});

export const updateNoteSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	content: z.string().max(5000).optional()
}).refine((data) => typeof data.title !== 'undefined' || typeof data.content !== 'undefined', {
	message: 'At least one of title or content must be provided'
});


