'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TabsContextType {
	activeTab: string;
	setActiveTab: (tab: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

const useTabs = () => {
	const context = React.useContext(TabsContext);
	if (!context) {
		throw new Error('useTabs must be used within a Tabs component');
	}
	return context;
};

interface TabsProps {
	defaultValue: string;
	children: React.ReactNode;
	className?: string;
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
	const [activeTab, setActiveTab] = React.useState(defaultValue);

	return (
		<TabsContext.Provider value={{ activeTab, setActiveTab }}>
			<div className={cn('w-full', className)}>{children}</div>
		</TabsContext.Provider>
	);
}

interface TabsListProps {
	children: React.ReactNode;
	className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
	return (
		<div
			className={cn(
				'inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
				className
			)}
		>
			{children}
		</div>
	);
}

interface TabsTriggerProps {
	value: string;
	children: React.ReactNode;
	className?: string;
	disabled?: boolean;
}

export function TabsTrigger({ value, children, className, disabled }: TabsTriggerProps) {
	const { activeTab, setActiveTab } = useTabs();
	const isActive = activeTab === value;

	return (
		<motion.button
			className={cn(
				'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
				isActive && 'text-foreground shadow-sm',
				className
			)}
			onClick={() => !disabled && setActiveTab(value)}
			disabled={disabled}
			whileHover={{ scale: disabled ? 1 : 1.02 }}
			whileTap={{ scale: disabled ? 1 : 0.98 }}
		>
			{isActive && (
				<motion.div
					layoutId="activeTab"
					className="absolute inset-0 rounded-md bg-background shadow-sm"
					initial={false}
					transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
				/>
			)}
			<span className="relative z-10">{children}</span>
		</motion.button>
	);
}

interface TabsContentProps {
	value: string;
	children: React.ReactNode;
	className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
	const { activeTab } = useTabs();
	const isActive = activeTab === value;

	return (
		<AnimatePresence mode="wait">
			{isActive && (
				<motion.div
					key={value}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.2, ease: 'easeOut' }}
					className={cn('mt-6', className)}
				>
					{children}
				</motion.div>
			)}
		</AnimatePresence>
	);
}
