'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
	Container,
	Typography,
	Box,
	Card,
	CardContent,
	TextField,
	Button,
	Chip,
	IconButton,
	Tooltip,
	Grid,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	InputAdornment,
	Fade,
	useTheme,
	Avatar,
	LinearProgress,
	Dialog,
	DialogContent,
} from '@mui/material';
import {
	Search as SearchIcon,
	Download as DownloadIcon,
	Refresh as RefreshIcon,
	Visibility as ViewIcon,
	Flight as FlightIcon,
	AttachMoney as DollarIcon,
	LocationOn as LocationIcon,
	Phone as PhoneIcon,
	Email as EmailIcon,
	Business as BusinessIcon,
	TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import toast from 'react-hot-toast';

interface Aircraft {
	id: string;
	aircraftId?: number;
	registration?: string;
	serialNumber?: string;
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
	lastUpdated?: string;
	updatedAt?: string;
	createdAt?: string;
	broker?: string;
	brokerPhone?: string;
	brokerEmail?: string;
	totalTimeHours?: number;
	engineHours?: number;
	apuHours?: number;
	cycles?: number;
	description?: string;
	features?: string[];
	specifications?: Record<string, any>;
	contactInfo?: Record<string, any>;
	forSale?: boolean;
	images?: Array<{
		id: string;
		url: string;
		thumbnailUrl?: string;
		type?: string;
		caption?: string;
		isHero?: boolean;
	}>;
	marketDataRecords?: Array<{
		id: string;
		category?: string;
		avgPrice?: number;
		minPrice?: number;
		maxPrice?: number;
		totalListings?: number;
		priceTrend?: string;
		marketTrend?: string;
	}>;
}

export default function AircraftPage() {
	const [aircraft, setAircraft] = useState<Aircraft[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [manufacturerFilter, setManufacturerFilter] = useState<string>('all');
	const [priceRange] = useState<[number, number]>([0, 100000000]);
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);

	const theme = useTheme();

	const fetchAircraft = async () => {
		try {
			setLoading(true);
			// Use comprehensive aircraft data API for full dataset
			const response = await fetch('/api/database/aircraft/comprehensive?limit=10000');
			const data = await response.json();
			if (data.success && data.data) {
				// Transform the data to match our interface
				const transformedData = data.data.map(
					(item: {
						id?: string;
						aircraftId?: string;
						registration?: string;
						regnbr?: string;
						serialNumber?: string;
						serial?: string;
						askingPrice?: number;
						price?: number;
						yearManufactured?: number;
						year?: number;
						yearmfr?: number;
						lastUpdated?: string;
						updatedAt?: string;
						broker?: string;
						brokerPhone?: string;
						brokerEmail?: string;
						contactInfo?: {
							broker?: string;
							phone?: string;
							email?: string;
						};
						totalTimeHours?: number;
						aftt?: number;
						engineHours?: number;
						apuHours?: number;
						cycles?: number;
						currency?: string;
						forSale?: boolean;
						status?: string;
						manufacturer?: string;
						make?: string;
						location?: string;
						basecity?: string;
					}) => ({
						...item,
						id: item.id || item.aircraftId,
						registration: item.registration || item.regnbr || `N${item.aircraftId || item.id}`,
						serialNumber: (item as any).serialNumber || (item as any).serial || '',
						price: item.askingPrice || item.price || 0,
						year: item.yearManufactured || item.year || item.yearmfr,
						lastUpdated: item.updatedAt || item.lastUpdated,
						broker: item.contactInfo?.broker || item.broker || 'Unknown',
						brokerPhone: item.contactInfo?.phone || item.brokerPhone || '',
						brokerEmail: item.contactInfo?.email || item.brokerEmail || '',
						totalTimeHours: item.totalTimeHours || item.aftt || 0,
						engineHours: item.engineHours || 0,
						apuHours: item.apuHours || 0,
						cycles: item.cycles || 0,
						currency: item.currency || 'USD',
						forSale: item.forSale !== undefined ? item.forSale : item.status === 'ACTIVE',
						manufacturer: item.manufacturer || item.make,
						location: item.location || item.basecity,
						status:
							item.status === 'ACTIVE' || item.status === 'For Sale'
								? 'For Sale'
								: item.status === 'SOLD'
								? 'Sold'
								: item.status === 'PENDING' || item.status === 'UNDER_CONTRACT'
								? 'Pending'
								: item.status === 'INACTIVE' || item.status === 'WITHDRAWN'
								? 'Withdrawn'
								: item.status,
					})
				);
				setAircraft(transformedData);
			} else {
				// Fallback to basic aircraft API
				const fallbackResponse = await fetch('/api/database/aircraft');
				const fallbackData = await fallbackResponse.json();
				if (fallbackData.success) {
					const transformedData = fallbackData.data.map(
						(item: {
							id?: string;
							aircraftId?: string;
							registration?: string;
							askingPrice?: number;
							price?: number;
							yearManufactured?: number;
							year?: number;
							lastUpdated?: string;
							updatedAt?: string;
							broker?: string;
							brokerPhone?: string;
							brokerEmail?: string;
							contactInfo?: {
								broker?: string;
								phone?: string;
								email?: string;
							};
							totalTimeHours?: number;
							engineHours?: number;
							apuHours?: number;
							cycles?: number;
							currency?: string;
							forSale?: boolean;
							status?: string;
						}) => ({
							...item,
							registration: item.registration || `N${item.aircraftId || item.id}`,
							serialNumber: (item as any).serialNumber || (item as any).serial || '',
							price: item.askingPrice || item.price || 0,
							year: item.yearManufactured || item.year,
							lastUpdated: item.updatedAt || item.lastUpdated,
							broker: item.contactInfo?.broker || item.broker || 'Unknown',
							brokerPhone: item.contactInfo?.phone || item.brokerPhone || '',
							brokerEmail: item.contactInfo?.email || item.brokerEmail || '',
							totalTimeHours: item.totalTimeHours || 0,
							engineHours: item.engineHours || 0,
							apuHours: item.apuHours || 0,
							cycles: item.cycles || 0,
							currency: item.currency || 'USD',
							forSale: item.forSale !== undefined ? item.forSale : item.status === 'ACTIVE',
							status:
								item.status === 'ACTIVE'
									? 'For Sale'
									: item.status === 'SOLD'
									? 'Sold'
									: item.status === 'PENDING'
									? 'Pending'
									: item.status === 'INACTIVE'
									? 'Withdrawn'
									: item.status,
						})
					);
					setAircraft(transformedData);
				} else {
					toast.error('Failed to fetch aircraft data');
				}
			}
		} catch (error) {
			console.error('Error fetching aircraft:', error);
			toast.error('Failed to fetch aircraft data');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAircraft();
	}, []);

	const filteredAircraft = useMemo(() => {
		let filtered = aircraft;

		// Search filter
		if (searchTerm) {
			filtered = filtered.filter(
				aircraft =>
					(aircraft.registration || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
					aircraft.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
					aircraft.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
					(aircraft.location || '').toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		// Status filter
		if (statusFilter !== 'all') {
			filtered = filtered.filter(aircraft => aircraft.status === statusFilter);
		}

		// Manufacturer filter
		if (manufacturerFilter !== 'all') {
			filtered = filtered.filter(aircraft => aircraft.manufacturer === manufacturerFilter);
		}

		// Price range filter
		filtered = filtered.filter(
			aircraft => (aircraft.price || 0) >= priceRange[0] && (aircraft.price || 0) <= priceRange[1]
		);

		return filtered;
	}, [aircraft, searchTerm, statusFilter, manufacturerFilter, priceRange]);

	// Sort aircraft by last updated date
	const sortedAircraft = useMemo(() => {
		return [...filteredAircraft].sort((a, b) => {
			const aValue = new Date(a.lastUpdated || 0).getTime();
			const bValue = new Date(b.lastUpdated || 0).getTime();
			return bValue - aValue; // Most recent first
		});
	}, [filteredAircraft]);

	const manufacturers = useMemo(() => {
		const unique = [...new Set(aircraft.map(a => a.manufacturer))];
		return unique.sort();
	}, [aircraft]);

	const formatCurrency = (amount: number | undefined) => {
		if (!amount) return '$0';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
		switch (status) {
			case 'For Sale':
				return 'success';
			case 'Sold':
				return 'error';
			case 'Pending':
				return 'warning';
			case 'Withdrawn':
				return 'default';
			default:
				return 'default';
		}
	};

	const handleViewDetails = (aircraft: Aircraft) => {
		setSelectedAircraft(aircraft);
		setDetailsOpen(true);
	};

	const columns: GridColDef[] = [
		{
			field: 'registration',
			headerName: 'Registration',
			width: 120,
			renderCell: (params: { value?: string }) => (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: '0.75rem' }}>
						<FlightIcon fontSize="small" />
					</Avatar>
					<Typography variant="body2" fontWeight={600}>
						{params.value}
					</Typography>
				</Box>
			),
		},
		{
			field: 'manufacturer',
			headerName: 'Manufacturer',
			width: 140,
		},
		{
			field: 'model',
			headerName: 'Model',
			width: 160,
		},
		{
			field: 'year',
			headerName: 'Year',
			width: 80,
			type: 'number',
		},
		{
			field: 'price',
			headerName: 'Price',
			width: 140,
			type: 'number',
			renderCell: params => (
				<Typography variant="body2" fontWeight={600} color="success.main">
					{formatCurrency(params.value)}
				</Typography>
			),
		},
		{
			field: 'location',
			headerName: 'Location',
			width: 150,
			renderCell: (params: { value?: string }) => (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
					<LocationIcon fontSize="small" color="action" />
					<Typography variant="body2">{params.value || 'Unknown'}</Typography>
				</Box>
			),
		},
		{
			field: 'status',
			headerName: 'Status',
			width: 120,
			renderCell: (params: { value?: string }) => (
				<Chip
					label={params.value}
					color={getStatusColor(params.value || '')}
					size="small"
					variant="outlined"
				/>
			),
		},
		{
			field: 'broker',
			headerName: 'Broker',
			width: 150,
			renderCell: (params: { value?: string; row: Aircraft }) => (
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
					<Typography variant="body2" fontWeight={500}>
						{params.value || 'Unknown'}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						{params.row.brokerPhone || ''}
					</Typography>
				</Box>
			),
		},
		{
			field: 'actions',
			headerName: 'Actions',
			width: 100,
			sortable: false,
			renderCell: (params: { row: Aircraft }) => (
				<Box sx={{ display: 'flex', gap: 1 }}>
					<Tooltip title="View Details">
						<IconButton
							size="small"
							onClick={() => handleViewDetails(params.row)}
							sx={{ color: 'primary.main' }}
						>
							<ViewIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				</Box>
			),
		},
	];

	if (loading) {
		return (
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
					<LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
					<Typography variant="h6" color="text.secondary">
						Loading Aircraft Database...
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
								<FlightIcon />
							</Avatar>
							<Box>
								<Typography variant="h4" fontWeight={700} color="primary.main">
									Aircraft Database
								</Typography>
								<Typography variant="body1" color="text.secondary">
									Browse and manage all aircraft listings with advanced filtering and detailed
									market data
								</Typography>
							</Box>
						</Box>

						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
							<Chip
								icon={<FlightIcon />}
								label={`${aircraft.length} Total Aircraft`}
								color="primary"
								variant="outlined"
							/>
							<Chip
								icon={<TrendingUpIcon />}
								label={`${aircraft.filter(a => a.status === 'For Sale').length} For Sale`}
								color="success"
								variant="outlined"
							/>
							<Chip
								icon={<DollarIcon />}
								label={`${formatCurrency(
									aircraft.reduce((sum, a) => sum + (a.price || 0), 0)
								)} Total Value`}
								color="info"
								variant="outlined"
							/>
						</Box>
					</Box>
				</Fade>

				{/* Filters */}
				<Fade in={true} timeout={800}>
					<Card sx={{ mb: 4 }}>
						<CardContent>
							<Grid container spacing={3} alignItems="center">
								<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
									<TextField
										fullWidth
										placeholder="Search aircraft..."
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
								<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
									<FormControl fullWidth>
										<InputLabel>Status</InputLabel>
										<Select
											value={statusFilter}
											label="Status"
											onChange={e => setStatusFilter(e.target.value)}
										>
											<MenuItem value="all">All Status</MenuItem>
											<MenuItem value="For Sale">For Sale</MenuItem>
											<MenuItem value="Sold">Sold</MenuItem>
											<MenuItem value="Pending">Pending</MenuItem>
											<MenuItem value="Withdrawn">Withdrawn</MenuItem>
										</Select>
									</FormControl>
								</Box>
								<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
									<FormControl fullWidth>
										<InputLabel>Manufacturer</InputLabel>
										<Select
											value={manufacturerFilter}
											label="Manufacturer"
											onChange={e => setManufacturerFilter(e.target.value)}
										>
											<MenuItem value="all">All Manufacturers</MenuItem>
											{manufacturers.map(manufacturer => (
												<MenuItem key={manufacturer} value={manufacturer}>
													{manufacturer}
												</MenuItem>
											))}
										</Select>
									</FormControl>
								</Box>
								<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
									<Button
										variant="outlined"
										startIcon={<RefreshIcon />}
										onClick={fetchAircraft}
										fullWidth
									>
										Refresh
									</Button>
								</Box>
								<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
									<Button
										variant="contained"
										startIcon={<DownloadIcon />}
										fullWidth
										sx={{
											background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
										}}
									>
										Export
									</Button>
								</Box>
							</Grid>
						</CardContent>
					</Card>
				</Fade>

				{/* Data Grid */}
				<Fade in={true} timeout={1000}>
					<Card>
						<Box sx={{ height: 600, width: '100%' }}>
							<DataGrid
								rows={filteredAircraft}
								columns={columns}
								initialState={{
									pagination: {
										paginationModel: { page: 0, pageSize: rowsPerPage },
									},
								}}
								pageSizeOptions={[10, 25, 50, 100]}
								onPaginationModelChange={model => {
									// setPage(model.page);
									setRowsPerPage(model.pageSize);
								}}
								disableRowSelectionOnClick
								sx={{
									border: 'none',
									'& .MuiDataGrid-cell': {
										borderBottom: `1px solid ${theme.palette.divider}`,
									},
									'& .MuiDataGrid-columnHeaders': {
										backgroundColor: theme.palette.mode === 'light' ? '#fafafa' : '#2a2a2a',
										borderBottom: `2px solid ${theme.palette.divider}`,
									},
									'& .MuiDataGrid-row:hover': {
										backgroundColor: theme.palette.action.hover,
									},
								}}
							/>
						</Box>
					</Card>
				</Fade>

				{/* Aircraft Details Dialog */}
				{selectedAircraft && (
					<Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
						<DialogContent>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
								<Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
									<FlightIcon />
								</Avatar>
								<Box>
									<Typography variant="h5" fontWeight={700}>
										{selectedAircraft.registration}
									</Typography>
									<Typography variant="body1" color="text.secondary">
										{selectedAircraft.year} {selectedAircraft.manufacturer} {selectedAircraft.model}
									</Typography>
								</Box>
							</Box>

							<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
								{/* Basic Information */}
								<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
									<Typography variant="h6" gutterBottom>
										Basic Information
									</Typography>
									<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Typography variant="body2" color="text.secondary">
												Registration:
											</Typography>
											<Typography variant="body2" fontWeight={600}>
												{selectedAircraft.registration || 'N/A'}
											</Typography>
										</Box>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Typography variant="body2" color="text.secondary">
												Serial Number:
											</Typography>
											<Typography variant="body2">
												{selectedAircraft.serialNumber || 'N/A'}
											</Typography>
										</Box>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Typography variant="body2" color="text.secondary">
												Year:
											</Typography>
											<Typography variant="body2">
												{selectedAircraft.year || selectedAircraft.yearManufactured || 'N/A'}
											</Typography>
										</Box>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Typography variant="body2" color="text.secondary">
												Variant:
											</Typography>
											<Typography variant="body2">{selectedAircraft.variant || 'N/A'}</Typography>
										</Box>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Typography variant="body2" color="text.secondary">
												Status:
											</Typography>
											<Chip
												label={selectedAircraft.status}
												color={getStatusColor(selectedAircraft.status) as any}
												size="small"
											/>
										</Box>
									</Box>
								</Box>

								{/* Pricing & Location */}
								<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
									<Typography variant="h6" gutterBottom>
										Pricing & Location
									</Typography>
									<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Typography variant="body2" color="text.secondary">
												Asking Price:
											</Typography>
											<Typography variant="body2" fontWeight={600} color="success.main">
												{formatCurrency(selectedAircraft.askingPrice || selectedAircraft.price)}
											</Typography>
										</Box>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Typography variant="body2" color="text.secondary">
												Currency:
											</Typography>
											<Typography variant="body2">{selectedAircraft.currency || 'USD'}</Typography>
										</Box>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Typography variant="body2" color="text.secondary">
												Location:
											</Typography>
											<Typography variant="body2">{selectedAircraft.location || 'N/A'}</Typography>
										</Box>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Typography variant="body2" color="text.secondary">
												For Sale:
											</Typography>
											<Chip
												label={selectedAircraft.forSale ? 'Yes' : 'No'}
												color={selectedAircraft.forSale ? 'success' : 'default'}
												size="small"
											/>
										</Box>
									</Box>
								</Box>

								{/* Technical Specifications */}
								<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
									<Typography variant="h6" gutterBottom>
										Technical Specifications
									</Typography>
									<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Typography variant="body2" color="text.secondary">
												Total Time:
											</Typography>
											<Typography variant="body2">
												{selectedAircraft.totalTimeHours
													? `${selectedAircraft.totalTimeHours.toLocaleString()} hrs`
													: 'N/A'}
											</Typography>
										</Box>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Typography variant="body2" color="text.secondary">
												Engine Hours:
											</Typography>
											<Typography variant="body2">
												{selectedAircraft.engineHours
													? `${selectedAircraft.engineHours.toLocaleString()} hrs`
													: 'N/A'}
											</Typography>
										</Box>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Typography variant="body2" color="text.secondary">
												APU Hours:
											</Typography>
											<Typography variant="body2">
												{selectedAircraft.apuHours
													? `${selectedAircraft.apuHours.toLocaleString()} hrs`
													: 'N/A'}
											</Typography>
										</Box>
										<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
											<Typography variant="body2" color="text.secondary">
												Cycles:
											</Typography>
											<Typography variant="body2">
												{selectedAircraft.cycles ? selectedAircraft.cycles.toLocaleString() : 'N/A'}
											</Typography>
										</Box>
									</Box>
								</Box>

								{/* Contact Information */}
								<Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
									<Typography variant="h6" gutterBottom>
										Contact Information
									</Typography>
									<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
											<BusinessIcon fontSize="small" color="action" />
											<Typography variant="body2">{selectedAircraft.broker || 'N/A'}</Typography>
										</Box>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
											<PhoneIcon fontSize="small" color="action" />
											<Typography variant="body2">
												{selectedAircraft.brokerPhone || 'N/A'}
											</Typography>
										</Box>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
											<EmailIcon fontSize="small" color="action" />
											<Typography variant="body2">
												{selectedAircraft.brokerEmail || 'N/A'}
											</Typography>
										</Box>
									</Box>
								</Box>

								{/* Additional Details */}
								{selectedAircraft.description && (
									<Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
										<Typography variant="h6" gutterBottom>
											Description
										</Typography>
										<Typography variant="body2" color="text.secondary">
											{selectedAircraft.description}
										</Typography>
									</Box>
								)}

								{/* Features */}
								{selectedAircraft.features && selectedAircraft.features.length > 0 && (
									<Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
										<Typography variant="h6" gutterBottom>
											Features
										</Typography>
										<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
											{selectedAircraft.features.map((feature, index) => (
												<Chip key={index} label={feature} size="small" variant="outlined" />
											))}
										</Box>
									</Box>
								)}

								{/* Market Data */}
								{selectedAircraft.marketDataRecords &&
									selectedAircraft.marketDataRecords.length > 0 && (
										<Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
											<Typography variant="h6" gutterBottom>
												Market Data
											</Typography>
											<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
												{selectedAircraft.marketDataRecords.map((marketData, index) => (
													<Box
														key={index}
														sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}
													>
														<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
															<Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
																<Typography variant="body2" color="text.secondary">
																	Category: {marketData.category || 'N/A'}
																</Typography>
															</Box>
															<Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
																<Typography variant="body2" color="text.secondary">
																	Total Listings: {marketData.totalListings || 'N/A'}
																</Typography>
															</Box>
															<Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
																<Typography variant="body2" color="text.secondary">
																	Avg Price:{' '}
																	{marketData.avgPrice
																		? formatCurrency(marketData.avgPrice)
																		: 'N/A'}
																</Typography>
															</Box>
															<Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
																<Typography variant="body2" color="text.secondary">
																	Price Trend: {marketData.priceTrend || 'N/A'}
																</Typography>
															</Box>
														</Box>
													</Box>
												))}
											</Box>
										</Box>
									)}

								{/* Images */}
								{selectedAircraft.images && selectedAircraft.images.length > 0 && (
									<Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
										<Typography variant="h6" gutterBottom>
											Images ({selectedAircraft.images.length})
										</Typography>
										<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
											{selectedAircraft.images.slice(0, 4).map((image, index) => (
												<Box
													key={index}
													sx={{
														width: 120,
														height: 80,
														borderRadius: 1,
														overflow: 'hidden',
														border: 1,
														borderColor: 'divider',
													}}
												>
													<img
														src={image.thumbnailUrl || image.url}
														alt={image.caption || `Aircraft image ${index + 1}`}
														style={{ width: '100%', height: '100%', objectFit: 'cover' }}
													/>
												</Box>
											))}
										</Box>
									</Box>
								)}
							</Box>
						</DialogContent>
					</Dialog>
				)}
			</Container>
		</Box>
	);
}
