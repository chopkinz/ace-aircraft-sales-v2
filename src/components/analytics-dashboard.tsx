'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
	Container,
	Typography,
	Box,
	Card,
	CardContent,
	CardHeader,
	Button,
	Chip,
	IconButton,
	Tooltip,
	LinearProgress,
	Fade,
	Grow,
	useTheme,
	Avatar,
	Alert,
} from '@mui/material';
import {
	BarChart as BarChartIcon,
	TrendingUp as TrendingUpIcon,
	Flight as FlightIcon,
	AttachMoney as DollarIcon,
	Flag as TargetIcon,
	ArrowUpward as ArrowUpIcon,
	ArrowDownward as ArrowDownIcon,
	Refresh as RefreshIcon,
	Download as DownloadIcon,
	Info as InfoIcon,
} from '@mui/icons-material';
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	Area,
	AreaChart,
} from 'recharts';
import toast from 'react-hot-toast';

interface AnalyticsData {
	aircraft: Array<{
		id: string;
		manufacturer: string;
		model: string;
		year: number | null;
		price: number | null;
		status: string;
		location: string | null;
		createdAt: string;
	}>;
	marketData: Array<{
		id: string;
		aircraftId: string;
		price: number | null;
		date: string;
	}>;
}

interface MetricCardProps {
	title: string;
	value: string | number;
	change?: number;
	changeType?: 'positive' | 'negative' | 'neutral';
	icon: React.ComponentType;
	description?: string;
	helpContent?: string;
	color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

const MetricCard = ({
	title,
	value,
	change,
	changeType,
	icon: Icon,
	description,
	helpContent,
	color = 'primary',
}: MetricCardProps) => {
	const theme = useTheme();

	return (
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
						{change !== undefined && (
							<Chip
								icon={changeType === 'positive' ? <ArrowUpIcon /> : <ArrowDownIcon />}
								label={`${change > 0 ? '+' : ''}${change}%`}
								size="small"
								color={
									changeType === 'positive'
										? 'success'
										: changeType === 'negative'
										? 'error'
										: 'default'
								}
								variant="outlined"
								sx={{ fontSize: '0.75rem', height: 24 }}
							/>
						)}
						<Typography variant="body2" color="text.secondary">
							{description}
						</Typography>
					</Box>
				</CardContent>
			</Card>
		</Grow>
	);
};

export function AnalyticsDashboard() {
	const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const theme = useTheme();

	const fetchAnalyticsData = async () => {
		try {
			setRefreshing(true);

			// Fetch comprehensive aircraft data
			const response = await fetch('/api/database/aircraft/comprehensive?limit=10000');
			const data = await response.json();

			if (data.success && data.data) {
				const aircraft = data.data.map(
					(item: {
						id?: string;
						aircraftId?: string;
						manufacturer?: string;
						make?: string;
						model?: string;
						yearManufactured?: number;
						year?: number;
						yearmfr?: number;
						askingPrice?: number;
						price?: number;
						status?: string;
						location?: string;
						basecity?: string;
						createdAt?: string;
						updatedAt?: string;
					}) => ({
						id: item.id || item.aircraftId,
						manufacturer: item.manufacturer || item.make,
						model: item.model,
						year: item.yearManufactured || item.year || item.yearmfr,
						price: item.askingPrice || item.price,
						status: item.status,
						location: item.location || item.basecity,
						createdAt: item.createdAt || item.updatedAt,
					})
				);

				// Generate market data from aircraft data
				const marketData = aircraft
					.filter((a: { price?: number; createdAt?: string }) => a.price && a.createdAt)
					.map((a: { id: string; price: number; createdAt: string }) => ({
						id: a.id,
						aircraftId: a.id,
						price: a.price,
						date: a.createdAt,
					}));

				setAnalyticsData({
					aircraft,
					marketData,
				});
			} else {
				toast.error('Failed to fetch analytics data');
			}
		} catch (error) {
			console.error('Error fetching analytics data:', error);
			toast.error('Failed to fetch analytics data');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchAnalyticsData();
	}, []);

	const chartData = useMemo(() => {
		if (!analyticsData) return [];

		// Group by manufacturer
		const manufacturerData = analyticsData.aircraft.reduce(
			(
				acc: { [key: string]: { manufacturer: string; count: number; totalValue: number } },
				aircraft: { manufacturer?: string; price: number | null }
			) => {
				const manufacturer = aircraft.manufacturer || 'Unknown';
				if (!acc[manufacturer]) {
					acc[manufacturer] = { manufacturer, count: 0, totalValue: 0 };
				}
				acc[manufacturer].count += 1;
				acc[manufacturer].totalValue += aircraft.price || 0;
				return acc;
			},
			{}
		);

		return Object.values(manufacturerData).slice(0, 10);
	}, [analyticsData]);

	const priceRangeData = useMemo(() => {
		if (!analyticsData) return [];

		const ranges = [
			{ range: '0-1M', min: 0, max: 1000000 },
			{ range: '1M-5M', min: 1000000, max: 5000000 },
			{ range: '5M-10M', min: 5000000, max: 10000000 },
			{ range: '10M-25M', min: 10000000, max: 25000000 },
			{ range: '25M-50M', min: 25000000, max: 50000000 },
			{ range: '50M+', min: 50000000, max: Infinity },
		];

		return ranges.map(range => ({
			range: range.range,
			count: analyticsData.aircraft.filter(
				(a: { price: number | null }) => a.price && a.price >= range.min && a.price < range.max
			).length,
		}));
	}, [analyticsData]);

	const statusData = useMemo(() => {
		if (!analyticsData) return [];

		const statusCounts = analyticsData.aircraft.reduce(
			(acc: { [key: string]: number }, aircraft: { status?: string }) => {
				const status = aircraft.status || 'Unknown';
				acc[status] = (acc[status] || 0) + 1;
				return acc;
			},
			{}
		);

		return Object.entries(statusCounts).map(([status, count]) => ({
			status,
			count,
		}));
	}, [analyticsData]);

	const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

	if (loading) {
		return (
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
					<LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
					<Typography variant="h6" color="text.secondary">
						Loading Analytics...
					</Typography>
				</Box>
			</Container>
		);
	}

	if (!analyticsData) {
		return (
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Alert severity="error">
					Failed to load analytics data. Please try refreshing the page.
				</Alert>
			</Container>
		);
	}

	const totalAircraft = analyticsData.aircraft.length;
	const totalValue = analyticsData.aircraft.reduce((sum, a) => sum + (a.price || 0), 0);
	const averagePrice = totalAircraft > 0 ? totalValue / totalAircraft : 0;
	const forSaleCount = analyticsData.aircraft.filter(
		a => a.status === 'ACTIVE' || a.status === 'For Sale'
	).length;

	return (
		<Box
			sx={{
				minHeight: '100vh',
				background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.primary.light}10 100%)`,
				py: 4,
			}}
		>
			<Container maxWidth="xl">
				{/* Header */}
				<Fade in={true} timeout={600}>
					<Box sx={{ mb: 4 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
							<Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
								<BarChartIcon />
							</Avatar>
							<Box>
								<Typography variant="h4" fontWeight={700} color="primary.main">
									Market Analytics
								</Typography>
								<Typography variant="body1" color="text.secondary">
									Comprehensive aviation market intelligence and trend analysis
								</Typography>
							</Box>
						</Box>

						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
							<Button
								variant="outlined"
								startIcon={
									<RefreshIcon
										sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
									/>
								}
								onClick={fetchAnalyticsData}
								disabled={refreshing}
							>
								{refreshing ? 'Refreshing...' : 'Refresh Data'}
							</Button>
							<Button
								variant="contained"
								startIcon={<DownloadIcon />}
								sx={{
									background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
								}}
							>
								Export Report
							</Button>
						</Box>
					</Box>
				</Fade>

				{/* Metrics Cards */}
				<Fade in={true} timeout={800}>
					<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
						<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
							<MetricCard
								title="Total Aircraft"
								value={totalAircraft.toLocaleString()}
								change={12}
								changeType="positive"
								icon={FlightIcon}
								description={`${forSaleCount} available for sale`}
								helpContent="Total number of aircraft in the database"
								color="primary"
							/>
						</Box>
						<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
							<MetricCard
								title="Total Market Value"
								value={new Intl.NumberFormat('en-US', {
									style: 'currency',
									currency: 'USD',
									minimumFractionDigits: 0,
									maximumFractionDigits: 0,
								}).format(totalValue)}
								change={8}
								changeType="positive"
								icon={DollarIcon}
								description="Combined value of all listings"
								helpContent="Total market value of all aircraft listings"
								color="success"
							/>
						</Box>
						<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
							<MetricCard
								title="Average Price"
								value={new Intl.NumberFormat('en-US', {
									style: 'currency',
									currency: 'USD',
									minimumFractionDigits: 0,
									maximumFractionDigits: 0,
								}).format(averagePrice)}
								change={-2}
								changeType="negative"
								icon={TrendingUpIcon}
								description="Per aircraft"
								helpContent="Average price across all aircraft"
								color="info"
							/>
						</Box>
						<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
							<MetricCard
								title="Active Listings"
								value={forSaleCount.toLocaleString()}
								change={15}
								changeType="positive"
								icon={TargetIcon}
								description="Currently for sale"
								helpContent="Number of aircraft currently available for purchase"
								color="warning"
							/>
						</Box>
					</Box>
				</Fade>

				{/* Charts */}
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
					{/* Aircraft by Manufacturer */}
					<Box sx={{ flex: '1 1 500px', minWidth: 500 }}>
						<Fade in={true} timeout={1000}>
							<Card>
								<CardHeader
									title={
										<Typography variant="h6" fontWeight={600}>
											Aircraft by Manufacturer
										</Typography>
									}
								/>
								<CardContent>
									<Box sx={{ height: 300 }}>
										<ResponsiveContainer width="100%" height="100%">
											<BarChart data={chartData}>
												<CartesianGrid strokeDasharray="3 3" />
												<XAxis dataKey="manufacturer" />
												<YAxis />
												<RechartsTooltip />
												<Bar dataKey="count" fill={theme.palette.primary.main} />
											</BarChart>
										</ResponsiveContainer>
									</Box>
								</CardContent>
							</Card>
						</Fade>
					</Box>

					{/* Price Distribution */}
					<Box sx={{ flex: '1 1 500px', minWidth: 500 }}>
						<Fade in={true} timeout={1200}>
							<Card>
								<CardHeader
									title={
										<Typography variant="h6" fontWeight={600}>
											Price Distribution
										</Typography>
									}
								/>
								<CardContent>
									<Box sx={{ height: 300 }}>
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={priceRangeData}
													cx="50%"
													cy="50%"
													labelLine={false}
													label={({ range, count }) => `${range}: ${count}`}
													outerRadius={80}
													fill="#8884d8"
													dataKey="count"
												>
													{priceRangeData.map((entry, index) => (
														<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
													))}
												</Pie>
												<RechartsTooltip />
											</PieChart>
										</ResponsiveContainer>
									</Box>
								</CardContent>
							</Card>
						</Fade>
					</Box>

					{/* Status Distribution */}
					<Box sx={{ flex: '1 1 500px', minWidth: 500 }}>
						<Fade in={true} timeout={1400}>
							<Card>
								<CardHeader
									title={
										<Typography variant="h6" fontWeight={600}>
											Status Distribution
										</Typography>
									}
								/>
								<CardContent>
									<Box sx={{ height: 300 }}>
										<ResponsiveContainer width="100%" height="100%">
											<BarChart data={statusData} layout="horizontal">
												<CartesianGrid strokeDasharray="3 3" />
												<XAxis type="number" />
												<YAxis dataKey="status" type="category" width={100} />
												<RechartsTooltip />
												<Bar dataKey="count" fill={theme.palette.secondary.main} />
											</BarChart>
										</ResponsiveContainer>
									</Box>
								</CardContent>
							</Card>
						</Fade>
					</Box>

					{/* Market Trends */}
					<Box sx={{ flex: '1 1 500px', minWidth: 500 }}>
						<Fade in={true} timeout={1600}>
							<Card>
								<CardHeader
									title={
										<Typography variant="h6" fontWeight={600}>
											Market Trends
										</Typography>
									}
								/>
								<CardContent>
									<Box sx={{ height: 300 }}>
										<ResponsiveContainer width="100%" height="100%">
											<AreaChart data={chartData}>
												<CartesianGrid strokeDasharray="3 3" />
												<XAxis dataKey="manufacturer" />
												<YAxis />
												<RechartsTooltip />
												<Area
													type="monotone"
													dataKey="totalValue"
													stroke={theme.palette.primary.main}
													fill={theme.palette.primary.light}
												/>
											</AreaChart>
										</ResponsiveContainer>
									</Box>
								</CardContent>
							</Card>
						</Fade>
					</Box>
				</Box>
			</Container>
		</Box>
	);
}
