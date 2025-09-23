'use client';

import React from 'react';
import { HelpCircle, Info, Lightbulb, BookOpen, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
	content: string;
	className?: string;
	icon?: 'help' | 'info' | 'lightbulb' | 'book' | 'alert';
	side?: 'top' | 'bottom' | 'left' | 'right';
	align?: 'start' | 'center' | 'end';
	asButton?: boolean;
	size?: 'sm' | 'md' | 'lg';
}

export function HelpTooltip({
	content,
	className = '',
	icon = 'help',
	side = 'top',
	align = 'center',
	asButton = true,
	size = 'sm',
}: HelpTooltipProps) {
	const getIconComponent = () => {
		switch (icon) {
			case 'info':
				return Info;
			case 'lightbulb':
				return Lightbulb;
			case 'book':
				return BookOpen;
			case 'alert':
				return AlertCircle;
			default:
				return HelpCircle;
		}
	};

	const IconComponent = getIconComponent();

	const sizeClasses = {
		sm: 'w-4 h-4',
		md: 'w-5 h-5',
		lg: 'w-6 h-6',
	};

	const iconSizeClasses = {
		sm: 'w-3 h-3',
		md: 'w-4 h-4',
		lg: 'w-5 h-5',
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					{asButton ? (
						<button
							type="button"
							className={cn(
								'inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 hover:bg-primary/10 hover:scale-110',
								sizeClasses[size],
								className
							)}
							aria-label="Help information"
						>
							<IconComponent
								className={cn(iconSizeClasses[size], 'transition-transform duration-200')}
							/>
						</button>
					) : (
						<div
							className={cn(
								'inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-primary transition-all duration-200 cursor-help hover:bg-primary/10 hover:scale-110',
								sizeClasses[size],
								className
							)}
							aria-label="Help information"
						>
							<IconComponent
								className={cn(iconSizeClasses[size], 'transition-transform duration-200')}
							/>
						</div>
					)}
				</TooltipTrigger>
				<TooltipContent
					side={side}
					align={align}
					className="max-w-sm p-4 text-sm leading-relaxed bg-card border border-border/50 shadow-xl backdrop-blur-sm"
				>
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-primary font-semibold">
							<IconComponent className="w-4 h-4" />
							<span>Help & Information</span>
						</div>
						<div className="text-foreground">{content}</div>
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
