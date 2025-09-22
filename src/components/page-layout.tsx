'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageLayoutProps {
	title: string;
	description: string;
	children: ReactNode;
	className?: string;
}

export function PageLayout({ title, description, children, className = '' }: PageLayoutProps) {
	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pt-24">
			<div className="container-responsive py-8 space-responsive">
				{/* Page Header */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="text-center space-y-4 mb-8"
				>
					<h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
						{title}
					</h1>
					<p className="text-lg sm:text-xl text-muted-foreground text-responsive max-w-3xl mx-auto">
						{description}
					</p>
				</motion.div>

				{/* Page Content */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className={className}
				>
					{children}
				</motion.div>
			</div>
		</div>
	);
}
