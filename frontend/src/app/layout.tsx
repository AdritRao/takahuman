import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Notes',
	description: 'Minimal notes, maximum focus'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="dark">
			<body>
				<div className="min-h-screen">
					{children}
				</div>
			</body>
		</html>
	);
}


