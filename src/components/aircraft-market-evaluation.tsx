'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
	Plane,
	Search,
	Filter,
	Download,
	RefreshCw,
	Eye,
	BarChart3,
	Table,
	Calendar,
	FileText,
	Clock,
	MapPin,
	Settings,
	DollarSign,
	Wrench,
	ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading';
import { AdvancedDataTable } from '@/components/ui/advanced-data-table';
import { ExportDialog } from '@/components/ui/export-dialog';
import {
	SpecificationsFormatter,
	FeaturesFormatter,
	MarketDataFormatter,
	MaintenanceFormatter,
	ContactFormatter,
	OwnershipFormatter,
} from '@/components/ui/data-formatter';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface Aircraft {
	id: string;
	manufacturer: string;
	model: string;
	variant?: string;
	year?: number;
	yearManufactured?: number;
	price?: number;
	askingPrice?: number;
	currency?: string;
	location?: string;
	status: string;
	registration?: string;
	serialNumber?: string;
	aircraftId?: number;
	totalTimeHours?: number;
	engineHours?: number;
	image?: string;
	description?: string;
	forSale?: boolean;
	dateListed?: string;
	createdAt?: string;
	lastUpdated?: string;
	specifications?: Record<string, unknown>;
	features?: Record<string, unknown>;
	marketData?: Record<string, unknown>;
	maintenanceData?: Record<string, unknown>;
	contactInfo?: Record<string, unknown>;
	ownershipData?: Record<string, unknown>;
	images?: Array<{ url: string; caption?: string }>;
}

