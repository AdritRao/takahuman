"use client";

import { useRouter } from 'next/navigation';
import { clearToken } from '@/lib/auth';

export default function Header() {
	const router = useRouter();
	return (
		<header className="border-b border-neutral-800">
			<div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="text-sm uppercase tracking-widest text-neutral-400">Notes</span>
				</div>
				<button
					className="text-sm text-neutral-300 hover:text-white"
					onClick={() => {
						clearToken();
						router.replace('/login');
					}}
				>
					Logout
				</button>
			</div>
		</header>
	);
}


