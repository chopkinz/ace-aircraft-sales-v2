'use client';

import React from 'react';
import { HelpCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
	content: string;
	className?: string;
	icon?: 'help' | 'info';
	side?: 'top' | 'bottom' | 'left' | 'right';
	align?: 'start' | 'center' | 'end';
	asButton?: boolean;
}

export function HelpTooltip({
	content,
	className = '',
	icon = 'help',
	side = 'top',
	align = 'center',
	asButton = true,
}: HelpTooltipProps) {
	const IconComponent = icon === 'info' ? Info : HelpCircle;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					{asButton ? (
						<button
							type="button"
							className={cn(
								'inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
								className
							)}
							aria-label="Help information"
						>
							<IconComponent className="w-3 h-3" />
						</button>
					) : (
						<div
							className={cn(
								'inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-help',
								className
							)}
							aria-label="Help information"
						>
							<IconComponent className="w-3 h-3" />
						</div>
					)}
				</TooltipTrigger>
				<TooltipContent side={side} align={align} className="max-w-xs p-3 text-sm leading-relaxed">
					{content}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
