"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/apiClient';

type Mode = 'login' | 'signup';

export default function AuthForm({ mode }: { mode: Mode }) {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const url = mode === 'login' ? '/auth/login' : '/auth/signup';
			const res = await api.post(url, { email, password });
			router.replace('/notes');
		} catch (err: any) {
			setError(err?.response?.data?.error ?? 'Something went wrong');
		} finally {
			setLoading(false);
		}
	}

	return (
		<form onSubmit={onSubmit} className="card max-w-sm mx-auto mt-16 space-y-4">
			<h1 className="text-xl font-semibold">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
			<div className="space-y-2">
				<label className="text-sm text-neutral-400">Email</label>
				<input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
			</div>
			<div className="space-y-2">
				<label className="text-sm text-neutral-400">Password</label>
				<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={8} required />
			</div>
			{error && <p className="text-red-400 text-sm">{error}</p>}
			<button className="btn w-full" disabled={loading}>{loading ? 'Please wait…' : (mode === 'login' ? 'Log in' : 'Sign up')}</button>
		</form>
	);
}


