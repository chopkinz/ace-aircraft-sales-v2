'use client';

import React, { useState, useEffect } from 'react';
import {
	AppBar,
	Toolbar,
	Button,
	IconButton,
	Box,
	Drawer,
	List,
	ListItem,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Container,
	Chip,
} from '@mui/material';
import {
	Menu as MenuIcon,
	Flight as FlightIcon,
	Analytics as AnalyticsIcon,
	Description as DescriptionIcon,
	Timeline as ActivityIcon,
	Brightness4 as DarkModeIcon,
	Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { useMuiTheme } from '@/components/providers/mui-theme-provider';
import { ACELogo } from '@/components/ui/logo';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
	const [mobileOpen, setMobileOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const [mounted, setMounted] = useState(false);
	const pathname = usePathname();
	const { isDark, toggleTheme } = useMuiTheme();
	const [themeMounted, setThemeMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		setThemeMounted(true);
		const handleScroll = () => {
			setScrolled(window.scrollY > 20);
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const navItems = [
		{
			name: 'Aircraft',
			href: '/aircraft',
			icon: FlightIcon,
			description: 'Browse aircraft listings',
			badge: 'Live',
		},
		{
			name: 'Analytics',
			href: '/analytics',
			icon: AnalyticsIcon,
			description: 'Market analytics and insights',
		},
		{
			name: 'Reports',
			href: '/reports',
			icon: DescriptionIcon,
			description: 'Generate market reports',
		},
	];

	const handleDrawerToggle = () => {
		setMobileOpen(!mobileOpen);
	};

	if (!mounted || !themeMounted) {
		return null;
	}

	const drawer = (
		<Box sx={{ width: 280 }}>
			<Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
					<Box
						sx={{
							p: 1,
							color: 'primary.contrastText',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<ACELogo size="sm" />
					</Box>
					{/* <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
						ACE Aircraft
					</Typography> */}
				</Box>
			</Box>
			<List sx={{ px: 2, py: 1 }}>
				{navItems.map(item => {
					const IconComponent = item.icon;
					const isActive = pathname === item.href;

					return (
						<ListItem key={item.name} disablePadding sx={{ mb: 0.5 }}>
							<Link href={item.href} style={{ textDecoration: 'none', width: '100%' }}>
								<ListItemButton
									onClick={() => setMobileOpen(false)}
									sx={{
										borderRadius: 2,
										bgcolor: isActive ? 'primary.main' : 'transparent',
										color: isActive ? 'primary.contrastText' : 'text.primary',
										'&:hover': {
											bgcolor: isActive ? 'primary.dark' : 'action.hover',
										},
										transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
									}}
								>
									<ListItemIcon
										sx={{
											color: isActive ? 'primary.contrastText' : 'text.secondary',
											minWidth: 40,
										}}
									>
										<IconComponent />
									</ListItemIcon>
									<ListItemText
										primary={item.name}
										secondary={item.description}
										primaryTypographyProps={{
											fontWeight: isActive ? 600 : 500,
											fontSize: '0.95rem',
										}}
										secondaryTypographyProps={{
											fontSize: '0.8rem',
											color: isActive ? 'primary.contrastText' : 'text.secondary',
										}}
									/>
									{item.badge && (
										<Chip
											label={item.badge}
											size="small"
											color="success"
											sx={{
												ml: 1,
												fontSize: '0.7rem',
												height: 20,
												bgcolor: isActive ? 'rgba(255,255,255,0.2)' : 'success.main',
												color: isActive ? 'primary.contrastText' : 'success.contrastText',
											}}
										/>
									)}
								</ListItemButton>
							</Link>
						</ListItem>
					);
				})}
			</List>
		</Box>
	);

	return (
		<>
			<AppBar
				position="fixed"
				elevation={scrolled ? 1 : 0}
				sx={{
					transition: 'all 0.3s ease-in-out',
					bgcolor: scrolled ? 'background.paper' : 'transparent',
					backdropFilter: scrolled ? 'blur(20px)' : 'none',
					borderBottom: scrolled ? 1 : 0,
					borderColor: 'divider',
				}}
			>
				<Container maxWidth="xl">
					<Toolbar sx={{ px: { xs: 1, sm: 2 }, minHeight: 64 }}>
						{/* Logo Section */}
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: { xs: 1, md: 0 } }}>
							<Box
								sx={{
									p: 1.5,
									borderRadius: 1,
									color: 'primary.contrastText',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<ACELogo size="sm" />
							</Box>
						</Box>

						{/* Desktop Navigation */}
						<Box
							sx={{
								display: { xs: 'none', md: 'flex' },
								alignItems: 'center',
								gap: 1,
								flexGrow: 1,
								justifyContent: 'center',
							}}
						>
							{navItems.map(item => {
								const IconComponent = item.icon;
								const isActive = pathname === item.href;

								return (
									<Link key={item.name} href={item.href} style={{ textDecoration: 'none' }}>
										<Button
											startIcon={<IconComponent />}
											sx={{
												bgcolor: isActive ? 'primary.main' : 'transparent',
												color: isActive ? 'primary.contrastText' : 'text.secondary',
												borderRadius: 1,
												px: 2,
												py: 1,
												fontWeight: isActive ? 600 : 500,
												'&:hover': {
													bgcolor: isActive ? 'primary.dark' : 'action.hover',
													transform: 'translateY(-1px)',
												},
												transition: 'all 0.2s ease-in-out',
												position: 'relative',
											}}
										>
											{item.name}
											{item.badge && (
												<Chip
													label={item.badge}
													size="small"
													color="success"
													sx={{
														ml: 1,
														fontSize: '0.7rem',
														height: 20,
														bgcolor: isActive ? 'rgba(255,255,255,0.2)' : 'success.main',
														color: isActive ? 'primary.contrastText' : 'success.contrastText',
													}}
												/>
											)}
										</Button>
									</Link>
								);
							})}
						</Box>

						{/* Right side actions */}
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<IconButton
								onClick={toggleTheme}
								sx={{
									color: 'text.secondary',
									borderRadius: 1,
									'&:hover': {
										bgcolor: 'action.hover',
										color: 'primary.main',
									},
								}}
							>
								{isDark ? <LightModeIcon /> : <DarkModeIcon />}
							</IconButton>

							{/* Mobile menu button */}
							<IconButton
								color="inherit"
								aria-label="open drawer"
								edge="start"
								onClick={handleDrawerToggle}
								sx={{
									display: { md: 'none' },
									color: 'text.secondary',
									borderRadius: 1,
									'&:hover': {
										bgcolor: 'action.hover',
										color: 'primary.main',
									},
								}}
							>
								<MenuIcon />
							</IconButton>
						</Box>
					</Toolbar>
				</Container>
			</AppBar>

			{/* Mobile Drawer */}
			<Drawer
				variant="temporary"
				open={mobileOpen}
				onClose={handleDrawerToggle}
				ModalProps={{
					keepMounted: true, // Better open performance on mobile.
				}}
				sx={{
					display: { xs: 'block', md: 'none' },
					'& .MuiDrawer-paper': {
						boxSizing: 'border-box',
						width: 280,
						bgcolor: 'background.paper',
						borderRight: 1,
						borderColor: 'divider',
					},
				}}
			>
				{drawer}
			</Drawer>
		</>
	);
}
