'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
	Container,
	Typography,
	Box,
	Card,
	CardContent,
	CardHeader,
	Button,
	Chip,
	LinearProgress,
	Fade,
	useTheme,
	Avatar,
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	InputAdornment,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TableSortLabel,
	Paper,
} from '@mui/material';
import {
	TrendingUp as TrendingUpIcon,
	BarChart as BarChartIcon,
	CalendarToday as CalendarIcon,
	AttachMoney as DollarIcon,
	Flight as FlightIcon,
	FilterList as FilterIcon,
	Download as DownloadIcon,
	Refresh as RefreshIcon,
	Search as SearchIcon,
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
} from 'recharts';
import toast from 'react-hot-toast';
import { Aircraft } from '@/lib/data-service';

interface MarketData {
	id: string;
	make: string;
	model: string;
	category: string;
	avgPrice: number;
	minPrice: number;
	maxPrice: number;
	totalListings: number;
	avgDaysOnMarket: number;
	priceTrend: string;
	marketTrend: string;
	dataDate: string;
	source: string;
}

interface MarketStats {
	totalListings: number;
	avgPrice: number;
	totalValue: number;
	avgDaysOnMarket: number;
	priceTrend: 'RISING' | 'FALLING' | 'STABLE' | 'VOLATILE';
	marketTrend: 'HOT' | 'WARM' | 'COOL' | 'COLD';
	topManufacturers: Array<{ manufacturer: string; count: number; avgPrice: number }>;
	topModels: Array<{ model: string; count: number; avgPrice: number }>;
}

