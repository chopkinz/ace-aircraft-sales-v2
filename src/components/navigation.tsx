'use client';

import {
	Plane,
	Menu,
	X,
	Bell,
	User,
	Settings,
	BarChart3,
	TrendingUp,
	FileText,
	Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from './mode-toggle';
import { ACELogo } from '@/components/ui/logo';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
	const [isOpen, setIsOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const pathname = usePathname();

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 10);
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const navItems = [
		{ name: 'Dashboard', href: '/', icon: 'BarChart3', description: 'Overview and stats' },
		{ name: 'Aircraft', href: '/aircraft', icon: 'Plane', description: 'Browse aircraft listings' },
		{
			name: 'Market Analysis',
			href: '/market',
			icon: 'TrendingUp',
			description: 'Market trends and insights',
		},
		{ name: 'Reports', href: '/reports', icon: 'FileText', description: 'Generate reports' },
		{ name: 'Activity', href: '/activity', icon: 'Activity', description: 'System activity logs' },
	];

	return (
		<motion.nav
			initial={{ y: -100 }}
			animate={{ y: 0 }}
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
				scrolled
					? 'glass backdrop-blur-lg border-b border-border/50 shadow-lg'
					: 'bg-background/95 backdrop-blur-lg border-b border-border/20'
			}`}
		>
			<div className="container-responsive">
				<div className="flex justify-between items-center h-16 lg:h-18">
					{/* Logo */}
					<motion.div
						className="flex items-center space-x-3"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<div className="relative">
							<ACELogo />
							<motion.div
								className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
								animate={{ scale: [1, 1.2, 1] }}
								transition={{ duration: 2, repeat: Infinity }}
							/>
						</div>
						<div className="hidden sm:block">
							<h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
								Aircraft Sales
							</h1>
						</div>
					</motion.div>

					{/* Enhanced Desktop Navigation */}
					<div className="hidden lg:flex items-center space-x-1">
						{navItems.map((item, index) => {
							const getIcon = (iconName: string) => {
								switch (iconName) {
									case 'BarChart3':
										return BarChart3;
									case 'Plane':
										return Plane;
									case 'TrendingUp':
										return TrendingUp;
									case 'FileText':
										return FileText;
									case 'Activity':
										return Activity;
									default:
										return FileText;
								}
							};
							const IconComponent = getIcon(item.icon);

							const isActive = pathname === item.href;

							return (
								<Link key={item.name} href={item.href}>
									<motion.div
										className={`group relative px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg focus-ring flex items-center gap-2 ${
											isActive
												? 'text-primary bg-primary/10'
												: 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
										}`}
										whileHover={{ y: -2, scale: 1.05 }}
										whileTap={{ y: 0, scale: 0.95 }}
										initial={{ opacity: 0, y: -20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: index * 0.1 }}
									>
										<IconComponent className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
										<span className="hidden xl:inline">{item.name}</span>

										{/* Hover indicator */}
										<div className="absolute inset-0 rounded-lg bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
									</motion.div>
								</Link>
							);
						})}
					</div>

					{/* Medium screen navigation */}
					<div className="hidden md:flex lg:hidden items-center space-x-1">
						{navItems.slice(0, 3).map((item, index) => {
							const getIcon = (iconName: string) => {
								switch (iconName) {
									case 'BarChart3':
										return BarChart3;
									case 'Plane':
										return Plane;
									case 'TrendingUp':
										return TrendingUp;
									default:
										return FileText;
								}
							};
							const IconComponent = getIcon(item.icon);

							const isActive = pathname === item.href;

							return (
								<Link key={item.name} href={item.href}>
									<motion.div
										className={`group relative px-3 py-2 text-sm font-medium transition-all duration-200 rounded-lg focus-ring ${
											isActive
												? 'text-primary bg-primary/10'
												: 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
										}`}
										whileHover={{ y: -1, scale: 1.05 }}
										whileTap={{ y: 0, scale: 0.95 }}
										initial={{ opacity: 0, y: -20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: index * 0.1 }}
									>
										<IconComponent className="h-4 w-4" />
									</motion.div>
								</Link>
							);
						})}
					</div>

					{/* Right side actions */}
					<div className="hidden md:flex items-center space-x-2">
						<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
							<Button variant="ghost" size="icon" className="relative focus-ring">
								<Bell className="h-4 w-4" />
								<Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
									3
								</Badge>
							</Button>
						</motion.div>

						<ModeToggle />

						<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
							<Button variant="ghost" size="icon" className="focus-ring">
								<User className="h-4 w-4" />
							</Button>
						</motion.div>

						<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
							<Button variant="ghost" size="icon" className="focus-ring">
								<Settings className="h-4 w-4" />
							</Button>
						</motion.div>
					</div>

					{/* Mobile menu button */}
					<div className="md:hidden flex items-center space-x-2">
						<ModeToggle />
						<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setIsOpen(!isOpen)}
								className="focus-ring"
							>
								<AnimatePresence mode="wait">
									{isOpen ? (
										<motion.div
											key="close"
											initial={{ rotate: -90, opacity: 0 }}
											animate={{ rotate: 0, opacity: 1 }}
											exit={{ rotate: 90, opacity: 0 }}
											transition={{ duration: 0.2 }}
										>
											<X className="h-5 w-5" />
										</motion.div>
									) : (
										<motion.div
											key="menu"
											initial={{ rotate: 90, opacity: 0 }}
											animate={{ rotate: 0, opacity: 1 }}
											exit={{ rotate: -90, opacity: 0 }}
											transition={{ duration: 0.2 }}
										>
											<Menu className="h-5 w-5" />
										</motion.div>
									)}
								</AnimatePresence>
							</Button>
						</motion.div>
					</div>
				</div>

				{/* Mobile Navigation */}
				<AnimatePresence>
					{isOpen && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.3, ease: 'easeInOut' }}
							className="md:hidden overflow-hidden"
						>
							<div className="px-2 pt-2 pb-3 space-y-1 border-t border-border/50">
								{navItems.map((item, index) => {
									const getIcon = (iconName: string) => {
										switch (iconName) {
											case 'BarChart3':
												return BarChart3;
											case 'Plane':
												return Plane;
											case 'TrendingUp':
												return TrendingUp;
											case 'FileText':
												return FileText;
											case 'Activity':
												return Activity;
											default:
												return FileText;
										}
									};
									const IconComponent = getIcon(item.icon);

									const isActive = pathname === item.href;

									return (
										<Link key={item.name} href={item.href} onClick={() => setIsOpen(false)}>
											<motion.div
												className={`flex items-center gap-3 px-3 py-3 text-base font-medium rounded-lg transition-all duration-200 focus-ring group ${
													isActive
														? 'text-primary bg-primary/10'
														: 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
												}`}
												initial={{ opacity: 0, x: -20 }}
												animate={{ opacity: 1, x: 0 }}
												transition={{ delay: index * 0.1 }}
											>
												<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
													<IconComponent className="h-4 w-4 text-primary" />
												</div>
												<span>{item.name}</span>
											</motion.div>
										</Link>
									);
								})}
								<div className="pt-4 border-t border-border/50">
									<div className="flex items-center justify-between px-3 py-2">
										<div className="flex items-center space-x-2">
											<Bell className="h-4 w-4 text-muted-foreground" />
											<span className="text-sm text-muted-foreground">Notifications</span>
											<Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
												3
											</Badge>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.nav>
	);
}
