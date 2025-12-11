"use client";

import Link from 'next/link';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
	return (
		<main>
			<div className="mx-auto max-w-3xl px-4">
				<div className="flex items-center justify-between py-6">
					<div className="flex items-center gap-2">
						<span className="text-sm uppercase tracking-widest text-neutral-400">Notes</span>
					</div>
					<Link href="/signup" className="text-sm text-neutral-300 hover:text-white">Create account</Link>
				</div>
				<AuthForm mode="login" />
			</div>
		</main>
	);
}


