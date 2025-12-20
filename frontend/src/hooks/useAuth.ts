"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/apiClient';

export function useAuthRequired() {
	const router = useRouter();
	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				await api.get('/auth/me');
			} catch {
				if (mounted) router.replace('/login');
			}
		})();
		return () => {
			mounted = false;
		};
	}, [router]);
}


