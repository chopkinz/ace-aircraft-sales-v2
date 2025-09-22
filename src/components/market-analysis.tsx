'use client';

import React, { useState, useEffect } from 'react';
import {
	TrendingUp,
	TrendingDown,
	BarChart3,
	PieChart,
	MapPin,
	Calendar,
	DollarSign,
	Plane,
	Filter,
	Download,
	RefreshCw,
	Eye,
	ArrowUp,
	ArrowDown,
	Activity,
	Target,
	Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

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
	priceRanges: Array<{ range: string; count: number; percentage: number }>;
	yearDistribution: Array<{ year: number; count: number; avgPrice: number }>;
}

export function MarketAnalysis() {
	const [marketData, setMarketData] = useState<MarketData[]>([]);
	const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterManufacturer, setFilterManufacturer] = useState('all');
	const [filterCategory, setFilterCategory] = useState('all');
	const [filterTrend, setFilterTrend] = useState('all');
	const [sortBy, setSortBy] = useState<keyof MarketData>('dataDate');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
	const [selectedTimeframe, setSelectedTimeframe] = useState('30d');

	const fetchMarketData = async () => {
		try {
			setLoading(true);
			const response = await fetch('/api/database/market-data');
			const data = await response.json();
			if (data.success) {
				setMarketData(data.data);
				generateMarketStats(data.data);
			} else {
				toast.error('Failed to fetch market data');
			}
		} catch (error) {
			console.error('Error fetching market data:', error);
			toast.error('Failed to fetch market data');
		} finally {
			setLoading(false);
		}
	};

	const generateMarketStats = (data: MarketData[]) => {
		const stats: MarketStats = {
			totalListings: data.reduce((sum, item) => sum + item.totalListings, 0),
			avgPrice: data.reduce((sum, item) => sum + item.avgPrice, 0) / data.length || 0,
			totalValue: data.reduce((sum, item) => sum + item.avgPrice * item.totalListings, 0),
			avgDaysOnMarket: data.reduce((sum, item) => sum + item.avgDaysOnMarket, 0) / data.length || 0,
			priceTrend: 'STABLE',
			marketTrend: 'WARM',
			topManufacturers: [],
			topModels: [],
			priceRanges: [],
			yearDistribution: [],
		};

		// Generate manufacturer stats
		const manufacturerMap = new Map();
		data.forEach(item => {
			const existing = manufacturerMap.get(item.make) || { count: 0, totalPrice: 0 };
			manufacturerMap.set(item.make, {
				count: existing.count + item.totalListings,
				totalPrice: existing.totalPrice + item.avgPrice * item.totalListings,
			});
		});

		stats.topManufacturers = Array.from(manufacturerMap.entries())
			.map(([manufacturer, data]) => ({
				manufacturer,
				count: data.count,
				avgPrice: data.totalPrice / data.count,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		// Generate model stats
		const modelMap = new Map();
		data.forEach(item => {
			const key = `${item.make} ${item.model}`;
			const existing = modelMap.get(key) || { count: 0, totalPrice: 0 };
			modelMap.set(key, {
				count: existing.count + item.totalListings,
				totalPrice: existing.totalPrice + item.avgPrice * item.totalListings,
			});
		});

		stats.topModels = Array.from(modelMap.entries())
			.map(([model, data]) => ({
				model,
				count: data.count,
				avgPrice: data.totalPrice / data.count,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		// Generate price ranges
		const priceRanges = [
			{ min: 0, max: 1000000, label: 'Under $1M' },
			{ min: 1000000, max: 5000000, label: '$1M - $5M' },
			{ min: 5000000, max: 10000000, label: '$5M - $10M' },
			{ min: 10000000, max: 20000000, label: '$10M - $20M' },
			{ min: 20000000, max: Infinity, label: 'Over $20M' },
		];

		stats.priceRanges = priceRanges.map(range => {
			const count = data
				.filter(item => item.avgPrice >= range.min && item.avgPrice < range.max)
				.reduce((sum, item) => sum + item.totalListings, 0);
			return {
				range: range.label,
				count,
				percentage: (count / stats.totalListings) * 100,
			};
		});

		setMarketStats(stats);
	};

	useEffect(() => {
		fetchMarketData();
	}, []);

	const filteredData = marketData.filter(item => {
		const matchesSearch =
			item.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
			item.model.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesManufacturer = filterManufacturer === 'all' || item.make === filterManufacturer;
		const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
		const matchesTrend = filterTrend === 'all' || item.priceTrend === filterTrend;
		return matchesSearch && matchesManufacturer && matchesCategory && matchesTrend;
	});

	const sortedData = [...filteredData].sort((a, b) => {
		let aValue: any = a[sortBy];
		let bValue: any = b[sortBy];

		if (sortBy === 'avgPrice' || sortBy === 'totalListings' || sortBy === 'avgDaysOnMarket') {
			aValue = aValue || 0;
			bValue = bValue || 0;
		}

		if (sortOrder === 'asc') {
			return aValue > bValue ? 1 : -1;
		} else {
			return aValue < bValue ? 1 : -1;
		}
	});

	const manufacturers = [...new Set(marketData.map(item => item.make))];
	const categories = [...new Set(marketData.map(item => item.category))];
	const trends = [...new Set(marketData.map(item => item.priceTrend))];

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	const getTrendIcon = (trend: string) => {
		switch (trend) {
			case 'RISING':
				return <TrendingUp className="h-4 w-4 text-green-600" />;
			case 'FALLING':
				return <TrendingDown className="h-4 w-4 text-red-600" />;
			case 'VOLATILE':
				return <Activity className="h-4 w-4 text-yellow-600" />;
			default:
				return <Target className="h-4 w-4 text-blue-600" />;
		}
	};

	const getTrendBadge = (trend: string) => {
		const trendConfig = {
			RISING: { label: 'Rising', variant: 'default' as const, color: 'text-green-600' },
			FALLING: { label: 'Falling', variant: 'destructive' as const, color: 'text-red-600' },
			STABLE: { label: 'Stable', variant: 'secondary' as const, color: 'text-blue-600' },
			VOLATILE: { label: 'Volatile', variant: 'outline' as const, color: 'text-yellow-600' },
		};
		const config = trendConfig[trend as keyof typeof trendConfig] || {
			label: trend,
			variant: 'outline' as const,
			color: 'text-gray-600',
		};
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const getMarketTrendBadge = (trend: string) => {
		const trendConfig = {
			HOT: { label: 'Hot', variant: 'default' as const, color: 'text-red-600' },
			WARM: { label: 'Warm', variant: 'secondary' as const, color: 'text-orange-600' },
			COOL: { label: 'Cool', variant: 'outline' as const, color: 'text-blue-600' },
			COLD: { label: 'Cold', variant: 'destructive' as const, color: 'text-gray-600' },
		};
		const config = trendConfig[trend as keyof typeof trendConfig] || {
			label: trend,
			variant: 'outline' as const,
			color: 'text-gray-600',
		};
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[50vh]">
				<LoadingSpinner variant="plane" size="lg" text="Loading Market Analysis..." />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
			>
				<div>
					<h2 className="text-3xl font-bold text-foreground">Market Analysis</h2>
					<p className="text-muted-foreground mt-2">
						Comprehensive aviation market intelligence and trends
					</p>
				</div>
				<div className="flex gap-2">
					<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
						<Button onClick={fetchMarketData} variant="outline" className="focus-ring">
							<RefreshCw className="h-4 w-4 mr-2" />
							Refresh Data
						</Button>
					</motion.div>
					<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
						<Button variant="outline" className="focus-ring">
							<Download className="h-4 w-4 mr-2" />
							Export Report
						</Button>
					</motion.div>
				</div>
			</motion.div>

			{/* Market Stats */}
			{marketStats && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.2 }}
					className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
				>
					<Card className="gradient-card hover-lift">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Total Listings
							</CardTitle>
							<BarChart3 className="h-4 w-4 text-primary" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{marketStats.totalListings.toLocaleString()}</div>
							<p className="text-xs text-muted-foreground">Active market listings</p>
						</CardContent>
					</Card>

					<Card className="gradient-card hover-lift">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Average Price
							</CardTitle>
							<DollarSign className="h-4 w-4 text-primary" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{formatCurrency(marketStats.avgPrice)}</div>
							<p className="text-xs text-muted-foreground">Market average</p>
						</CardContent>
					</Card>

					<Card className="gradient-card hover-lift">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Total Market Value
							</CardTitle>
							<TrendingUp className="h-4 w-4 text-primary" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{formatCurrency(marketStats.totalValue)}</div>
							<p className="text-xs text-muted-foreground">Combined value</p>
						</CardContent>
					</Card>

					<Card className="gradient-card hover-lift">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Avg Days on Market
							</CardTitle>
							<Calendar className="h-4 w-4 text-primary" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{Math.round(marketStats.avgDaysOnMarket)}</div>
							<p className="text-xs text-muted-foreground">Days to sell</p>
						</CardContent>
					</Card>
				</motion.div>
			)}

			{/* Top Manufacturers */}
			{marketStats && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="grid grid-cols-1 lg:grid-cols-2 gap-6"
				>
					<Card className="hover-lift">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Plane className="h-5 w-5" />
								Top Manufacturers
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{marketStats.topManufacturers.slice(0, 5).map((manufacturer, index) => (
									<motion.div
										key={manufacturer.manufacturer}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: index * 0.1 }}
										className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
									>
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
												<span className="text-sm font-bold text-primary">
													{manufacturer.manufacturer.charAt(0)}
												</span>
											</div>
											<div>
												<h4 className="font-semibold">{manufacturer.manufacturer}</h4>
												<p className="text-sm text-muted-foreground">
													{manufacturer.count} listings
												</p>
											</div>
										</div>
										<div className="text-right">
											<p className="font-semibold">{formatCurrency(manufacturer.avgPrice)}</p>
											<p className="text-xs text-muted-foreground">avg price</p>
										</div>
									</motion.div>
								))}
							</div>
						</CardContent>
					</Card>

					<Card className="hover-lift">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<BarChart3 className="h-5 w-5" />
								Price Distribution
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{marketStats.priceRanges.map((range, index) => (
									<motion.div
										key={range.range}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: index * 0.1 }}
										className="space-y-2"
									>
										<div className="flex justify-between text-sm">
											<span>{range.range}</span>
											<span className="font-semibold">
												{range.count} ({range.percentage.toFixed(1)}%)
											</span>
										</div>
										<div className="w-full bg-muted rounded-full h-2">
											<motion.div
												initial={{ width: 0 }}
												animate={{ width: `${range.percentage}%` }}
												transition={{ delay: index * 0.1 + 0.5, duration: 0.5 }}
												className="bg-primary h-2 rounded-full"
											/>
										</div>
									</motion.div>
								))}
							</div>
						</CardContent>
					</Card>
				</motion.div>
			)}

			{/* Filters */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.4 }}
				className="flex flex-col sm:flex-row gap-4"
			>
				<div className="relative flex-1">
					<BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by manufacturer or model..."
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
						className="pl-10 focus-ring"
					/>
				</div>
				<Select value={filterManufacturer} onValueChange={setFilterManufacturer}>
					<SelectTrigger className="w-[180px] focus-ring">
						<SelectValue placeholder="Manufacturer" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Manufacturers</SelectItem>
						{manufacturers.map(manufacturer => (
							<SelectItem key={manufacturer} value={manufacturer}>
								{manufacturer}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={filterCategory} onValueChange={setFilterCategory}>
					<SelectTrigger className="w-[180px] focus-ring">
						<SelectValue placeholder="Category" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Categories</SelectItem>
						{categories.map(category => (
							<SelectItem key={category} value={category}>
								{category}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={filterTrend} onValueChange={setFilterTrend}>
					<SelectTrigger className="w-[180px] focus-ring">
						<SelectValue placeholder="Price Trend" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Trends</SelectItem>
						{trends.map(trend => (
							<SelectItem key={trend} value={trend}>
								{trend}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={sortBy} onValueChange={value => setSortBy(value as keyof MarketData)}>
					<SelectTrigger className="w-[180px] focus-ring">
						<SelectValue placeholder="Sort by" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="dataDate">Date</SelectItem>
						<SelectItem value="avgPrice">Price</SelectItem>
						<SelectItem value="totalListings">Listings</SelectItem>
						<SelectItem value="avgDaysOnMarket">Days on Market</SelectItem>
					</SelectContent>
				</Select>
				<Button
					variant="outline"
					size="icon"
					onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
					className="focus-ring"
				>
					{sortOrder === 'asc' ? (
						<ArrowUp className="h-4 w-4" />
					) : (
						<ArrowDown className="h-4 w-4" />
					)}
				</Button>
			</motion.div>

			{/* Market Data Table */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.5 }}
			>
				<Card className="hover-lift">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TrendingUp className="h-5 w-5" />
							Market Data Analysis
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<AnimatePresence>
								{sortedData.length > 0 ? (
									sortedData.map((item, index) => (
										<motion.div
											key={item.id}
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, x: -20 }}
											transition={{ duration: 0.2, delay: index * 0.05 }}
											className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-all hover-lift"
										>
											<div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
												<div className="font-semibold text-foreground">
													{item.make} {item.model}
												</div>
												<div className="text-muted-foreground">Category: {item.category}</div>
												<div className="text-muted-foreground">Listings: {item.totalListings}</div>
												<div className="text-foreground font-bold">
													Avg: {formatCurrency(item.avgPrice)}
												</div>
												<div className="text-muted-foreground">
													Range: {formatCurrency(item.minPrice)} - {formatCurrency(item.maxPrice)}
												</div>
												<div className="text-muted-foreground">
													Days on Market: {item.avgDaysOnMarket}
												</div>
											</div>
											<div className="flex gap-2 mt-4 md:mt-0">
												{getTrendBadge(item.priceTrend)}
												{getMarketTrendBadge(item.marketTrend)}
											</div>
										</motion.div>
									))
								) : (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="text-center py-12 text-muted-foreground"
									>
										<BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
										<p className="text-lg">No market data available</p>
										<p className="text-sm">Generate market reports to load data.</p>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
}