export function MarketAnalysis() {
	const [marketData, setMarketData] = useState<MarketData[]>([]);
	const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterManufacturer, setFilterManufacturer] = useState('all');
	const [filterCategory] = useState('all');
	const [filterTrend, setFilterTrend] = useState('all');
	const [sortBy, setSortBy] = useState<keyof MarketData>('dataDate');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
	// const [selectedTimeframe] = useState('30d');
	const theme = useTheme();

	const fetchMarketData = useCallback(async () => {
		try {
			setLoading(true);

			// Fetch comprehensive aircraft data and generate market analysis
			const response = await fetch('/api/database/aircraft/comprehensive?limit=10000');
			const data = await response.json();

			if (data.success && data.data) {
				// Generate market data from aircraft data
				const aircraft = data.data;
				const generatedMarketData = generateMarketDataFromAircraft(aircraft);
				setMarketData(generatedMarketData);
				generateMarketStats(generatedMarketData);
			} else {
				// Fallback to market data API if available
				const marketResponse = await fetch('/api/database/market-data');
				const marketData = await marketResponse.json();
				if (marketData.success) {
					setMarketData(marketData.data);
					generateMarketStats(marketData.data);
				} else {
					toast.error('Failed to fetch market data');
				}
			}
		} catch (error) {
			console.error('Error fetching market data:', error);
			toast.error('Failed to fetch market data');
		} finally {
			setLoading(false);
		}
	}, []);

	const generateMarketDataFromAircraft = (aircraft: Aircraft[]): MarketData[] => {
		// Group aircraft by manufacturer and model
		const grouped = aircraft.reduce(
			(
				acc: Record<
					string,
					{ manufacturer: string; model: string; prices: number[]; listings: number; dates: Date[] }
				>,
				item
			) => {
				const manufacturer = item.manufacturer || 'Unknown';
				const model = item.model || 'Unknown';
				const key = `${manufacturer}-${model}`;

				if (!acc[key]) {
					acc[key] = {
						manufacturer: manufacturer,
						model: model,
						prices: [],
						listings: 0,
						dates: [],
					};
				}

				if (item.price) {
					acc[key].prices.push(item.price);
				}
				acc[key].listings += 1;
				if (item.createdAt || item.updatedAt) {
					acc[key].dates.push(new Date(item.createdAt || item.updatedAt));
				}

				return acc;
			},
			{}
		);

		// Convert to MarketData format
		return Object.values(grouped).map(
			(
				group: {
					manufacturer: string;
					model: string;
					prices: number[];
					listings: number;
					dates: Date[];
				},
				index
			) => {
				const prices = group.prices.filter((p: number) => p > 0);
				const avgPrice =
					prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
				const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
				const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

				// Calculate days on market (simplified)
				const avgDaysOnMarket =
					group.dates.length > 0
						? group.dates.reduce(
								(sum: number, date: Date) =>
									sum + (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
								0
						  ) / group.dates.length
						: 0;

				// Determine trends (simplified logic)
				const priceTrend =
					avgPrice > 10000000 ? 'RISING' : avgPrice > 5000000 ? 'STABLE' : 'FALLING';
				const marketTrend = group.listings > 10 ? 'HOT' : group.listings > 5 ? 'WARM' : 'COOL';

				return {
					id: `market-${index}`,
					make: group.manufacturer,
					manufacturer: group.manufacturer,
					model: group.model,
					category: 'Business Jet', // Simplified categorization
					avgPrice,
					minPrice,
					maxPrice,
					totalListings: group.listings,
					avgDaysOnMarket: Math.round(avgDaysOnMarket),
					priceTrend,
					marketTrend,
					dataDate: new Date().toISOString(),
					source: 'JetNet API',
				};
			}
		);
	};

	const generateMarketStats = (data: MarketData[]) => {
		const totalListings = data.reduce(
			(sum: number, item: MarketData) => sum + item.totalListings,
			0
		);
		const totalValue = data.reduce(
			(sum: number, item: MarketData) => sum + item.avgPrice * item.totalListings,
			0
		);
		const avgPrice = totalListings > 0 ? totalValue / totalListings : 0;
		const avgDaysOnMarket =
			data.length > 0
				? data.reduce((sum: number, item: MarketData) => sum + item.avgDaysOnMarket, 0) /
				  data.length
				: 0;

		// Calculate trends
		const risingCount = data.filter((item: MarketData) => item.priceTrend === 'RISING').length;
		const fallingCount = data.filter((item: MarketData) => item.priceTrend === 'FALLING').length;
		let priceTrend = 'STABLE';
		if (risingCount > fallingCount) {
			priceTrend = 'RISING';
		} else if (fallingCount > risingCount) {
			priceTrend = 'FALLING';
		}

		const hotCount = data.filter((item: MarketData) => item.marketTrend === 'HOT').length;
		const warmCount = data.filter((item: MarketData) => item.marketTrend === 'WARM').length;
		let marketTrend = 'COOL';
		if (hotCount > warmCount) {
			marketTrend = 'HOT';
		} else if (warmCount > 0) {
			marketTrend = 'WARM';
		}

		// Top manufacturers
		const manufacturerStats = data.reduce(
			(acc: Record<string, { count: number; totalPrice: number }>, item: MarketData) => {
				if (!acc[item.make]) {
					acc[item.make] = { count: 0, totalPrice: 0 };
				}
				acc[item.make].count += item.totalListings;
				acc[item.make].totalPrice += item.avgPrice * item.totalListings;
				return acc;
			},
			{}
		);

		const topManufacturers = Object.entries(manufacturerStats)
			.map(([manufacturer, stats]: [string, { count: number; totalPrice: number }]) => ({
				manufacturer,
				count: stats.count,
				avgPrice: stats.count > 0 ? stats.totalPrice / stats.count : 0,
			}))
			.sort(
				(
					a: { manufacturer: string; count: number; avgPrice: number },
					b: { manufacturer: string; count: number; avgPrice: number }
				) => b.count - a.count
			)
			.slice(0, 10);

		// Top models
		const modelStats = data.reduce(
			(acc: Record<string, { count: number; totalPrice: number }>, item: MarketData) => {
				const key = `${item.make} ${item.model}`;
				if (!acc[key]) {
					acc[key] = { count: 0, totalPrice: 0 };
				}
				acc[key].count += item.totalListings;
				acc[key].totalPrice += item.avgPrice * item.totalListings;
				return acc;
			},
			{}
		);

		const topModels = Object.entries(modelStats)
			.map(([model, stats]: [string, { count: number; totalPrice: number }]) => ({
				model,
				count: stats.count,
				avgPrice: stats.count > 0 ? stats.totalPrice / stats.count : 0,
			}))
			.sort(
				(
					a: { model: string; count: number; avgPrice: number },
					b: { model: string; count: number; avgPrice: number }
				) => b.count - a.count
			)
			.slice(0, 10);

		setMarketStats({
			totalListings,
			avgPrice,
			totalValue,
			avgDaysOnMarket,
			priceTrend: priceTrend as 'RISING' | 'FALLING' | 'STABLE' | 'VOLATILE',
			marketTrend: marketTrend as 'HOT' | 'WARM' | 'COOL' | 'COLD',
			topManufacturers,
			topModels,
		});
	};

	const filteredData = useMemo(() => {
		let filtered = marketData;

		if (searchTerm) {
			filtered = filtered.filter(
				(item: MarketData) =>
					item.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
					item.model.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		if (filterManufacturer !== 'all') {
			filtered = filtered.filter((item: MarketData) => item.make === filterManufacturer);
		}

		if (filterCategory !== 'all') {
			filtered = filtered.filter((item: MarketData) => item.category === filterCategory);
		}

		if (filterTrend !== 'all') {
			filtered = filtered.filter((item: MarketData) => item.priceTrend === filterTrend);
		}

		// Sort data
		filtered.sort((a: MarketData, b: MarketData) => {
			const aValue = a[sortBy];
			const bValue = b[sortBy];
			if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
			return 0;
		});

		return filtered;
	}, [marketData, searchTerm, filterManufacturer, filterCategory, filterTrend, sortBy, sortOrder]);

	const manufacturers = useMemo(() => {
		const unique = [...new Set(marketData.map((item: MarketData) => item.make))];
		return unique.sort();
	}, [marketData]);

	const getPriceTrendColor = (trend: string) => {
		switch (trend) {
			case 'RISING':
				return 'success';
			case 'FALLING':
				return 'error';
			case 'STABLE':
				return 'info';
			default:
				return 'default';
		}
	};

	const getMarketTrendColor = (trend: string) => {
		switch (trend) {
			case 'HOT':
				return 'error';
			case 'WARM':
				return 'warning';
			case 'COOL':
				return 'info';
			case 'COLD':
				return 'default';
			default:
				return 'default';
		}
	};

	const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

	useEffect(() => {
		fetchMarketData();
	}, [fetchMarketData]);

	if (loading) {
		return (
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
					<LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
					<Typography variant="h6" color="text.secondary">
						Loading Market Analysis...
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
				{/* Header */}
				<Fade in={true} timeout={600}>
					<Box sx={{ mb: 4 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
							<Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
								<BarChartIcon />
							</Avatar>
							<Box>
								<Typography variant="h4" fontWeight={700} color="primary.main">
									Market Analysis
								</Typography>
								<Typography variant="body1" color="text.secondary">
									Comprehensive aviation market intelligence and trends
								</Typography>
							</Box>
						</Box>

						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
							<Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchMarketData}>
								Refresh Data
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

				{/* Market Stats */}
				{marketStats && (
					<Fade in={true} timeout={800}>
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
							<Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
								<Card>
									<CardContent>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
											<Avatar sx={{ bgcolor: 'primary.main' }}>
												<FlightIcon />
											</Avatar>
											<Box>
												<Typography variant="h4" fontWeight={700}>
													{marketStats.totalListings.toLocaleString()}
												</Typography>
												<Typography variant="body2" color="text.secondary">
													Total Listings
												</Typography>
											</Box>
										</Box>
									</CardContent>
								</Card>
							</Box>
							<Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
								<Card>
									<CardContent>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
											<Avatar sx={{ bgcolor: 'success.main' }}>
												<DollarIcon />
											</Avatar>
											<Box>
												<Typography variant="h4" fontWeight={700}>
													{new Intl.NumberFormat('en-US', {
														style: 'currency',
														currency: 'USD',
														minimumFractionDigits: 0,
														maximumFractionDigits: 0,
													}).format(marketStats.avgPrice)}
												</Typography>
												<Typography variant="body2" color="text.secondary">
													Average Price
												</Typography>
											</Box>
										</Box>
									</CardContent>
								</Card>
							</Box>
							<Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
								<Card>
									<CardContent>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
											<Avatar sx={{ bgcolor: 'warning.main' }}>
												<CalendarIcon />
											</Avatar>
											<Box>
												<Typography variant="h4" fontWeight={700}>
													{Math.round(marketStats.avgDaysOnMarket)}
												</Typography>
												<Typography variant="body2" color="text.secondary">
													Avg Days on Market
												</Typography>
											</Box>
										</Box>
									</CardContent>
								</Card>
							</Box>
							<Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
								<Card>
									<CardContent>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
											<Avatar sx={{ bgcolor: 'info.main' }}>
												<TrendingUpIcon />
											</Avatar>
											<Box>
												<Chip
													label={marketStats.priceTrend}
													color={
														getPriceTrendColor(marketStats.priceTrend) as
															| 'success'
															| 'error'
															| 'warning'
															| 'default'
													}
													size="small"
												/>
												<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
													Price Trend
												</Typography>
											</Box>
										</Box>
									</CardContent>
								</Card>
							</Box>
						</Box>
					</Fade>
				)}

				{/* Charts */}
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
					{/* Top Manufacturers */}
					<Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
						<Fade in={true} timeout={1000}>
							<Card>
								<CardHeader
									title={
										<Typography variant="h6" fontWeight={600}>
											Top Manufacturers
										</Typography>
									}
								/>
								<CardContent>
									<Box sx={{ height: 300 }}>
										<ResponsiveContainer width="100%" height="100%">
											<BarChart data={marketStats?.topManufacturers.slice(0, 8) || []}>
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

					{/* Market Trends */}
					<Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
						<Fade in={true} timeout={1200}>
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
											<PieChart>
												<Pie
													data={[
														{
															name: 'Hot',
															value: marketData.filter(item => item.marketTrend === 'HOT').length,
														},
														{
															name: 'Warm',
															value: marketData.filter(item => item.marketTrend === 'WARM').length,
														},
														{
															name: 'Cool',
															value: marketData.filter(item => item.marketTrend === 'COOL').length,
														},
														{
															name: 'Cold',
															value: marketData.filter(item => item.marketTrend === 'COLD').length,
														},
													]}
													cx="50%"
													cy="50%"
													labelLine={false}
													label={({ name, value }) => `${name}: ${value}`}
													outerRadius={80}
													fill="#8884d8"
													dataKey="value"
												>
													{COLORS.map((color, index) => (
														<Cell key={`cell-${index}`} fill={color} />
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
				</Box>

				{/* Filters */}
				<Fade in={true} timeout={1400}>
					<Card sx={{ mb: 4 }}>
						<CardContent>
							<Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
								<FilterIcon />
								Filters & Search
							</Typography>
							<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
								<Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
									<TextField
										fullWidth
										label="Search Aircraft"
										value={searchTerm}
										onChange={e => setSearchTerm(e.target.value)}
										InputProps={{
											startAdornment: (
												<InputAdornment position="start">
													<SearchIcon />
												</InputAdornment>
											),
										}}
									/>
								</Box>
								<Box sx={{ flex: '1 1 150px', minWidth: 150 }}>
									<FormControl fullWidth>
										<InputLabel>Manufacturer</InputLabel>
										<Select
											value={filterManufacturer}
											onChange={e => setFilterManufacturer(e.target.value)}
											label="Manufacturer"
										>
											<MenuItem value="all">All</MenuItem>
											{manufacturers.map(manufacturer => (
												<MenuItem key={manufacturer} value={manufacturer}>
													{manufacturer}
												</MenuItem>
											))}
										</Select>
									</FormControl>
								</Box>
								<Box sx={{ flex: '1 1 150px', minWidth: 150 }}>
									<FormControl fullWidth>
										<InputLabel>Price Trend</InputLabel>
										<Select
											value={filterTrend}
											onChange={e => setFilterTrend(e.target.value)}
											label="Price Trend"
										>
											<MenuItem value="all">All</MenuItem>
											<MenuItem value="RISING">Rising</MenuItem>
											<MenuItem value="FALLING">Falling</MenuItem>
											<MenuItem value="STABLE">Stable</MenuItem>
										</Select>
									</FormControl>
								</Box>
							</Box>
						</CardContent>
					</Card>
				</Fade>

				{/* Market Data Table */}
				<Fade in={true} timeout={1600}>
					<Card>
						<CardHeader
							title={
								<Typography variant="h6" fontWeight={600}>
									Market Data ({filteredData.length} records)
								</Typography>
							}
						/>
						<CardContent>
							<TableContainer component={Paper} variant="outlined">
								<Table>
									<TableHead>
										<TableRow>
											<TableCell>
												<TableSortLabel
													active={sortBy === 'make'}
													direction={sortBy === 'make' ? sortOrder : 'asc'}
													onClick={() => {
														setSortBy('make');
														setSortOrder(sortBy === 'make' && sortOrder === 'asc' ? 'desc' : 'asc');
													}}
												>
													Manufacturer
												</TableSortLabel>
											</TableCell>
											<TableCell>Model</TableCell>
											<TableCell>
												<TableSortLabel
													active={sortBy === 'avgPrice'}
													direction={sortBy === 'avgPrice' ? sortOrder : 'asc'}
													onClick={() => {
														setSortBy('avgPrice');
														setSortOrder(
															sortBy === 'avgPrice' && sortOrder === 'asc' ? 'desc' : 'asc'
														);
													}}
												>
													Avg Price
												</TableSortLabel>
											</TableCell>
											<TableCell>Listings</TableCell>
											<TableCell>Price Trend</TableCell>
											<TableCell>Market Trend</TableCell>
											<TableCell>Days on Market</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{filteredData.slice(0, 50).map((item: MarketData) => (
											<TableRow key={item.id} hover>
												<TableCell>
													<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
														<FlightIcon fontSize="small" color="primary" />
														{item.make}
													</Box>
												</TableCell>
												<TableCell>{item.model}</TableCell>
												<TableCell>
													<Typography variant="body2" fontWeight={600} color="success.main">
														{new Intl.NumberFormat('en-US', {
															style: 'currency',
															currency: 'USD',
															minimumFractionDigits: 0,
															maximumFractionDigits: 0,
														}).format(item.avgPrice)}
													</Typography>
												</TableCell>
												<TableCell>{item.totalListings}</TableCell>
												<TableCell>
													<Chip
														label={item.priceTrend}
														color={
															getPriceTrendColor(item.priceTrend) as
																| 'success'
																| 'error'
																| 'warning'
																| 'default'
														}
														size="small"
													/>
												</TableCell>
												<TableCell>
													<Chip
														label={item.marketTrend}
														color={
															getMarketTrendColor(item.marketTrend) as
																| 'success'
																| 'error'
																| 'warning'
																| 'default'
														}
														size="small"
													/>
												</TableCell>
												<TableCell>{item.avgDaysOnMarket}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						</CardContent>
					</Card>
				</Fade>
			</Container>
		</Box>
	);
}
