'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';

interface LogoProps {
	variant?: 'ace' | 'jetnet';
	size?: 'sm' | 'md' | 'lg' | 'xl';
	className?: string;
}

export function Logo({ variant = 'ace', size = 'md', className = '' }: LogoProps) {
	const { theme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// Prevent hydration mismatch by only rendering after mount
	useEffect(() => {
		setMounted(true);
	}, []);

	const getLogoSrc = () => {
		if (variant === 'ace') {
			// Use resolvedTheme to get the actual theme (handles system theme)
			const currentTheme = resolvedTheme || theme;
			if (currentTheme === 'dark') {
				// Dark mode: use white text logo
				return 'https://storage.googleapis.com/msgsndr/ZZ8ChnzXVXaGdaZI36x8/media/687fd9c4bf696970a616730c.png';
			} else {
				// Light mode: use white background logo
				return 'https://storage.googleapis.com/msgsndr/ZZ8ChnzXVXaGdaZI36x8/media/6875c6ef71531b9e6c741ecd.jpeg';
			}
		} else {
			// JetNet logo (always white background)
			return 'https://storage.googleapis.com/msgsndr/ZZ8ChnzXVXaGdaZI36x8/media/68cc5a6ab8000370432a406a.jpeg';
		}
	};

	const getSizeClasses = () => {
		switch (size) {
			case 'sm':
				return 'h-6 w-20';
			case 'md':
				return 'h-8 w-24';
			case 'lg':
				return 'h-10 w-32';
			case 'xl':
				return 'h-12 w-40';
			default:
				return 'h-8 w-24';
		}
	};

	// Show a placeholder during hydration to prevent mismatch
	if (!mounted) {
		return (
			<div
				className={`relative ${getSizeClasses()} ${className} bg-muted/20 rounded animate-pulse`}
			>
				{/* Placeholder for logo */}
			</div>
		);
	}

	return (
		<div className={`relative ${getSizeClasses()} ${className}`}>
			<Image
				src={getLogoSrc()}
				alt={variant === 'ace' ? 'ACE Aircraft Sales' : 'JetNet'}
				fill
				className="object-contain"
				priority
			/>
		</div>
	);
}

export function ACELogo(props: Omit<LogoProps, 'variant'>) {
	return <Logo variant="ace" {...props} />;
}

export function JetNetLogo(props: Omit<LogoProps, 'variant'>) {
	return <Logo variant="jetnet" {...props} />;
}
