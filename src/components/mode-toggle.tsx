'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';

export function ModeToggle() {
	const { setTheme, theme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = React.useState(false);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<Button variant="ghost" size="icon" className="h-9 w-9">
				<div className="h-4 w-4 loading-shimmer rounded" />
			</Button>
		);
	}

	// Use resolvedTheme to get the actual theme (handles system theme)
	const currentTheme = resolvedTheme || theme;
	const isDark = currentTheme === 'dark';

	const toggleTheme = () => {
		setTheme(isDark ? 'light' : 'dark');
	};

	return (
		<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
			<Button
				variant="ghost"
				size="icon"
				onClick={toggleTheme}
				className="h-9 w-9 relative overflow-hidden focus-ring hover-lift btn-touch"
				aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
			>
				<AnimatePresence mode="wait">
					<motion.div
						key={currentTheme}
						initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
						animate={{ opacity: 1, scale: 1, rotate: 0 }}
						exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
						transition={{
							duration: 0.2,
							type: 'spring',
							stiffness: 200,
							damping: 20,
						}}
						className="absolute inset-0 flex items-center justify-center"
					>
						{isDark ? (
							<Sun className="h-4 w-4 text-yellow-500" />
						) : (
							<Moon className="h-4 w-4 text-slate-600" />
						)}
					</motion.div>
				</AnimatePresence>
				<span className="sr-only">Switch to {isDark ? 'light' : 'dark'} mode</span>
			</Button>
		</motion.div>
	);
}
