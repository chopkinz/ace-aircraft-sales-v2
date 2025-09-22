'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import Link from 'next/link';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { ExportDialog } from '@/components/ui/export-dialog';
import {
	RefreshCw,
	Plane,
	Users,
	DollarSign,
	TrendingUp,
	Database,
	FileText,
	Activity,
	ArrowUpRight,
	ArrowDownRight,
	Download,
} from 'lucide-react';
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
}

export function Dashboard() {
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState(false);

	const fetchStats = async () => {
		try {
			const response = await fetch('/api/dashboard/stats');
			const data = await response.json();
			if (data.success) {
				setStats(data.data);
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

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen pt-16">
				<LoadingSpinner variant="plane" size="lg" text="Loading Dashboard..." />
			</div>
		);
	}

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
	}: {
		title: string;
		value: string | number;
		subtitle: string;
		icon: React.ComponentType<{ className?: string }>;
		trend?: 'up' | 'down';
		trendValue?: string;
		helpContent?: string;
	}) => (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className="hover-lift"
		>
			<Card className="modern-card">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<div className="flex items-center gap-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
						{helpContent && <HelpTooltip content={helpContent} />}
					</div>
					<motion.div
						animate={{ rotate: [0, 10, -10, 0] }}
						transition={{ duration: 2, repeat: Infinity }}
					>
						<Icon className="h-4 w-4 text-primary" />
					</motion.div>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{value}</div>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						{trend && (
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className={`flex items-center gap-1 ${
									trend === 'up' ? 'text-green-600' : 'text-red-600'
								}`}
							>
								{trend === 'up' ? (
									<ArrowUpRight className="h-3 w-3" />
								) : (
									<ArrowDownRight className="h-3 w-3" />
								)}
								{trendValue}
							</motion.div>
						)}
						<span>{subtitle}</span>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
			<div className="container-responsive py-8 space-responsive">
				{/* Enhanced Header */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
				>
					<div className="space-y-3">
						<div className="flex items-center gap-3 flex-wrap">
							<h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
								ACE Aircraft Intelligence
							</h1>
							<HelpTooltip
								content="Your comprehensive aviation market intelligence platform. Track aircraft listings, analyze market trends, and make informed decisions with real-time data from JetNet."
								icon="info"
							/>
						</div>
						<p className="text-muted-foreground text-lg sm:text-xl text-responsive">
							Real-time aviation market intelligence platform
						</p>
						<div className="flex items-center gap-4 text-sm text-muted-foreground">
							<span className="flex items-center gap-2">
								<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
								Live Data
							</span>
							<span className="flex items-center gap-2">
								<Database className="w-4 h-4" />
								JetNet API
							</span>
						</div>
					</div>
					<div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
						<ExportDialog data={[]} dataType="aircraft">
							<motion.div
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="w-full sm:w-auto"
							>
								<Button variant="outline" className="focus-ring btn-touch w-full sm:w-auto">
									<Download className="h-4 w-4 mr-2" />
									Export Data
									<HelpTooltip
										content="Export aircraft data in CSV, Excel, or JSON format with custom field selection and filtering options."
										icon="help"
										className="ml-2"
										asButton={false}
									/>
								</Button>
							</motion.div>
						</ExportDialog>
						<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
							<Button
								onClick={syncWithJetNet}
								disabled={syncing}
								className="gradient-primary hover:opacity-90 transition-opacity focus-ring"
							>
								<RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
								{syncing ? 'Syncing...' : 'Sync with JetNet'}
								<HelpTooltip
									content="Sync with JetNet to get the latest aircraft data, market updates, and pricing information. This process may take a few minutes."
									icon="help"
									className="ml-2"
									asButton={false}
								/>
							</Button>
						</motion.div>
					</div>
				</motion.div>

				{/* Stats Grid */}
				{stats && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.2 }}
						className="grid-responsive"
					>
						<StatCard
							title="Total Aircraft"
							value={stats.totalAircraft.toLocaleString()}
							subtitle={`${stats.forSaleAircraft} available for sale`}
							icon={Plane}
							trend="up"
							trendValue="+12%"
							helpContent="Total number of aircraft in our database, including all aircraft regardless of sale status for comprehensive market analysis."
						/>
						<StatCard
							title="Total Value"
							value={formatCurrency(stats.totalValue)}
							subtitle={`Avg: ${formatCurrency(stats.averagePrice)}`}
							icon={DollarSign}
							trend="up"
							trendValue="+8%"
							helpContent="Total market value of all aircraft listings. Average price helps identify market trends and pricing patterns."
						/>
						<StatCard
							title="Active Users"
							value={stats.activeUsers}
							subtitle={`${stats.totalUsers} total users`}
							icon={Users}
							trend="up"
							trendValue="+5%"
							helpContent="Users currently active on the platform. Total users includes all registered accounts."
						/>
						<StatCard
							title="Sync Status"
							value={stats.jetnetApi ? 'Connected' : 'Disconnected'}
							subtitle={`Last sync: ${
								stats.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never'
							}`}
							icon={Database}
							helpContent="Connection status with JetNet API. Green indicates active connection with recent data sync."
						/>
					</motion.div>
				)}

				{/* Main Content Sections */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="space-y-8"
				>
					{/* Quick Access Cards */}
					<div className="grid-responsive">
						<Link href="/aircraft">
							<Card className="card-modern-mobile group cursor-pointer hover-modern">
								<CardHeader className="text-center space-y-4">
									<div className="mx-auto p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
										<Plane className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
									</div>
									<CardTitle className="text-lg sm:text-xl">Aircraft Database</CardTitle>
								</CardHeader>
								<CardContent className="text-center">
									<p className="text-muted-foreground text-sm sm:text-base">
										Browse and manage all aircraft listings with advanced filtering
									</p>
								</CardContent>
							</Card>
						</Link>

						<Link href="/market">
							<Card className="card-modern-mobile group cursor-pointer hover-modern">
								<CardHeader className="text-center space-y-4">
									<div className="mx-auto p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
										<TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
									</div>
									<CardTitle className="text-lg sm:text-xl">Market Analysis</CardTitle>
								</CardHeader>
								<CardContent className="text-center">
									<p className="text-muted-foreground text-sm sm:text-base">
										Comprehensive market insights and trend analysis
									</p>
								</CardContent>
							</Card>
						</Link>

						<Link href="/reports">
							<Card className="card-modern-mobile group cursor-pointer hover-modern">
								<CardHeader className="text-center space-y-4">
									<div className="mx-auto p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
										<FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
									</div>
									<CardTitle className="text-lg sm:text-xl">Analytics & Reports</CardTitle>
								</CardHeader>
								<CardContent className="text-center">
									<p className="text-muted-foreground text-sm sm:text-base">
										Generate detailed reports and analytics
									</p>
								</CardContent>
							</Card>
						</Link>

						<Link href="/activity">
							<Card className="card-modern-mobile group cursor-pointer hover-modern">
								<CardHeader className="text-center space-y-4">
									<div className="mx-auto p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
										<Activity className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
									</div>
									<CardTitle className="text-lg sm:text-xl">System Activity</CardTitle>
								</CardHeader>
								<CardContent className="text-center">
									<p className="text-muted-foreground text-sm sm:text-base">
										Monitor system activity and sync status
									</p>
								</CardContent>
							</Card>
						</Link>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
