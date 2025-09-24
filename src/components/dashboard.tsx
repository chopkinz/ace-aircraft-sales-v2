'use client';

import React, { useState, useEffect } from 'react';
import {
	Container,
	Card,
	CardContent,
	CardHeader,
	Typography,
	Button,
	Box,
	Chip,
	IconButton,
	Tooltip,
	LinearProgress,
	Fade,
	Grow,
	useTheme,
	Avatar,
} from '@mui/material';
import {
	Refresh as RefreshIcon,
	Flight as FlightIcon,
	AttachMoney as DollarIcon,
	TrendingUp as TrendingUpIcon,
	Storage as DatabaseIcon,
	Description as FileTextIcon,
	Timeline as ActivityIcon,
	ArrowUpward as ArrowUpIcon,
	ArrowDownward as ArrowDownIcon,
	Download as DownloadIcon,
	Info as InfoIcon,
	CheckCircle as CheckCircleIcon,
	BarChart as BarChartIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface DashboardStats {
	totalAircraft: number;
	forSaleAircraft: number;
	totalUsers: number;
	activeUsers: number;
	totalValue: number;
	averagePrice: number;
	activeListings: number;
	newThisMonth: number;
	soldThisMonth: number;
	lastSync: string;
	lastSyncStatus: string;
	jetnetApi: boolean;
	// Enhanced comprehensive data
	enrichedAircraft: number;
	withImages: number;
	withMarketData: number;
	withLeadScores: number;
	topManufacturers: Array<{ manufacturer: string; count: number }>;
	priceDistribution: Array<{ range: string; count: number }>;
	recentActivity: Array<{ type: string; description: string; timestamp: string }>;
}

export function Dashboard() {
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState(false);
	const theme = useTheme();

	const fetchStats = async () => {
		try {
			// Get comprehensive analytics data
			const analyticsResponse = await fetch('/api/analytics/comprehensive?limit=10000');
			const analyticsData = await analyticsResponse.json();

			if (analyticsResponse.ok && analyticsData.success && analyticsData.data) {
				const aircraft = analyticsData.data;
				const totalAircraft = aircraft.length;
				const forSaleAircraft = aircraft.filter(
					(a: any) => a.forSale || a.status === 'For Sale'
				).length;

				// Calculate comprehensive metrics
				const withPrice = aircraft.filter((a: any) => a.price && a.price > 0);
				const totalValue = withPrice.reduce((sum: number, a: any) => sum + Number(a.price), 0);
				const averagePrice = withPrice.length > 0 ? totalValue / withPrice.length : 0;

				const enrichedAircraft = aircraft.filter(
					(a: any) => a.specifications && Object.keys(a.specifications).length > 0
				).length;
				const withImages = aircraft.filter((a: any) => a.images && a.images.length > 0).length;
				const withMarketData = aircraft.filter(
					(a: any) => a.marketDataRecords && a.marketDataRecords.length > 0
				).length;
				const withLeadScores = aircraft.filter(
					(a: any) => a.leadScores && a.leadScores.length > 0
				).length;

				// Calculate manufacturer distribution
				const manufacturerCounts = aircraft.reduce((acc: Record<string, number>, a: any) => {
					const manufacturer = a.manufacturer || 'Unknown';
					acc[manufacturer] = (acc[manufacturer] || 0) + 1;
					return acc;
				}, {});

				const topManufacturers = Object.entries(manufacturerCounts)
					.map(([manufacturer, count]) => ({ manufacturer, count: count as number }))
					.sort((a, b) => b.count - a.count)
					.slice(0, 5);

				// Calculate price distribution
				const priceRanges = [
					{ range: 'Under $1M', min: 0, max: 1000000 },
					{ range: '$1M - $5M', min: 1000000, max: 5000000 },
					{ range: '$5M - $10M', min: 5000000, max: 10000000 },
					{ range: '$10M - $25M', min: 10000000, max: 25000000 },
					{ range: 'Over $25M', min: 25000000, max: Infinity },
				];

				const priceDistribution = priceRanges.map(range => ({
					range: range.range,
					count: withPrice.filter((a: any) => a.price >= range.min && a.price < range.max).length,
				}));

				// Get recent activity (last 7 days)
				const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
				const recentActivity = aircraft
					.filter((a: any) => new Date(a.createdAt) > sevenDaysAgo)
					.map((a: any) => ({
						type: 'aircraft_added',
						description: `${a.manufacturer} ${a.model} (${a.registration}) added`,
						timestamp: a.createdAt,
					}))
					.slice(0, 10);

				// Get JetNet API status
				const jetnetResponse = await fetch('/api/jetnet/health');
				const jetnetData = await jetnetResponse.json();

				const statsData: DashboardStats = {
					totalAircraft,
					forSaleAircraft,
					totalUsers: 0, // This would come from user management API
					activeUsers: 0, // This would come from user management API
					totalValue,
					averagePrice,
					activeListings: forSaleAircraft,
					newThisMonth: recentActivity.length,
					soldThisMonth: 0, // This would be calculated from sale dates
					lastSync: new Date().toISOString(),
					lastSyncStatus: 'success',
					jetnetApi: jetnetData.success || false,
					// Enhanced comprehensive data
					enrichedAircraft,
					withImages,
					withMarketData,
					withLeadScores,
					topManufacturers,
					priceDistribution,
					recentActivity,
				};

				setStats(statsData);
			} else {
				// Fallback to basic stats
				const fallbackResponse = await fetch('/api/dashboard/stats');
				const fallbackData = await fallbackResponse.json();
				if (fallbackData.success) {
					setStats(fallbackData.data);
				}
			}
		} catch (error) {
			console.error('Error fetching stats:', error);
			toast.error('Failed to fetch dashboard statistics');
		}
	};

	const fetchAircraft = async () => {
		try {
			const response = await fetch('/api/database/aircraft');
			const data = await response.json();
			if (data.success) {
				// Aircraft data is now handled by the AircraftMarketEvaluation component
			}
		} catch (error) {
			console.error('Error fetching aircraft:', error);
			toast.error('Failed to fetch aircraft data');
		}
	};

	const syncWithJetNet = async () => {
		setSyncing(true);
		try {
			const response = await fetch('/api/jetnet/sync-aircraft', {
				method: 'POST',
			});
			const data = await response.json();
			if (data.success) {
				toast.success(`Sync completed: ${data.data.created} created, ${data.data.updated} updated`);
				await Promise.all([fetchStats(), fetchAircraft()]);
			} else {
				toast.error('Sync failed: ' + (data.error || 'Unknown error'));
			}
		} catch (error) {
			console.error('Error syncing with JetNet:', error);
			toast.error('Failed to sync with JetNet');
		} finally {
			setSyncing(false);
		}
	};

	useEffect(() => {
		const loadData = async () => {
			setLoading(true);
			await Promise.all([fetchStats(), fetchAircraft()]);
			setLoading(false);
		};
		loadData();
	}, []);

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	const StatCard = ({
		title,
		value,
		subtitle,
		icon: Icon,
		trend,
		trendValue,
		helpContent,
		color = 'primary',
	}: {
		title: string;
		value: string | number;
		subtitle: string;
		icon: React.ComponentType;
		trend?: 'up' | 'down';
		trendValue?: string;
		helpContent?: string;
		color?: 'primary' | 'success' | 'warning' | 'error';
	}) => (
		<Grow in={true} timeout={800}>
			<Card
				sx={{
					height: '100%',
					position: 'relative',
					overflow: 'hidden',
					'&:hover': {
						transform: 'translateY(-4px)',
						boxShadow: theme.shadows[8],
					},
					transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				}}
			>
				<CardHeader
					sx={{
						pb: 1,
						'& .MuiCardHeader-content': {
							display: 'flex',
							alignItems: 'center',
							gap: 1,
						},
					}}
				>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
						<Typography variant="body2" color="text.secondary" fontWeight={600}>
							{title}
						</Typography>
						{helpContent && (
							<Tooltip title={helpContent} arrow>
								<IconButton size="small" sx={{ p: 0.5 }}>
									<InfoIcon fontSize="small" />
								</IconButton>
							</Tooltip>
						)}
					</Box>
					<Avatar
						sx={{
							bgcolor: `${color}.main`,
							color: `${color}.contrastText`,
							width: 40,
							height: 40,
						}}
					>
						<Icon />
					</Avatar>
				</CardHeader>
				<CardContent sx={{ pt: 0 }}>
					<Typography variant="h4" fontWeight={700} gutterBottom>
						{value}
					</Typography>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
						{trend && (
							<Chip
								icon={trend === 'up' ? <ArrowUpIcon /> : <ArrowDownIcon />}
								label={trendValue}
								size="small"
								color={trend === 'up' ? 'success' : 'error'}
								variant="outlined"
								sx={{ fontSize: '0.75rem', height: 24 }}
							/>
						)}
						<Typography variant="body2" color="text.secondary">
							{subtitle}
						</Typography>
					</Box>
				</CardContent>
			</Card>
		</Grow>
	);

	const QuickAccessCard = ({
		title,
		description,
		icon: Icon,
		href,
		color = 'primary',
	}: {
		title: string;
		description: string;
		icon: React.ComponentType;
		href: string;
		color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
	}) => (
		<Grow in={true} timeout={1000}>
			<Link href={href} style={{ textDecoration: 'none' }}>
				<Card
					sx={{
						height: '100%',
						cursor: 'pointer',
						transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
						'&:hover': {
							transform: 'translateY(-8px)',
							boxShadow: theme.shadows[12],
							'& .icon-container': {
								transform: 'scale(1.1)',
								bgcolor: `${color}.main`,
								color: `${color}.contrastText`,
							},
						},
					}}
				>
					<CardContent sx={{ textAlign: 'center', p: 4 }}>
						<Box
							className="icon-container"
							sx={{
								width: 80,
								height: 80,
								borderRadius: '50%',
								bgcolor: `${color}.light`,
								color: `${color}.main`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								mx: 'auto',
								mb: 3,
								transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
							}}
						>
							<Icon />
						</Box>
						<Typography variant="h6" fontWeight={600} gutterBottom>
							{title}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{description}
						</Typography>
					</CardContent>
				</Card>
			</Link>
		</Grow>
	);

	if (loading) {
		return (
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
					<LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
					<Typography variant="h6" color="text.secondary">
						Loading Dashboard...
					</Typography>
				</Box>
			</Container>
		);
	}

	return (
		<Box
			sx={{
				minHeight: '100vh',
				background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.primary.light}10 100%)`,
				py: 4,
			}}
		>
			<Container maxWidth="xl">
				{/* Header Section */}
				<Fade in={true} timeout={600}>
					<Box sx={{ mb: 6 }}>
						<Box
							sx={{
								display: 'flex',
								flexDirection: { xs: 'column', lg: 'row' },
								justifyContent: 'space-between',
								alignItems: { xs: 'flex-start', lg: 'center' },
								gap: 4,
								mb: 4,
							}}
						>
							<Box>
								<Box
									sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}
								>
									<Typography
										variant="h3"
										fontWeight={700}
										sx={{
											background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
											backgroundClip: 'text',
											WebkitBackgroundClip: 'text',
											WebkitTextFillColor: 'transparent',
											fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
										}}
									>
										ACE Aircraft Intelligence
									</Typography>
									<Tooltip title="Your comprehensive aviation market intelligence platform" arrow>
										<IconButton size="small">
											<InfoIcon />
										</IconButton>
									</Tooltip>
								</Box>
								<Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
									Real-time aviation market intelligence platform
								</Typography>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
									<Chip
										icon={<CheckCircleIcon />}
										label="Live Data"
										color="success"
										variant="outlined"
										size="small"
									/>
									<Chip
										icon={<DatabaseIcon />}
										label="JetNet API"
										color="primary"
										variant="outlined"
										size="small"
									/>
								</Box>
							</Box>

							<Box
								sx={{
									display: 'flex',
									flexDirection: { xs: 'column', sm: 'row' },
									gap: 2,
									width: { xs: '100%', sm: 'auto' },
								}}
							>
								<Button variant="outlined" startIcon={<DownloadIcon />} sx={{ minWidth: 140 }}>
									Export Data
								</Button>
								<Button
									variant="contained"
									startIcon={
										<RefreshIcon sx={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
									}
									onClick={syncWithJetNet}
									disabled={syncing}
									sx={{
										background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
										minWidth: 160,
									}}
								>
									{syncing ? 'Syncing...' : 'Sync with JetNet'}
								</Button>
							</Box>
						</Box>
					</Box>
				</Fade>

				{/* Stats Grid */}
				{stats && (
					<Fade in={true} timeout={800}>
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 6 }}>
							<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
								<StatCard
									title="Total Aircraft"
									value={stats.totalAircraft.toLocaleString()}
									subtitle={`${stats.forSaleAircraft} available for sale`}
									icon={FlightIcon}
									trend="up"
									trendValue="+12%"
									helpContent="Total number of aircraft in our database, including all aircraft regardless of sale status for comprehensive market analysis."
									color="primary"
								/>
							</Box>
							<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
								<StatCard
									title="Total Value"
									value={formatCurrency(stats.totalValue)}
									subtitle={`Avg: ${formatCurrency(stats.averagePrice)}`}
									icon={DollarIcon}
									trend="up"
									trendValue="+8%"
									helpContent="Total market value of all aircraft listings. Average price helps identify market trends and pricing patterns."
									color="success"
								/>
							</Box>
							<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
								<StatCard
									title="Sync Status"
									value={stats.jetnetApi ? 'Connected' : 'Disconnected'}
									subtitle={`Last sync: ${
										stats.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never'
									}`}
									icon={DatabaseIcon}
									helpContent="Connection status with JetNet API. Green indicates active connection with recent data sync."
									color={stats.jetnetApi ? 'success' : 'error'}
								/>
							</Box>
						</Box>
					</Fade>
				)}

				{/* Comprehensive Data Quality Cards */}
				{stats && (
					<Fade in={true} timeout={1000}>
						<Box sx={{ mb: 6 }}>
							<Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
								Data Quality & Enrichment
							</Typography>
							<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
								<Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
									<StatCard
										title="Enriched Aircraft"
										value={stats.enrichedAircraft.toLocaleString()}
										subtitle={`${Math.round(
											(stats.enrichedAircraft / stats.totalAircraft) * 100
										)}% of total`}
										icon={TrendingUpIcon}
										helpContent="Aircraft with comprehensive technical specifications, maintenance data, and market information."
										color="primary"
									/>
								</Box>
								<Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
									<StatCard
										title="With Images"
										value={stats.withImages.toLocaleString()}
										subtitle={`${Math.round(
											(stats.withImages / stats.totalAircraft) * 100
										)}% coverage`}
										icon={FileTextIcon}
										helpContent="Aircraft with high-quality images for better market presentation and analysis."
										color="success"
									/>
								</Box>
								<Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
									<StatCard
										title="Market Data"
										value={stats.withMarketData.toLocaleString()}
										subtitle={`${Math.round(
											(stats.withMarketData / stats.totalAircraft) * 100
										)}% coverage`}
										icon={BarChartIcon}
										helpContent="Aircraft with historical market data, pricing trends, and competitive analysis."
										color="warning"
									/>
								</Box>
								<Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
									<StatCard
										title="Lead Scores"
										value={stats.withLeadScores.toLocaleString()}
										subtitle={`${Math.round(
											(stats.withLeadScores / stats.totalAircraft) * 100
										)}% coverage`}
										icon={ActivityIcon}
										helpContent="Aircraft with calculated lead scores based on market demand, pricing, and specifications."
										color="error"
									/>
								</Box>
							</Box>
						</Box>
					</Fade>
				)}

				{/* Top Manufacturers & Price Distribution */}
				{stats && (
					<Fade in={true} timeout={1200}>
						<Box sx={{ mb: 6 }}>
							<Box
								sx={{
									display: 'grid',
									gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
									gap: 3,
								}}
							>
								{/* Top Manufacturers */}
								<Card>
									<CardHeader title="Top Manufacturers" />
									<CardContent>
										{stats.topManufacturers.map((manufacturer, index) => (
											<Box
												key={manufacturer.manufacturer}
												sx={{
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'center',
													mb: 2,
												}}
											>
												<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
													<Avatar
														sx={{
															width: 32,
															height: 32,
															bgcolor: 'primary.main',
															fontSize: '0.875rem',
														}}
													>
														{index + 1}
													</Avatar>
													<Typography variant="body1" fontWeight={500}>
														{manufacturer.manufacturer}
													</Typography>
												</Box>
												<Chip label={manufacturer.count} color="primary" variant="outlined" />
											</Box>
										))}
									</CardContent>
								</Card>

								{/* Price Distribution */}
								<Card>
									<CardHeader title="Price Distribution" />
									<CardContent>
										{stats.priceDistribution.map((range, index) => (
											<Box key={range.range} sx={{ mb: 2 }}>
												<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
													<Typography variant="body2">{range.range}</Typography>
													<Typography variant="body2" fontWeight={500}>
														{range.count} aircraft
													</Typography>
												</Box>
												<LinearProgress
													variant="determinate"
													value={
														(range.count / Math.max(...stats.priceDistribution.map(p => p.count))) *
														100
													}
													sx={{ height: 8, borderRadius: 4 }}
												/>
											</Box>
										))}
									</CardContent>
								</Card>
							</Box>
						</Box>
					</Fade>
				)}

				{/* Quick Access Cards */}
				<Fade in={true} timeout={1000}>
					<Box>
						<Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
							Quick Access
						</Typography>
						<Box
							sx={{
								display: 'grid',
								gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
								gap: 3,
							}}
						>
							<QuickAccessCard
								title="Aircraft Database"
								description="Browse and manage all aircraft listings with advanced filtering"
								icon={FlightIcon}
								href="/aircraft"
								color="primary"
							/>
							<QuickAccessCard
								title="Market Analysis"
								description="Comprehensive market insights and trend analysis"
								icon={TrendingUpIcon}
								href="/analytics"
								color="success"
							/>
							<QuickAccessCard
								title="Analytics & Reports"
								description="Generate detailed reports and analytics"
								icon={FileTextIcon}
								href="/reports"
								color="warning"
							/>
							<QuickAccessCard
								title="System Activity"
								description="Monitor system activity and sync status"
								icon={ActivityIcon}
								href="/logs"
								color="error"
							/>
						</Box>
					</Box>
				</Fade>
			</Container>
		</Box>
	);
}