export function AircraftMarketEvaluation() {
	const [aircraft, setAircraft] = useState<Aircraft[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterManufacturer, setFilterManufacturer] = useState('all');
	const [filterStatus, setFilterStatus] = useState('all');
	const [sortBy, setSortBy] = useState('createdAt');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
	const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(50);
	const [totalItems, setTotalItems] = useState(0);
	const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isGeneratingReport, setIsGeneratingReport] = useState(false);
	const [stats, setStats] = useState<Record<string, unknown>>({});
	const [generatedReports, setGeneratedReports] = useState<
		Array<{
			id: string;
			title: string;
			type: string;
			status: string;
			generatedAt: string;
			createdAt: string;
			data?: unknown;
		}>
	>([]);
	const [selectedReport, setSelectedReport] = useState<{
		id: string;
		title: string;
		type: string;
		status: string;
		generatedAt: string;
		createdAt: string;
		data?: unknown;
	} | null>(null);
	const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
	const [reportLoading, setReportLoading] = useState(false);

	// Generate dynamic columns
	const columns = useMemo(() => {
		// Table columns configuration
		const tableColumns = {
			manufacturer: {
				header: 'Manufacturer',
				type: 'text' as const,
				sortable: true,
				filterable: true,
			},
			model: { header: 'Model', type: 'text' as const, sortable: true, filterable: true },
			year: { header: 'Year', type: 'number' as const, sortable: true, filterable: true },
			registration: {
				header: 'Registration',
				type: 'text' as const,
				sortable: true,
				filterable: true,
			},
			price: { header: 'Price', type: 'currency' as const, sortable: true, filterable: true },
			askingPrice: {
				header: 'Asking Price',
				type: 'currency' as const,
				sortable: true,
				filterable: true,
			},
			location: { header: 'Location', type: 'text' as const, sortable: true, filterable: true },
			status: {
				header: 'Status',
				type: 'text' as const,
				sortable: true,
				filterable: true,
				render: (status: string) => {
					const statusConfig = {
						AVAILABLE: { label: 'Available', variant: 'default' as const },
						SOLD: { label: 'Sold', variant: 'secondary' as const },
						UNDER_CONTRACT: { label: 'Under Contract', variant: 'outline' as const },
						MAINTENANCE: { label: 'Maintenance', variant: 'destructive' as const },
					};
					const config = statusConfig[status as keyof typeof statusConfig] || {
						label: status,
						variant: 'outline' as const,
					};
					return (
						<Badge variant={config.variant} className="text-xs">
							{config.label}
						</Badge>
					);
				},
			},
			totalTimeHours: {
				header: 'Total Hours',
				type: 'number' as const,
				sortable: true,
				filterable: true,
			},
			createdAt: { header: 'Listed Date', type: 'date' as const, sortable: true, filterable: true },
			aircraftId: {
				header: 'Aircraft ID',
				type: 'number' as const,
				sortable: true,
				filterable: true,
			},
			serialNumber: {
				header: 'Serial Number',
				type: 'text' as const,
				sortable: true,
				filterable: true,
			},
			variant: { header: 'Variant', type: 'text' as const, sortable: true, filterable: true },
			yearManufactured: {
				header: 'Year Manufactured',
				type: 'number' as const,
				sortable: true,
				filterable: true,
			},
			currency: { header: 'Currency', type: 'text' as const, sortable: true, filterable: true },
			image: { header: 'Image', type: 'url' as const, sortable: false, filterable: false },
			description: {
				header: 'Description',
				type: 'text' as const,
				sortable: false,
				filterable: true,
			},
			specifications: {
				header: 'Specifications',
				type: 'text' as const,
				sortable: false,
				filterable: false,
			},
			features: { header: 'Features', type: 'text' as const, sortable: false, filterable: false },
			contactInfo: {
				header: 'Contact Info',
				type: 'text' as const,
				sortable: false,
				filterable: false,
			},
			marketData: {
				header: 'Market Data',
				type: 'text' as const,
				sortable: false,
				filterable: false,
			},
			enrichment: {
				header: 'Enrichment',
				type: 'text' as const,
				sortable: false,
				filterable: false,
			},
			lastUpdated: {
				header: 'Last Updated',
				type: 'date' as const,
				sortable: true,
				filterable: true,
			},
		};

		return Object.keys(tableColumns).map(key => {
			const column = tableColumns[key as keyof typeof tableColumns];
			return {
				key,
				header: column.header,
				type: column.type,
				sortable: column.sortable,
				filterable: column.filterable,
				render: 'render' in column ? column.render : undefined,
				id: key,
				accessorKey: key,
			};
		});
	}, []);

	// Fetch aircraft data
	useEffect(() => {
		const fetchAircraft = async () => {
			try {
				setLoading(true);
				const params = new URLSearchParams({
					page: currentPage.toString(),
					limit: itemsPerPage.toString(),
					sortBy,
					sortOrder,
					...(searchTerm && { search: searchTerm }),
					...(filterManufacturer !== 'all' && { manufacturer: filterManufacturer }),
					...(filterStatus !== 'all' && { status: filterStatus }),
				});

				const response = await fetch(`/api/database/aircraft/comprehensive?${params}`);
				if (!response.ok) {
					throw new Error('Failed to fetch aircraft data');
				}
				const data = await response.json();
				setAircraft(data.aircraft || []);
				setStats(data.stats || {});
				setTotalItems(data.pagination?.total || 0);
			} catch (error) {
				console.error('Error fetching aircraft:', error);
				toast.error('Failed to fetch aircraft data');
			} finally {
				setLoading(false);
			}
		};

		fetchAircraft();
	}, [currentPage, itemsPerPage, sortBy, sortOrder, searchTerm, filterManufacturer, filterStatus]);

	// Fetch generated reports
	useEffect(() => {
		const fetchReports = async () => {
			try {
				setReportLoading(true);
				const response = await fetch('/api/database/reports');
				if (response.ok) {
					const data = await response.json();
					setGeneratedReports(data.reports || []);
				}
			} catch (error) {
				console.error('Error fetching reports:', error);
			} finally {
				setReportLoading(false);
			}
		};

		fetchReports();
	}, []);

	// Generate market report
	const generateReport = async () => {
		try {
			setIsGeneratingReport(true);
			const response = await fetch('/api/reports/generate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					type: 'market-evaluation',
					aircraftIds: aircraft.map(a => a.id),
				}),
			});

			if (response.ok) {
				const result = await response.json();
				toast.success('Market report generated successfully' + result.report.id);

				// Refresh reports list
				const reportsResponse = await fetch('/api/database/reports');
				if (reportsResponse.ok) {
					const reportsData = await reportsResponse.json();
					setGeneratedReports(reportsData.reports || []);
				}
			} else {
				toast.error('Failed to generate market report');
			}
		} catch (error) {
			console.error('Error generating market report:', error);
			toast.error('Failed to generate market report');
		} finally {
			setIsGeneratingReport(false);
		}
	};

	// Export data
	const exportData = async () => {
		try {
			const response = await fetch('/api/database/export?format=csv&table=aircraft');
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `aircraft-market-data-${new Date().toISOString().split('T')[0]}.csv`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
			toast.success('Data exported successfully');
		} catch (error) {
			console.error('Error exporting data:', error);
			toast.error('Failed to export data');
		}
	};

	// Download report
	const downloadReport = async (
		reportId: string,
		format: 'pdf' | 'excel' | 'csv' | 'html' = 'pdf'
	) => {
		try {
			const response = await fetch(`/api/reports/download/${reportId}?format=${format}`);
			if (response.ok) {
				if (format === 'html') {
					// For HTML, open in new tab
					const blob = await response.blob();
					const url = window.URL.createObjectURL(blob);
					window.open(url, '_blank');
					toast.success('HTML report opened in new tab');
				} else {
					// For other formats, download file
					const blob = await response.blob();
					const url = window.URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = `aircraft-report-${reportId}-${
						new Date().toISOString().split('T')[0]
					}.${format}`;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					window.URL.revokeObjectURL(url);
					toast.success(`Report downloaded as ${format.toUpperCase()}`);
				}
			} else {
				toast.error('Failed to download report');
			}
		} catch (error) {
			console.error('Error downloading report:', error);
			toast.error('Failed to download report');
		}
	};

	// View report
	const viewReport = async (reportId: string) => {
		try {
			const response = await fetch(`/api/reports/${reportId}`);
			if (response.ok) {
				const report = await response.json();
				setSelectedReport(report);
				setIsReportDialogOpen(true);
			} else {
				toast.error('Failed to load report');
			}
		} catch (error) {
			console.error('Error loading report:', error);
			toast.error('Failed to load report');
		}
	};

	// Filter and sort aircraft
	const filteredAndSortedAircraft = useMemo(() => {
		const filtered = aircraft.filter(aircraft => {
			const matchesSearch =
				aircraft.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
				aircraft.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
				aircraft.registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				aircraft.location?.toLowerCase().includes(searchTerm.toLowerCase());

			const matchesManufacturer =
				filterManufacturer === 'all' || aircraft.manufacturer === filterManufacturer;

			const matchesStatus = filterStatus === 'all' || aircraft.status === filterStatus;

			return matchesSearch && matchesManufacturer && matchesStatus;
		});

		// Sort aircraft
		filtered.sort((a, b) => {
			let aValue: number | string = 0;
			let bValue: number | string = 0;

			if (sortBy === 'price') {
				aValue = a.price || 0;
				bValue = b.price || 0;
			} else if (
				sortBy === 'year' ||
				sortBy === 'yearManufactured' ||
				sortBy === 'totalTimeHours' ||
				sortBy === 'aircraftId'
			) {
				aValue = (a[sortBy as keyof Aircraft] as number) || 0;
				bValue = (b[sortBy as keyof Aircraft] as number) || 0;
			} else {
				aValue = (a[sortBy as keyof Aircraft] as string) || '';
				bValue = (b[sortBy as keyof Aircraft] as string) || '';
			}

			if (sortOrder === 'asc') {
				return aValue > bValue ? 1 : -1;
			} else {
				return aValue < bValue ? 1 : -1;
			}
		});

		return filtered;
	}, [aircraft, searchTerm, filterManufacturer, filterStatus, sortBy, sortOrder]);

	// Get unique manufacturers and statuses
	const manufacturers = [...new Set(aircraft.map(a => a.manufacturer))];
	const statuses = [...new Set(aircraft.map(a => a.status))];

	// Status badge helper
	const getStatusBadge = (status: string) => {
		const statusConfig = {
			AVAILABLE: { label: 'Available', variant: 'default' as const },
			SOLD: { label: 'Sold', variant: 'secondary' as const },
			UNDER_CONTRACT: { label: 'Under Contract', variant: 'outline' as const },
			MAINTENANCE: { label: 'Maintenance', variant: 'destructive' as const },
		};
		const config = statusConfig[status as keyof typeof statusConfig] || {
			label: status,
			variant: 'outline' as const,
		};
		return (
			<Badge variant={config.variant} className="text-xs">
				{config.label}
			</Badge>
		);
	};

	// Format currency
	const formatCurrency = (amount: number, currency = 'USD') => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<LoadingSpinner variant="plane" size="lg" text="Loading Aircraft Data..." />
			</div>
		);
	}

	return (
		<div className="space-y-6 p-4 sm:p-6 lg:p-8">
			{/* Header */}
			<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
				<div className="space-y-3">
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
						Aircraft Market Evaluation
					</h2>
					<p className="text-muted-foreground text-lg">
						Comprehensive aircraft inventory and market analysis
					</p>
					<div className="flex items-center gap-4 text-sm text-muted-foreground">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
							<span>{totalItems} Aircraft Available</span>
						</div>
						<div className="flex items-center gap-2">
							<DollarSign className="h-4 w-4" />
							<span>${((stats.totalValue as number) || 0).toLocaleString()}</span>
						</div>
					</div>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button
						onClick={generateReport}
						disabled={isGeneratingReport}
						variant="outline"
						className="hover:bg-accent/50 transition-all duration-200 border-border/50"
					>
						<BarChart3 className="h-4 w-4 mr-2" />
						{isGeneratingReport ? 'Generating...' : 'Generate Report'}
					</Button>
					<Button
						onClick={exportData}
						variant="outline"
						className="hover:bg-accent/50 transition-all duration-200 border-border/50"
					>
						<Download className="h-4 w-4 mr-2" />
						Export Data
					</Button>
					<Button
						onClick={() => window.location.reload()}
						variant="outline"
						className="hover:bg-accent/50 transition-all duration-200 border-border/50"
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh
					</Button>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<Card className="bg-gradient-to-br from-background/50 to-background/30 border-border/50 hover:shadow-lg transition-all duration-300">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Total Aircraft
						</CardTitle>
						<Plane className="h-4 w-4 text-primary" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalItems}</div>
						<p className="text-xs text-muted-foreground">Available listings</p>
					</CardContent>
				</Card>

				<Card className="bg-gradient-to-br from-background/50 to-background/30 border-border/50 hover:shadow-lg transition-all duration-300">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
						<DollarSign className="h-4 w-4 text-primary" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{formatCurrency(aircraft.reduce((sum, a) => sum + (a.price || 0), 0))}
						</div>
						<p className="text-xs text-muted-foreground">
							Avg:{' '}
							{formatCurrency(
								aircraft.reduce((sum, a) => sum + (a.price || 0), 0) / aircraft.length
							)}
						</p>
					</CardContent>
				</Card>

				<Card className="bg-gradient-to-br from-background/50 to-background/30 border-border/50 hover:shadow-lg transition-all duration-300">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Manufacturers
						</CardTitle>
						<Settings className="h-4 w-4 text-primary" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{manufacturers.length}</div>
						<p className="text-xs text-muted-foreground">
							{manufacturers.slice(0, 3).join(', ')}
							{manufacturers.length > 3 && '...'}
						</p>
					</CardContent>
				</Card>

				<Card className="bg-gradient-to-br from-background/50 to-background/30 border-border/50 hover:shadow-lg transition-all duration-300">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Data Quality
						</CardTitle>
						<Wrench className="h-4 w-4 text-primary" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{Math.round(
								(aircraft.filter(a => a.specifications || a.features || a.marketData).length /
									aircraft.length) *
									100
							)}
							%
						</div>
						<p className="text-xs text-muted-foreground">enriched data</p>
					</CardContent>
				</Card>
			</div>

			{/* Generated Reports Section */}
			<Card className="bg-gradient-to-br from-background/50 to-background/30 border-border/50 hover:shadow-lg transition-all duration-300">
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<BarChart3 className="h-5 w-5" />
							Generated Reports ({generatedReports.length})
						</div>
						<div className="flex gap-2">
							<Button
								onClick={generateReport}
								disabled={isGeneratingReport}
								variant="default"
								className="focus-ring"
							>
								<BarChart3 className="h-4 w-4 mr-2" />
								{isGeneratingReport ? 'Generating...' : 'Generate New Report'}
							</Button>
							<Button
								onClick={() => {
									const fetchReports = async () => {
										try {
											setReportLoading(true);
											const response = await fetch('/api/database/reports');
											if (response.ok) {
												const data = await response.json();
												setGeneratedReports(data.reports || []);
											}
										} catch (error) {
											console.error('Error fetching reports:', error);
										} finally {
											setReportLoading(false);
										}
									};
									fetchReports();
								}}
								variant="outline"
								className="focus-ring"
							>
								<RefreshCw className="h-4 w-4 mr-2" />
								Refresh
							</Button>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{reportLoading ? (
						<div className="flex items-center justify-center py-8">
							<LoadingSpinner variant="plane" size="lg" text="Loading Reports..." />
						</div>
					) : generatedReports.length > 0 ? (
						<div className="space-y-4">
							{generatedReports.map(report => (
								<div
									key={report.id}
									className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card hover:shadow-md transition-all duration-200"
								>
									<div className="flex items-center gap-4">
										<div className="p-2 rounded-lg bg-primary/10">
											<FileText className="h-5 w-5 text-primary" />
										</div>
										<div>
											<h3 className="font-semibold text-foreground">
												{report.title || 'Market Evaluation Report'}
											</h3>
											<div className="flex items-center gap-4 text-sm text-muted-foreground">
												<span>Type: {report.type || 'market-evaluation'}</span>
												<span>
													Generated:{' '}
													{new Date(report.generatedAt || report.createdAt).toLocaleDateString()}
												</span>
												<span>Status: {report.status || 'Completed'}</span>
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => viewReport(report.id)}
											className="focus-ring"
										>
											<Eye className="h-4 w-4 mr-2" />
											View
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => downloadReport(report.id, 'pdf')}
											className="focus-ring"
										>
											<Download className="h-4 w-4 mr-2" />
											PDF
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => downloadReport(report.id, 'excel')}
											className="focus-ring"
										>
											<Download className="h-4 w-4 mr-2" />
											Excel
										</Button>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-12 text-muted-foreground">
							<BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p className="text-lg">No reports generated yet</p>
							<p className="text-sm">Generate your first market evaluation report to get started</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Filters */}
			<Card className="bg-gradient-to-br from-background/50 to-background/30 border-border/50 hover:shadow-lg transition-all duration-300">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-5 w-5" />
						Search & Filters
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="space-y-2">
							<Label htmlFor="search" className="text-sm font-medium">
								Search
							</Label>
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									id="search"
									placeholder="Search aircraft..."
									value={searchTerm}
									onChange={e => setSearchTerm(e.target.value)}
									className="pl-10"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="manufacturer" className="text-sm font-medium">
								Manufacturer
							</Label>
							<Select value={filterManufacturer} onValueChange={setFilterManufacturer}>
								<SelectTrigger className="">
									<SelectValue placeholder="Filter by manufacturer" />
								</SelectTrigger>
								<SelectContent className="">
									<SelectItem value="all" className="">
										All manufacturers
									</SelectItem>
									{manufacturers.map(manufacturer => (
										<SelectItem key={manufacturer} value={manufacturer} className="">
											{manufacturer}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="status" className="text-sm font-medium">
								Status
							</Label>
							<Select value={filterStatus} onValueChange={setFilterStatus}>
								<SelectTrigger className="">
									<SelectValue placeholder="Filter by status" />
								</SelectTrigger>
								<SelectContent className="">
									<SelectItem value="all" className="">
										All statuses
									</SelectItem>
									{statuses.map(status => (
										<SelectItem key={status} value={status} className="">
											{status}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="sort" className="text-sm font-medium">
								Sort By
							</Label>
							<Select value={sortBy} onValueChange={setSortBy}>
								<SelectTrigger className="">
									<SelectValue placeholder="Sort by" />
								</SelectTrigger>
								<SelectContent className="">
									<SelectItem value="createdAt" className="">
										Date Added
									</SelectItem>
									<SelectItem value="price" className="">
										Price
									</SelectItem>
									<SelectItem value="year" className="">
										Year
									</SelectItem>
									<SelectItem value="manufacturer" className="">
										Manufacturer
									</SelectItem>
									<SelectItem value="model" className="">
										Model
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Aircraft List */}
			<Card className="bg-gradient-to-br from-background/50 to-background/30 border-border/50 hover:shadow-lg transition-all duration-300">
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Plane className="h-5 w-5" />
							Aircraft Inventory ({filteredAndSortedAircraft.length})
						</div>
						<div className="flex items-center gap-2">
							<div className="flex items-center border rounded-lg">
								<Button
									variant={viewMode === 'cards' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setViewMode('cards')}
									className={`rounded-r-none ${
										viewMode === 'cards'
											? 'bg-primary text-primary-foreground hover:bg-primary/90'
											: ''
									}`}
								>
									<Plane className="h-4 w-4 mr-1" />
									Cards
								</Button>
								<Button
									variant={viewMode === 'table' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setViewMode('table')}
									className={`rounded-l-none ${
										viewMode === 'table'
											? 'bg-primary text-primary-foreground hover:bg-primary/90'
											: ''
									}`}
								>
									<Table className="h-4 w-4 mr-1" />
									Table
								</Button>
							</div>
							<ExportDialog
								data={filteredAndSortedAircraft as unknown as Record<string, unknown>[]}
								dataType="aircraft"
							>
								<Button variant="outline" size="sm" className="">
									<Download className="h-4 w-4 mr-2" />
									Export
								</Button>
							</ExportDialog>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
								className=""
							>
								{sortOrder === 'asc' ? '↑' : '↓'} {sortBy}
							</Button>
						</div>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{filteredAndSortedAircraft.length > 0 ? (
						viewMode === 'table' ? (
							<AdvancedDataTable
								data={filteredAndSortedAircraft as unknown as Record<string, unknown>[]}
								columns={columns}
								title="Aircraft Data"
								onRowClick={row => {
									setSelectedAircraft(row as unknown as Aircraft);
									setIsDialogOpen(true);
								}}
								enableExport={true}
								enableColumnVisibility={true}
								enableSorting={true}
								enableFiltering={true}
								enablePagination={true}
								pageSize={25}
								className="border-0 shadow-none"
							/>
						) : (
							<div className="space-y-4">
								{filteredAndSortedAircraft.map(aircraft => (
									<div
										key={aircraft.id}
										className="group relative flex items-center justify-between p-6 rounded-xl border bg-card/50 hover:bg-card hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02]"
										onClick={() => {
											setSelectedAircraft(aircraft);
											setIsDialogOpen(true);
										}}
									>
										<div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

										<div className="relative flex items-center gap-6 flex-1">
											<div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center overflow-hidden">
												{aircraft.image ? (
													<Image
														src={aircraft.image}
														className="w-full h-full object-cover rounded-xl"
														alt={`${aircraft.manufacturer} ${aircraft.model}`}
													/>
												) : null}
												<div
													className={`w-full h-full items-center justify-center ${
														aircraft.image ? 'hidden' : 'flex'
													}`}
												>
													<Plane className="h-8 w-8 text-primary" />
												</div>
												{aircraft.forSale && (
													<div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
														<span className="text-xs text-white font-bold">$</span>
													</div>
												)}
											</div>

											<div className="flex-1 space-y-3">
												<div className="flex items-center gap-3">
													<h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
														{aircraft.manufacturer} {aircraft.model}
													</h3>
													{aircraft.variant && (
														<Badge variant="outline" className="text-xs">
															{aircraft.variant}
														</Badge>
													)}
													{getStatusBadge(aircraft.status)}
												</div>

												<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
													<div className="flex items-center gap-2">
														<Calendar className="h-4 w-4 text-muted-foreground" />
														<span className="font-medium">{aircraft.year || 'N/A'}</span>
													</div>
													<div className="flex items-center gap-2">
														<FileText className="h-4 w-4 text-muted-foreground" />
														<span className="font-mono text-xs">
															{aircraft.registration || 'N/A'}
														</span>
													</div>
													<div className="flex items-center gap-2">
														<Clock className="h-4 w-4 text-muted-foreground" />
														<span>{aircraft.totalTimeHours?.toLocaleString() || 'N/A'} hrs</span>
													</div>
													<div className="flex items-center gap-2">
														<MapPin className="h-4 w-4 text-muted-foreground" />
														<span className="truncate">{aircraft.location || 'N/A'}</span>
													</div>
												</div>

												<div className="flex items-center gap-4">
													<div className="flex items-center gap-2">
														<span className="text-xl font-bold text-green-600 dark:text-green-400">
															{aircraft.price ? formatCurrency(aircraft.price) : 'Price TBD'}
														</span>
													</div>
													{aircraft.askingPrice && aircraft.askingPrice !== aircraft.price && (
														<div className="text-sm text-muted-foreground">
															Asking: {formatCurrency(aircraft.askingPrice)}
														</div>
													)}
													<Badge variant="secondary" className="text-xs">
														{aircraft.currency || 'USD'}
													</Badge>
												</div>

												{aircraft.description && (
													<div className="text-sm text-muted-foreground line-clamp-2 bg-muted/30 p-3 rounded-lg">
														{aircraft.description}
													</div>
												)}
											</div>
										</div>

										<div className="relative flex items-center gap-3">
											<div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
												<Button
													variant="default"
													size="sm"
													className="gradient-primary shadow-lg"
													onClick={e => {
														e.stopPropagation();
														setSelectedAircraft(aircraft);
														setIsDialogOpen(true);
													}}
												>
													<Eye className="h-4 w-4 mr-2" />
													View Details
												</Button>
											</div>
											<div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
												<ArrowUpRight className="h-4 w-4 text-muted-foreground" />
											</div>
										</div>
									</div>
								))}
							</div>
						)
					) : (
						<div className="text-center py-12 text-muted-foreground">
							<Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p className="text-lg">No aircraft found</p>
							<p className="text-sm">Try adjusting your search criteria</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Pagination Controls */}
			{totalItems > itemsPerPage && (
				<Card className="bg-gradient-to-r from-background/50 to-background/30 border-border/50 hover:shadow-lg transition-all duration-300">
					<CardContent className="p-4">
						<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<span>
									Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{' '}
									{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} aircraft
								</span>
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
									disabled={currentPage === 1}
									className="hover:bg-accent/50 transition-colors"
								>
									Previous
								</Button>
								<div className="flex items-center gap-1">
									{Array.from(
										{ length: Math.min(5, Math.ceil(totalItems / itemsPerPage)) },
										(_, i) => {
											const page = i + 1;
											return (
												<Button
													key={page}
													variant={currentPage === page ? 'default' : 'outline'}
													size="sm"
													onClick={() => setCurrentPage(page)}
													className="w-8 h-8 p-0 hover:bg-accent/50 transition-colors"
												>
													{page}
												</Button>
											);
										}
									)}
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										setCurrentPage(prev => Math.min(Math.ceil(totalItems / itemsPerPage), prev + 1))
									}
									disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
									className="hover:bg-accent/50 transition-colors"
								>
									Next
								</Button>
							</div>
							<div className="flex items-center gap-2">
								<Label className="text-sm text-muted-foreground">Per page:</Label>
								<Select
									value={itemsPerPage.toString()}
									onValueChange={value => setItemsPerPage(Number(value))}
								>
									<SelectTrigger className="w-20">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="25">25</SelectItem>
										<SelectItem value="50">50</SelectItem>
										<SelectItem value="100">100</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Aircraft Detail Dialog */}
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="max-w-7xl w-[98vw] max-h-[98vh] p-0 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl overflow-hidden">
					<div className="flex flex-col h-full max-h-[98vh]">
						<DialogHeader className="relative p-4 sm:p-6 pb-4 border-b border-border/50 bg-gradient-to-r from-background via-background/95 to-background/90">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
								<div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
									<div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-lg flex-shrink-0">
										<Plane className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
									</div>
									<div className="space-y-1 min-w-0 flex-1">
										<DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate leading-tight">
											{selectedAircraft?.manufacturer} {selectedAircraft?.model}
											{selectedAircraft?.variant && (
												<span className="text-muted-foreground font-normal">
													{' '}
													- {selectedAircraft.variant}
												</span>
											)}
										</DialogTitle>
										<div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm text-muted-foreground">
											<span className="inline-flex items-center gap-1">
												<MapPin className="h-3 w-3" />
												{selectedAircraft?.location || 'Location TBD'}
											</span>
											{selectedAircraft?.year && (
												<span className="inline-flex items-center gap-1">
													<Calendar className="h-3 w-3" />
													{selectedAircraft.year}
												</span>
											)}
											{selectedAircraft?.price && (
												<span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
													<DollarSign className="h-3 w-3" />
													{selectedAircraft.price ? formatCurrency(selectedAircraft.price) : 'N/A'}
												</span>
											)}
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2 sm:gap-3 flex-wrap">
									{selectedAircraft &&
										selectedAircraft.status &&
										getStatusBadge(selectedAircraft.status)}
									<Badge variant="outline" className="font-mono text-xs sm:text-sm px-2 py-1">
										{selectedAircraft?.registration || 'N/A'}
									</Badge>
								</div>
							</div>
						</DialogHeader>

						<div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 bg-gradient-to-b from-background/50 to-background/30">
							{selectedAircraft ? (
								<div className="space-y-4 sm:space-y-6">
									{/* Basic Information */}
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Plane className="h-5 w-5" />
												Basic Information
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Manufacturer
													</Label>
													<p className="text-base font-semibold">
														{selectedAircraft.manufacturer || 'N/A'}
													</p>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">Model</Label>
													<p className="text-base font-semibold">
														{selectedAircraft.model || 'N/A'}
													</p>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Variant
													</Label>
													<p className="text-base font-semibold">
														{selectedAircraft.variant || 'N/A'}
													</p>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">Year</Label>
													<p className="text-base font-semibold">
														{selectedAircraft.year || selectedAircraft.yearManufactured || 'N/A'}
													</p>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Registration
													</Label>
													<p className="text-base font-semibold font-mono">
														{selectedAircraft.registration || 'N/A'}
													</p>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Serial Number
													</Label>
													<p className="text-base font-semibold font-mono">
														{selectedAircraft.serialNumber || 'N/A'}
													</p>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Aircraft ID
													</Label>
													<p className="text-base font-semibold">
														{selectedAircraft.aircraftId || 'N/A'}
													</p>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Status
													</Label>
													<div className="mt-1">{getStatusBadge(selectedAircraft.status)}</div>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														For Sale
													</Label>
													<p className="text-base font-semibold">
														{selectedAircraft.forSale ? 'Yes' : 'No'}
													</p>
												</div>
											</div>
										</CardContent>
									</Card>

									{/* Pricing Information */}
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<DollarSign className="h-5 w-5" />
												Pricing Information
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">Price</Label>
													<p className="text-lg font-bold text-green-600">
														{selectedAircraft.price
															? formatCurrency(selectedAircraft.price)
															: 'N/A'}
													</p>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Asking Price
													</Label>
													<p className="text-lg font-bold text-green-600">
														{selectedAircraft.askingPrice
															? formatCurrency(selectedAircraft.askingPrice)
															: 'N/A'}
													</p>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Currency
													</Label>
													<p className="text-base font-semibold">
														{selectedAircraft.currency || 'USD'}
													</p>
												</div>
											</div>
										</CardContent>
									</Card>

									{/* Location & Logistics */}
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<MapPin className="h-5 w-5" />
												Location & Logistics
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Location
													</Label>
													<p className="text-base font-semibold">
														{selectedAircraft.location || 'N/A'}
													</p>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Date Listed
													</Label>
													<p className="text-base font-semibold">
														{selectedAircraft.dateListed
															? new Date(selectedAircraft.dateListed).toLocaleDateString()
															: 'N/A'}
													</p>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Created
													</Label>
													<p className="text-base font-semibold">
														{selectedAircraft.createdAt
															? new Date(selectedAircraft.createdAt).toLocaleDateString()
															: 'N/A'}
													</p>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Last Updated
													</Label>
													<p className="text-base font-semibold">
														{selectedAircraft.lastUpdated
															? new Date(selectedAircraft.lastUpdated).toLocaleDateString()
															: 'N/A'}
													</p>
												</div>
											</div>
										</CardContent>
									</Card>

									{/* Flight Hours & Maintenance */}
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Clock className="h-5 w-5" />
												Flight Hours & Maintenance
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Total Time Hours
													</Label>
													<p className="text-base font-semibold">
														{selectedAircraft.totalTimeHours
															? selectedAircraft.totalTimeHours.toLocaleString()
															: 'N/A'}
													</p>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Engine Hours
													</Label>
													<p className="text-base font-semibold">
														{selectedAircraft.engineHours
															? selectedAircraft.engineHours.toLocaleString()
															: 'N/A'}
													</p>
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-muted-foreground">
														Engine Hours
													</Label>
													<p className="text-base font-semibold">
														{selectedAircraft.engineHours
															? selectedAircraft.engineHours.toLocaleString()
															: 'N/A'}
													</p>
												</div>
											</div>
										</CardContent>
									</Card>

									{/* Description */}
									{selectedAircraft.description && (
										<Card>
											<CardHeader>
												<CardTitle className="flex items-center gap-2">
													<FileText className="h-5 w-5" />
													Description
												</CardTitle>
											</CardHeader>
											<CardContent>
												<p className="text-base leading-relaxed">{selectedAircraft.description}</p>
											</CardContent>
										</Card>
									)}

									{/* Images */}
									{selectedAircraft.images && selectedAircraft.images.length > 0 && (
										<Card>
											<CardHeader>
												<CardTitle className="flex items-center gap-2">
													<FileText className="h-5 w-5" />
													Aircraft Images ({selectedAircraft.images.length})
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
													{selectedAircraft.images.map((image, index) => (
														<div key={index} className="relative group">
															<Image
																src={image.url}
																alt={image.caption || `Aircraft Image ${index + 1}`}
																width={200}
																height={128}
																className="w-full h-32 object-cover rounded-lg border border-border"
															/>
															{image.caption && (
																<div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 rounded-b-lg">
																	{image.caption}
																</div>
															)}
														</div>
													))}
												</div>
											</CardContent>
										</Card>
									)}

									{/* Raw Data Sections */}
									{selectedAircraft.specifications && (
										<SpecificationsFormatter data={selectedAircraft.specifications} />
									)}

									{selectedAircraft.features && (
										<FeaturesFormatter data={selectedAircraft.features} />
									)}

									{selectedAircraft.marketData && (
										<MarketDataFormatter data={selectedAircraft.marketData} />
									)}

									{selectedAircraft.maintenanceData && (
										<MaintenanceFormatter data={selectedAircraft.maintenanceData} />
									)}

									{selectedAircraft.contactInfo && (
										<ContactFormatter data={selectedAircraft.contactInfo} />
									)}

									{selectedAircraft.ownershipData && (
										<OwnershipFormatter data={selectedAircraft.ownershipData} />
									)}

									{/* Raw JSON Data for Technical Users */}
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Settings className="h-5 w-5" />
												Raw Data (JSON)
											</CardTitle>
										</CardHeader>
										<CardContent>
											<pre className="bg-muted p-4 rounded-lg overflow-auto text-sm max-h-96">
												{JSON.stringify(selectedAircraft, null, 2)}
											</pre>
										</CardContent>
									</Card>
								</div>
							) : (
								<div className="text-center py-12 text-muted-foreground">
									<Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
									<p className="text-lg">No aircraft data available</p>
								</div>
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Report Viewing Dialog */}
			<Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
				<DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 bg-background border-0 shadow-2xl">
					<div className="flex flex-col h-full max-h-[90vh]">
						<DialogHeader className="p-6 pb-4 border-b border-border">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-4">
									<div className="p-3 rounded-lg bg-primary/10">
										<BarChart3 className="h-6 w-6 text-primary" />
									</div>
									<div className="space-y-1">
										<DialogTitle className="text-2xl font-semibold text-foreground">
											{selectedReport?.title || 'Market Evaluation Report'}
										</DialogTitle>
										<div className="flex items-center gap-4 text-sm text-muted-foreground">
											<span>Type: {selectedReport?.type || 'market-evaluation'}</span>
											<span>
												Generated:{' '}
												{selectedReport?.generatedAt
													? new Date(selectedReport.generatedAt).toLocaleString()
													: 'N/A'}
											</span>
										</div>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<Button
										variant="outline"
										size="sm"
										onClick={() => selectedReport && downloadReport(selectedReport.id, 'html')}
										className="hover:bg-blue-50 dark:hover:bg-blue-950"
									>
										<FileText className="h-4 w-4 mr-2" />
										View HTML
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => selectedReport && downloadReport(selectedReport.id, 'pdf')}
										className="hover:bg-red-50 dark:hover:bg-red-950"
									>
										<Download className="h-4 w-4 mr-2" />
										Download PDF
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => selectedReport && downloadReport(selectedReport.id, 'excel')}
										className="hover:bg-green-50 dark:hover:bg-green-950"
									>
										<Download className="h-4 w-4 mr-2" />
										Download Excel
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => selectedReport && downloadReport(selectedReport.id, 'csv')}
										className="hover:bg-yellow-50 dark:hover:bg-yellow-950"
									>
										<Download className="h-4 w-4 mr-2" />
										Download CSV
									</Button>
								</div>
							</div>
						</DialogHeader>

						<div className="flex-1 overflow-y-auto p-6">
							{selectedReport ? (
								<div className="space-y-6">
									{/* Report Summary */}
									<Card>
										<CardHeader>
											<CardTitle>Report Summary</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
												<div>
													<Label className="text-sm font-medium">Total Aircraft</Label>
													<p className="text-sm text-muted-foreground">
														{(
															(selectedReport.data as Record<string, unknown>)
																?.aircraft as unknown[]
														)?.length || 'N/A'}
													</p>
												</div>
												<div>
													<Label className="text-sm font-medium">Report Type</Label>
													<p className="text-sm text-muted-foreground">
														{selectedReport.type || 'market-evaluation'}
													</p>
												</div>
												<div>
													<Label className="text-sm font-medium">Generated</Label>
													<p className="text-sm text-muted-foreground">
														{selectedReport.generatedAt
															? new Date(selectedReport.generatedAt).toLocaleDateString()
															: 'N/A'}
													</p>
												</div>
												<div>
													<Label className="text-sm font-medium">Status</Label>
													<p className="text-sm text-muted-foreground">
														{selectedReport.status || 'Completed'}
													</p>
												</div>
											</div>
										</CardContent>
									</Card>
									{/* Aircraft */}
									{Boolean((selectedReport.data as Record<string, unknown>)?.aircraft) && (
										<Card>
											<CardHeader>
												<CardTitle className="flex items-center gap-2">
													<Plane className="h-5 w-5" />
													Aircraft Data
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="space-y-4">
													<p className="text-sm text-muted-foreground">
														{Array.isArray(
															(selectedReport.data as Record<string, unknown>).aircraft
														)
															? `${
																	(
																		(selectedReport.data as Record<string, unknown>)
																			.aircraft as unknown[]
																	).length
															  } aircraft found`
															: 'Aircraft data available'}
													</p>
													<pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-64">
														{JSON.stringify(
															(selectedReport.data as Record<string, unknown>).aircraft,
															null,
															2
														)}
													</pre>
												</div>
											</CardContent>
										</Card>
									)}
									{/* Market Data */}
									{Boolean((selectedReport.data as Record<string, unknown>)?.marketData) && (
										<Card>
											<CardHeader>
												<CardTitle className="flex items-center gap-2">
													<BarChart3 className="h-5 w-5" />
													Market Data
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="space-y-4">
													<p className="text-sm text-muted-foreground">
														{Array.isArray(
															(selectedReport.data as Record<string, unknown>).marketData
														)
															? `${
																	(
																		(selectedReport.data as Record<string, unknown>)
																			.marketData as unknown[]
																	).length
															  } market records`
															: 'Market data available'}
													</p>
													<pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-64">
														{JSON.stringify(
															(selectedReport.data as Record<string, unknown>).marketData,
															null,
															2
														)}
													</pre>
												</div>
											</CardContent>
										</Card>
									)}

									{/* Raw Data */}
									<Card>
										<CardHeader>
											<CardTitle>Report Data</CardTitle>
										</CardHeader>
										<CardContent>
											<pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
												{JSON.stringify(selectedReport.data, null, 2)}
											</pre>
										</CardContent>
									</Card>
								</div>
							) : (
								<div className="text-center py-12 text-muted-foreground">
									<BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
									<p className="text-lg">No report data available</p>
								</div>
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
