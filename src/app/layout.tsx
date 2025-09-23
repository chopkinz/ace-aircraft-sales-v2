import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { MuiThemeProviderWrapper } from '@/components/providers/mui-theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Navigation } from '@/components/navigation';
import { Toaster } from 'react-hot-toast';

const inter = Inter({
	subsets: ['latin'],
	display: 'swap',
	preload: true,
	variable: '--font-inter',
});

export const metadata: Metadata = {
	title: 'ACE Aircraft Intelligence System',
	description: 'Real-time aviation market intelligence platform powered by JetNet API',
	keywords: ['aircraft', 'aviation', 'intelligence', 'market', 'jetnet', 'sales'],
	authors: [{ name: 'ACE Aircraft Sales' }],
	robots: 'index, follow',
	openGraph: {
		title: 'ACE Aircraft Intelligence System',
		description: 'Real-time aviation market intelligence platform',
		type: 'website',
		locale: 'en_US',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'ACE Aircraft Intelligence System',
		description: 'Real-time aviation market intelligence platform',
	},
};

export const viewport = {
	width: 'device-width',
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={inter.variable} suppressHydrationWarning>
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
			</head>
			<body className={`${inter.className} antialiased bg-background text-foreground`}>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<MuiThemeProviderWrapper>
						<QueryProvider>
							<div className="min-h-screen flex flex-col">
								<Navigation />
								<main className="flex-1 pt-16">{children}</main>
							</div>
							<Toaster
								position="top-right"
								toastOptions={{
									duration: 4000,
									style: {
										background: 'hsl(var(--background))',
										color: 'hsl(var(--foreground))',
										border: '1px solid hsl(var(--border))',
										boxShadow:
											'0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
									},
								}}
							/>
						</QueryProvider>
					</MuiThemeProviderWrapper>
				</ThemeProvider>
			</body>
		</html>
	);
}
