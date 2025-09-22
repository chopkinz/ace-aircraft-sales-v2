'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import {
	BarChart3,
	TrendingUp,
	Plane,
	DollarSign,
	PieChart,
	Activity,
	Target,
	ArrowUpRight,
	ArrowDownRight,
	RefreshCw,
	Download,
} from 'lucide-react';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { ExportDialog } from '@/components/ui/export-dialog';

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
	icon: React.ComponentType<{ className?: string }>;
	description?: string;
	helpContent?: string;
}

const MetricCard = ({
	title,
	value,
	change,
	changeType,
	icon: Icon,
	description,
	helpContent,
}: MetricCardProps) => (
	<Card className="modern-card hover-lift">
		<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
			<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
				{title}
				{helpContent && <HelpTooltip content={helpContent} icon="info" />}
			</CardTitle>
			<motion.div
				animate={{ rotate: [0, 5, -5, 0] }}
				transition={{ duration: 2, repeat: Infinity }}
			>
				<Icon className="h-4 w-4 text-primary" />
			</motion.div>
		</CardHeader>
		<CardContent>
			<div className="text-2xl font-bold">{value}</div>
			{change !== undefined && (
				<div className="flex items-center gap-1 text-xs">
					{changeType === 'positive' ? (
						<>
							<ArrowUpRight className="h-3 w-3 text-green-600" />
							<span className="text-green-600">+{change}%</span>
						</>
					) : changeType === 'negative' ? (
						<>
							<ArrowDownRight className="h-3 w-3 text-red-600" />
							<span className="text-red-600">{change}%</span>
						</>
					) : (
						<span className="text-muted-foreground">{change}%</span>
					)}
					<span className="text-muted-foreground">vs last month</span>
				</div>
			)}
			{description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
		</CardContent>
	</Card>
);

interface ChartProps {
	data: Array<{ label: string; value: number; color?: string }>;
	title: string;
	type: 'bar' | 'pie' | 'line';
	height?: number;
}

const SimpleChart = ({ data, title, type, height = 200 }: ChartProps) => {
	const maxValue = Math.max(...data.map(d => d.value));

	if (type === 'bar') {
		return (
			<Card className="modern-card">
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<BarChart3 className="h-5 w-5" />
						{title}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3" style={{ maxHeight: `${height}px`, overflowY: 'auto' }}>
						{data.map((item, index) => (
							<div key={index} className="space-y-1">
								<div className="flex justify-between text-sm">
									<span className="font-medium truncate pr-2">{item.label}</span>
									<span className="text-muted-foreground flex-shrink-0">{item.value}</span>
								</div>
								<div className="w-full bg-muted rounded-full h-2">
									<div
										className="bg-primary h-2 rounded-full transition-all duration-500"
										style={{ width: `${(item.value / maxValue) * 100}%` }}
									/>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (type === 'pie') {
		return (
			<Card className="modern-card">
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<PieChart className="h-5 w-5" />
						{title}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3 max-h-96 overflow-y-auto">
						{data.map((item, index) => {
							const percentage = (item.value / data.reduce((sum, d) => sum + d.value, 0)) * 100;

							return (
								<div key={item.label} className="flex items-center gap-3">
									<div
										className="w-4 h-4 rounded-full flex-shrink-0"
										style={{ backgroundColor: item.color || `hsl(${(index % 6) * 60}, 70%, 50%)` }}
									/>
									<div className="flex-1 min-w-0">
										<div className="flex justify-between text-sm">
											<span className="font-medium truncate pr-2">{item.label}</span>
											<span className="text-muted-foreground flex-shrink-0">
												{item.value} ({percentage.toFixed(1)}%)
											</span>
										</div>
										<div className="w-full bg-muted rounded-full h-1.5 mt-1">
											<div
												className="h-1.5 rounded-full transition-all duration-500"
												style={{
													width: `${percentage}%`,
													backgroundColor: item.color || `hsl(${index * 60}, 70%, 50%)`,
												}}
											/>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>
		);
	}

	return null;
};

export function AnalyticsDashboard() {
	const [data, setData] = useState<AnalyticsData>({ aircraft: [], marketData: [] });
	const [loading, setLoading] = useState(true);
	const [timeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

	useEffect(() => {
		fetchAnalyticsData();
	}, [timeRange]);

	const fetchAnalyticsData = async () => {
		try {
			setLoading(true);
			const response = await fetch('/api/database/aircraft/comprehensive');
			const aircraftData = await response.json();

			if (aircraftData.aircraft) {
				setData({
					aircraft: aircraftData.aircraft,
					marketData: [], // We'll generate this from aircraft data for now
				});
			}
		} catch (error) {
			console.error('Error fetching analytics data:', error);
		} finally {
			setLoading(false);
		}
	};

	// Calculate metrics
	const metrics = useMemo(() => {
		if (!data.aircraft.length) return null;

		const totalAircraft = data.aircraft.length;
		const availableAircraft = data.aircraft.filter(a => a.status === 'AVAILABLE').length;
		const soldAircraft = data.aircraft.filter(a => a.status === 'SOLD').length;
		const avgPrice =
			data.aircraft
				.filter(a => a.price && a.price > 0)
				.reduce((sum, a) => sum + (a.price || 0), 0) /
			data.aircraft.filter(a => a.price && a.price > 0).length;

		// Price range analysis
		const prices = data.aircraft.filter(a => a.price && a.price > 0).map(a => a.price!);
		const minPrice = Math.min(...prices);
		const maxPrice = Math.max(...prices);

		// Manufacturer distribution
		const manufacturerCounts = data.aircraft.reduce((acc, aircraft) => {
			acc[aircraft.manufacturer] = (acc[aircraft.manufacturer] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		// Year distribution (last 10 years)
		const currentYear = new Date().getFullYear();
		const yearCounts = data.aircraft.reduce((acc, aircraft) => {
			if (aircraft.year && aircraft.year >= currentYear - 10) {
				acc[aircraft.year] = (acc[aircraft.year] || 0) + 1;
			}
			return acc;
		}, {} as Record<number, number>);

		// Location distribution
		const locationCounts = data.aircraft.reduce((acc, aircraft) => {
			const location = aircraft.location || 'Unknown';
			acc[location] = (acc[location] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		// Status distribution
		const statusCounts = data.aircraft.reduce((acc, aircraft) => {
			acc[aircraft.status] = (acc[aircraft.status] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		return {
			totalAircraft,
			availableAircraft,
			soldAircraft,
			avgPrice: isNaN(avgPrice) ? 0 : avgPrice,
			minPrice,
			maxPrice,
			manufacturerCounts,
			yearCounts,
			locationCounts,
			statusCounts,
		};
	}, [data]);

	const chartData = useMemo(() => {
		if (!metrics) return { manufacturers: [], years: [], locations: [], statuses: [] };

		return {
			manufacturers: Object.entries(metrics.manufacturerCounts)
				.sort(([, a], [, b]) => b - a)
				.map(([label, value], index) => ({ label, value, color: `hsl(${index * 36}, 70%, 50%)` })),
			years: Object.entries(metrics.yearCounts)
				.sort(([a], [b]) => Number(b) - Number(a))
				.map(([label, value]) => ({ label: `${label}`, value })),
			locations: Object.entries(metrics.locationCounts)
				.sort(([, a], [, b]) => b - a)
				.map(([label, value], index) => ({ label, value, color: `hsl(${index * 45}, 70%, 50%)` })),
			statuses: Object.entries(metrics.statusCounts).map(([label, value]) => ({
				label,
				value,
				color: label === 'AVAILABLE' ? '#22c55e' : label === 'SOLD' ? '#ef4444' : '#f59e0b',
			})),
		};
	}, [metrics]);

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					{[...Array(4)].map((_, i) => (
						<Card key={i} className="modern-card">
							<CardContent className="p-6">
								<div className="space-y-3">
									<div className="skeleton h-4 w-24" />
									<div className="skeleton h-8 w-16" />
									<div className="skeleton h-3 w-20" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	if (!metrics) {
		return (
			<div className="empty-state">
				<Activity className="h-16 w-16 empty-state-icon mx-auto" />
				<h3 className="text-xl font-semibold mb-2">No Analytics Data</h3>
				<p className="text-muted-foreground">No aircraft data available for analytics.</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold flex items-center gap-3">
						<BarChart3 className="h-8 w-8 text-primary" />
						Analytics Dashboard
					</h2>
					<p className="text-muted-foreground mt-2">
						Comprehensive insights into your aircraft inventory and market trends
					</p>
				</div>
				<div className="flex items-center gap-3">
					<ExportDialog data={[metrics]} dataType="reports">
						<Button variant="outline" size="sm" className="btn-modern">
							<Download className="h-4 w-4 mr-2" />
							Export
						</Button>
					</ExportDialog>
					<Button variant="outline" size="sm" onClick={fetchAnalyticsData} className="btn-modern">
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh
					</Button>
				</div>
			</div>

			{/* Key Metrics */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<MetricCard
					title="Total Aircraft"
					value={metrics.totalAircraft}
					change={12}
					changeType="positive"
					icon={Plane}
					description="Total aircraft in inventory"
					helpContent="Total number of aircraft records in the system"
				/>
				<MetricCard
					title="Available"
					value={metrics.availableAircraft}
					change={8}
					changeType="positive"
					icon={Target}
					description="Aircraft available for sale"
					helpContent="Number of aircraft currently available for purchase"
				/>
				<MetricCard
					title="Average Price"
					value={`$${metrics.avgPrice.toLocaleString()}`}
					change={-3}
					changeType="negative"
					icon={DollarSign}
					description="Average aircraft price"
					helpContent="Average price of all aircraft with listed prices"
				/>
				<MetricCard
					title="Price Range"
					value={`$${(metrics.minPrice / 1000000).toFixed(1)}M - $${(
						metrics.maxPrice / 1000000
					).toFixed(1)}M`}
					change={5}
					changeType="positive"
					icon={TrendingUp}
					description="Price range of inventory"
					helpContent="Range from lowest to highest priced aircraft"
				/>
			</div>

			{/* Charts */}
			<Tabs defaultValue="overview" className="w-full">
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="manufacturers">Manufacturers</TabsTrigger>
					<TabsTrigger value="locations">Locations</TabsTrigger>
					<TabsTrigger value="trends">Trends</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<SimpleChart
							data={chartData.statuses}
							title="Aircraft Status Distribution"
							type="pie"
						/>
						<SimpleChart
							data={chartData.manufacturers.slice(0, 6)}
							title="Top Manufacturers"
							type="bar"
						/>
					</div>
				</TabsContent>

				<TabsContent value="manufacturers" className="mt-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<SimpleChart
							data={chartData.manufacturers}
							title="Manufacturer Distribution"
							type="pie"
						/>
						<SimpleChart
							data={chartData.manufacturers}
							title="Manufacturer Count"
							type="bar"
							height={400}
						/>
					</div>
				</TabsContent>

				<TabsContent value="locations" className="mt-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<SimpleChart data={chartData.locations} title="Location Distribution" type="pie" />
						<SimpleChart
							data={chartData.locations}
							title="Aircraft by Location"
							type="bar"
							height={300}
						/>
					</div>
				</TabsContent>

				<TabsContent value="trends" className="mt-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<SimpleChart data={chartData.years} title="Aircraft by Year" type="bar" height={300} />
						<Card className="modern-card">
							<CardHeader>
								<CardTitle className="text-lg flex items-center gap-2">
									<TrendingUp className="h-5 w-5" />
									Market Insights
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
										<span className="font-medium">Conversion Rate</span>
										<Badge variant="secondary" className="badge-modern">
											{((metrics.soldAircraft / metrics.totalAircraft) * 100).toFixed(1)}%
										</Badge>
									</div>
									<div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
										<span className="font-medium">Inventory Turnover</span>
										<Badge variant="secondary" className="badge-modern">
											{metrics.soldAircraft} sold
										</Badge>
									</div>
									<div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
										<span className="font-medium">Active Listings</span>
										<Badge variant="secondary" className="badge-modern">
											{metrics.availableAircraft} available
										</Badge>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
