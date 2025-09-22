'use client';

import { motion } from 'framer-motion';
import { Plane, Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	variant?: 'spinner' | 'plane' | 'dots';
	text?: string;
	className?: string;
}

export function LoadingSpinner({
	size = 'md',
	variant = 'spinner',
	text,
	className = '',
}: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: 'h-4 w-4',
		md: 'h-6 w-6',
		lg: 'h-8 w-8',
	};

	const textSizeClasses = {
		sm: 'text-sm',
		md: 'text-base',
		lg: 'text-lg',
	};

	if (variant === 'plane') {
		return (
			<div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
				<motion.div
					animate={{
						rotate: 360,
						y: [0, -10, 0],
					}}
					transition={{
						rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
						y: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
					}}
					className={sizeClasses[size]}
				>
					<Plane className="h-full w-full text-primary" />
				</motion.div>
				{text && (
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className={`text-muted-foreground ${textSizeClasses[size]}`}
					>
						{text}
					</motion.p>
				)}
			</div>
		);
	}

	if (variant === 'dots') {
		return (
			<div className={`flex items-center justify-center gap-1 ${className}`}>
				{[0, 1, 2].map(i => (
					<motion.div
						key={i}
						animate={{
							scale: [1, 1.2, 1],
							opacity: [0.5, 1, 0.5],
						}}
						transition={{
							duration: 1,
							repeat: Infinity,
							delay: i * 0.2,
						}}
						className="h-2 w-2 rounded-full bg-primary"
					/>
				))}
				{text && (
					<motion.span
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className={`ml-2 text-muted-foreground ${textSizeClasses[size]}`}
					>
						{text}
					</motion.span>
				)}
			</div>
		);
	}

	return (
		<div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
			<motion.div
				animate={{ rotate: 360 }}
				transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
				className={sizeClasses[size]}
			>
				<Loader2 className="h-full w-full text-primary" />
			</motion.div>
			{text && (
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className={`text-muted-foreground ${textSizeClasses[size]}`}
				>
					{text}
				</motion.p>
			)}
		</div>
	);
}

interface PageLoaderProps {
	message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
		>
			<motion.div
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				className="flex flex-col items-center gap-4 rounded-lg bg-card p-8 shadow-xl"
			>
				<LoadingSpinner variant="plane" size="lg" />
				<motion.p
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="text-lg font-medium text-foreground"
				>
					{message}
				</motion.p>
			</motion.div>
		</motion.div>
	);
}
