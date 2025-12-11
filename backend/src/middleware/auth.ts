import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtUser {
	id: number;
	email: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const header = req.headers['authorization'];
		if (!header || !header.startsWith('Bearer ')) {
			return res.status(401).json({ error: 'Unauthorized' });
		}
		const token = header.substring('Bearer '.length);
		const secret = process.env.JWT_SECRET;
		if (!secret) {
			return res.status(500).json({ error: 'Server misconfiguration' });
		}
		const payload = jwt.verify(token, secret) as JwtUser;
		req.user = payload;
		next();
	} catch (_e) {
		return res.status(401).json({ error: 'Unauthorized' });
	}
}


