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
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	InputAdornment,
	IconButton,
	Tooltip,
	Dialog,
	DialogContent,
	DialogTitle,
	DialogActions,
	LinearProgress,
	Fade,
	Grow,
	Avatar,
	Grid,
	Divider,
	Paper,
	CircularProgress,
	Alert,
} from '@mui/material';
import {
	Flight as PlaneIcon,
	Search as SearchIcon,
	FilterList as FilterIcon,
	Download as DownloadIcon,
	Refresh as RefreshIcon,
	Visibility as EyeIcon,
	TableChart as TableIcon,
	CalendarToday as CalendarIcon,
	Description as FileTextIcon,
	Schedule as ClockIcon,
	LocationOn as MapPinIcon,
	Settings as SettingsIcon,
	AttachMoney as DollarIcon,
	Build as WrenchIcon,
	Phone as PhoneIcon,
	Star as StarIcon,
	BarChart as BarChartIcon,
	ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import toast from 'react-hot-toast';

interface Aircraft {
	id: string;
	aircraftId?: number;
	manufacturer: string;
	model: string;
	year: number;
	yearManufactured?: number;
	status: string;
	askingPrice?: number;
	price?: number;
	lastSalePrice?: number;
	totalTimeHours?: number;
	engineHours?: number;
	apuHours?: number;
	cycles?: number;
	location?: string;
	baseCity?: string;
	baseState?: string;
	baseCountry?: string;
	serialNumber?: string;
	registration?: string;
	currency?: string;
	forSale?: boolean;
	// Enhanced comprehensive fields
	specifications?: {
		enrichment?: any;
		techSummary?: {
			engines?: number;
			avionicsSuite?: string;
			maintenanceDueInDays?: number;
			interiorYear?: number;
			exteriorYear?: number;
			featuresCount?: number;
			imageCount?: number;
		};
		rawData?: any;
	};
	images?: Array<{
		url?: string;
		imageUrl?: string;
		caption?: string;
	}>;
	contactInfo?: {
		broker?: string;
		phone?: string;
		email?: string;
	};
	marketDataRecords?: Array<any>;
	leadScores?: Array<any>;
	reports?: Array<any>;
	ownershipData?: any;
	companyRelations?: Array<any>;
	evaluations?: Array<any>;
	features?: string;
	rawData?: any;
	createdAt?: string;
	updatedAt?: string;
}

export function AircraftMarketEvaluation() {
	const [aircraft, setAircraft] = useState<Aircraft[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedManufacturer, setSelectedManufacturer] = useState('all');
	const [selectedStatus, setSelectedStatus] = useState('all');
	const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
	const [showDetails, setShowDetails] = useState(false);
	const [reportType, setReportType] = useState('comprehensive');
	const [isGeneratingReport, setIsGeneratingReport] = useState(false);

	// Load aircraft data
	useEffect(() => {
		const loadAircraft = async () => {
			try {
				setLoading(true);
				// Try comprehensive aircraft data first
				const response = await fetch('/api/database/aircraft/comprehensive?limit=10000');
				if (response.ok) {
					const data = await response.json();
					if (data.success && data.data) {
						// Transform the data to match our interface with comprehensive fields
						const transformedData = data.data.map((item: any) => ({
							id: item.id || item.aircraftId,
							aircraftId: item.aircraftId,
							manufacturer: item.manufacturer || item.make,
							model: item.model,
							year: item.yearManufactured || item.year || item.yearmfr,
							yearManufactured: item.yearManufactured,
							status: item.status || 'ACTIVE',
							askingPrice: item.askingPrice || item.price,
							price: item.price,
							lastSalePrice: item.lastSalePrice,
							totalTimeHours: item.totalTimeHours || item.aftt,
							engineHours: item.engineHours,
							apuHours: item.apuHours,
							cycles: item.cycles,
							location: item.location || item.basecity,
							baseCity: item.baseCity,
							baseState: item.baseState,
							baseCountry: item.baseCountry,
							serialNumber: item.serialNumber || item.sernbr,
							registration: item.registration || item.regnbr,
							currency: item.currency || 'USD',
							forSale: item.forSale,
							// Enhanced comprehensive fields
							specifications: item.specifications,
							images: item.images || [],
							contactInfo: item.contactInfo,
							marketDataRecords: item.marketDataRecords || [],
							leadScores: item.leadScores || [],
							reports: item.reports || [],
							ownershipData: item.ownershipData,
							companyRelations: item.companyRelations || [],
							evaluations: item.evaluations || [],
							features: item.features,
							rawData: item.rawData,
							createdAt: item.createdAt,
							updatedAt: item.updatedAt,
						}));
						setAircraft(transformedData);
					} else {
						// Fallback to JetNet API
						const jetnetResponse = await fetch('/api/jetnet?action=aircraft-data');
						if (jetnetResponse.ok) {
							const jetnetData = await jetnetResponse.json();
							if (jetnetData.success && jetnetData.data.aircraftData) {
								const transformedData = jetnetData.data.aircraftData.map((item: any) => ({
									id: item.aircraftId,
									manufacturer: item.make,
									model: item.model,
									year: item.year,
									status: item.status,
									askingPrice: item.price,
									totalTimeHours: item.totalTime,
									location: item.location,
									serialNumber: item.serialNumber,
									registration: item.registration,
								}));
								setAircraft(transformedData);
							}
						}
					}
				} else {
					console.error('Failed to load aircraft data');
					toast.error('Failed to load aircraft data');
				}
			} catch (error) {
				console.error('Error loading aircraft:', error);
				toast.error('Error loading aircraft data');
			} finally {
				setLoading(false);
			}
		};
		loadAircraft();
	}, []);

	// Filter aircraft
	const filteredAircraft = useMemo(() => {
		return aircraft.filter(item => {
			const matchesSearch =
				searchTerm === '' ||
				item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
				item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
				item.registration?.toLowerCase().includes(searchTerm.toLowerCase());

			const matchesManufacturer =
				selectedManufacturer === 'all' || item.manufacturer === selectedManufacturer;

			const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

			return matchesSearch && matchesManufacturer && matchesStatus;
		});
	}, [aircraft, searchTerm, selectedManufacturer, selectedStatus]);

	// Generate report
	const generateReport = async () => {
		setIsGeneratingReport(true);
		try {
			toast.loading('Generating comprehensive market report...');

			// Call the comprehensive sync API to generate real market data
			const response = await fetch('/api/jetnet/comprehensive-sync', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					reportType,
					includeMarketData: true,
					includePricingAnalysis: true,
					includeCompetitionAnalysis: reportType === 'competition',
					includeTrends: reportType === 'trends',
				}),
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					toast.success(
						`Report generated successfully! ${data.data.aircraftCount || 0} aircraft analyzed.`
					);

					// Refresh aircraft data after report generation
					const refreshResponse = await fetch('/api/database/aircraft/comprehensive?limit=10000');
					if (refreshResponse.ok) {
						const refreshData = await refreshResponse.json();
						if (refreshData.success && refreshData.data) {
							const transformedData = refreshData.data.map((item: any) => ({
								id: item.id || item.aircraftId,
								manufacturer: item.manufacturer || item.make,
								model: item.model,
								year: item.yearManufactured || item.year || item.yearmfr,
								status: item.status || 'ACTIVE',
								askingPrice: item.askingPrice || item.price,
								lastSalePrice: item.lastSalePrice,
								totalTimeHours: item.totalTimeHours || item.aftt,
								location: item.location || item.basecity,
								serialNumber: item.serialNumber || item.sernbr,
								registration: item.registration || item.regnbr,
							}));
							setAircraft(transformedData);
						}
					}
				} else {
					toast.error('Report generation failed: ' + (data.error || 'Unknown error'));
				}
			} else {
				toast.error('Failed to generate report');
			}
		} catch (error) {
			console.error('Error generating report:', error);
			toast.error('Failed to generate report');
		} finally {
			setIsGeneratingReport(false);
		}
	};

	// DataGrid columns with comprehensive data
	const columns: GridColDef[] = [
		{
			field: 'manufacturer',
			headerName: 'Manufacturer',
			width: 150,
			renderCell: params => (
				<Box display="flex" alignItems="center" gap={1}>
					<PlaneIcon fontSize="small" color="primary" />
					{params.value}
				</Box>
			),
		},
		{
			field: 'model',
			headerName: 'Model',
			width: 150,
		},
		{
			field: 'year',
			headerName: 'Year',
			width: 100,
		},
		{
			field: 'registration',
			headerName: 'Registration',
			width: 120,
			renderCell: params => (
				<Typography variant="body2" fontWeight={500}>
					{params.value || 'N/A'}
				</Typography>
			),
		},
		{
			field: 'status',
			headerName: 'Status',
			width: 120,
			renderCell: params => (
				<Chip
					label={params.value}
					color={
						params.value === 'ACTIVE' || params.value === 'For Sale'
							? 'success'
							: params.value === 'SOLD'
							? 'error'
							: 'default'
					}
					size="small"
				/>
			),
		},
		{
			field: 'askingPrice',
			headerName: 'Price',
			width: 140,
			renderCell: params => {
				const price = params.value || params.row.price;
				return price ? `$${price.toLocaleString()}` : 'N/A';
			},
		},
		{
			field: 'totalTimeHours',
			headerName: 'Total Time',
			width: 120,
			renderCell: params => (
				<Typography variant="body2">
					{params.value ? `${params.value.toLocaleString()} hrs` : 'N/A'}
				</Typography>
			),
		},
		{
			field: 'location',
			headerName: 'Location',
			width: 150,
			renderCell: params => (
				<Box display="flex" alignItems="center" gap={0.5}>
					<MapPinIcon fontSize="small" color="action" />
					<Typography variant="body2">{params.value || params.row.baseCity || 'N/A'}</Typography>
				</Box>
			),
		},
		{
			field: 'specifications',
			headerName: 'Tech Data',
			width: 120,
			renderCell: params => {
				const techSummary = params.value?.techSummary;
				const engines = techSummary?.engines || 0;
				const avionics = techSummary?.avionicsSuite;
				return (
					<Box>
						<Typography variant="caption" display="block">
							{engines} Engine{engines !== 1 ? 's' : ''}
						</Typography>
						{avionics && (
							<Typography variant="caption" color="text.secondary" display="block">
								{avionics}
							</Typography>
						)}
					</Box>
				);
			},
		},
		{
			field: 'images',
			headerName: 'Images',
			width: 100,
			renderCell: params => {
				const imageCount = params.value?.length || 0;
				return (
					<Chip
						label={`${imageCount} image${imageCount !== 1 ? 's' : ''}`}
						size="small"
						color={imageCount > 0 ? 'success' : 'default'}
						variant="outlined"
					/>
				);
			},
		},
		{
			field: 'contactInfo',
			headerName: 'Contact',
			width: 120,
			renderCell: params => {
				const contact = params.value;
				return contact?.broker ? (
					<Box display="flex" alignItems="center" gap={0.5}>
						<PhoneIcon fontSize="small" color="action" />
						<Typography variant="caption">{contact.broker}</Typography>
					</Box>
				) : (
					<Typography variant="caption" color="text.secondary">
						N/A
					</Typography>
				);
			},
		},
		{
			field: 'actions',
			headerName: 'Actions',
			width: 120,
			sortable: false,
			renderCell: params => (
				<Button
					variant="outlined"
					size="small"
					onClick={() => {
						setSelectedAircraft(params.row);
						setShowDetails(true);
					}}
					startIcon={<EyeIcon />}
				>
					View
				</Button>
			),
		},
	];

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'ACTIVE':
				return 'success';
			case 'SOLD':
				return 'error';
			case 'UNDER_CONTRACT':
				return 'warning';
			default:
				return 'default';
		}
	};

	if (loading) {
		return (
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
					<CircularProgress />
				</Box>
			</Container>
		);
	}

	return (
		<Container maxWidth="xl" sx={{ py: 4 }}>
			<Fade in timeout={800}>
				<Box>
					{/* Header */}
					<Box mb={4}>
						<Typography variant="h4" gutterBottom fontWeight={600}>
							Aircraft Market Evaluation
						</Typography>
						<Typography variant="body1" color="text.secondary">
							Comprehensive market analysis powered by JetNet API
						</Typography>
					</Box>

					{/* Report Generation */}
					<Fade in timeout={800}>
						<Card sx={{ mb: 4 }}>
							<CardContent>
								<Typography variant="h6" fontWeight={600} gutterBottom>
									Report Generation
								</Typography>
								<Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
									<Box flex={1}>
										<FormControl fullWidth>
											<InputLabel>Report Type</InputLabel>
											<Select
												value={reportType}
												onChange={e => setReportType(e.target.value)}
												label="Report Type"
											>
												<MenuItem value="comprehensive">Comprehensive Market Analysis</MenuItem>
												<MenuItem value="pricing">Pricing Analysis</MenuItem>
												<MenuItem value="competition">Competition Analysis</MenuItem>
												<MenuItem value="trends">Market Trends</MenuItem>
											</Select>
										</FormControl>
									</Box>
									<Box flex={1}>
										<Button
											onClick={generateReport}
											disabled={isGeneratingReport}
											variant="contained"
											size="large"
											startIcon={<BarChartIcon />}
											fullWidth
										>
											{isGeneratingReport ? 'Generating...' : 'Generate Report'}
										</Button>
									</Box>
								</Box>
							</CardContent>
						</Card>
					</Fade>

					{/* Stats Cards */}
					<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
						<Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
							<Card>
								<CardContent>
									<Box display="flex" justifyContent="between" alignItems="center">
										<Box>
											<Typography color="text.secondary" gutterBottom>
												Total Aircraft
											</Typography>
											<Typography variant="h4" component="div">
												{aircraft.length}
											</Typography>
										</Box>
										<PlaneIcon color="primary" sx={{ fontSize: 40 }} />
									</Box>
								</CardContent>
							</Card>
						</Box>
						<Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
							<Card>
								<CardContent>
									<Box display="flex" justifyContent="between" alignItems="center">
										<Box>
											<Typography color="text.secondary" gutterBottom>
												Active Listings
											</Typography>
											<Typography variant="h4" component="div">
												{aircraft.filter(a => a.status === 'ACTIVE').length}
											</Typography>
										</Box>
										<DollarIcon color="primary" sx={{ fontSize: 40 }} />
									</Box>
								</CardContent>
							</Card>
						</Box>
						<Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
							<Card>
								<CardContent>
									<Box display="flex" justifyContent="between" alignItems="center">
										<Box>
											<Typography color="text.secondary" gutterBottom>
												Sold Aircraft
											</Typography>
											<Typography variant="h4" component="div">
												{aircraft.filter(a => a.status === 'SOLD').length}
											</Typography>
										</Box>
										<SettingsIcon color="primary" sx={{ fontSize: 40 }} />
									</Box>
								</CardContent>
							</Card>
						</Box>
						<Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
							<Card>
								<CardContent>
									<Box display="flex" justifyContent="between" alignItems="center">
										<Box>
											<Typography color="text.secondary" gutterBottom>
												Avg. Price
											</Typography>
											<Typography variant="h4" component="div">
												$2.5M
											</Typography>
										</Box>
										<WrenchIcon color="primary" sx={{ fontSize: 40 }} />
									</Box>
								</CardContent>
							</Card>
						</Box>
					</Box>

					{/* Filters */}
					<Card sx={{ mb: 4 }}>
						<CardContent>
							<Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
								<FilterIcon />
								Search & Filters
							</Typography>
							<Grid container spacing={3}>
								<Grid xs={12} md={4}>
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
								</Grid>
								<Grid xs={12} md={4}>
									<FormControl fullWidth>
										<InputLabel>Manufacturer</InputLabel>
										<Select
											value={selectedManufacturer}
											onChange={e => setSelectedManufacturer(e.target.value)}
											label="Manufacturer"
										>
											<MenuItem value="all">All Manufacturers</MenuItem>
											<MenuItem value="GULFSTREAM">Gulfstream</MenuItem>
											<MenuItem value="BOMBARDIER">Bombardier</MenuItem>
											<MenuItem value="CESSNA">Cessna</MenuItem>
											<MenuItem value="DASSAULT">Dassault</MenuItem>
											<MenuItem value="EMBRAER">Embraer</MenuItem>
										</Select>
									</FormControl>
								</Grid>
								<Grid xs={12} md={4}>
									<FormControl fullWidth>
										<InputLabel>Status</InputLabel>
										<Select
											value={selectedStatus}
											onChange={e => setSelectedStatus(e.target.value)}
											label="Status"
										>
											<MenuItem value="all">All Status</MenuItem>
											<MenuItem value="ACTIVE">Active</MenuItem>
											<MenuItem value="SOLD">Sold</MenuItem>
											<MenuItem value="UNDER_CONTRACT">Under Contract</MenuItem>
										</Select>
									</FormControl>
								</Grid>
							</Grid>
						</CardContent>
					</Card>

					{/* Aircraft Data Table */}
					<Card>
						<CardContent>
							<Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
								<PlaneIcon />
								Aircraft Inventory ({filteredAircraft.length} aircraft)
							</Typography>
							<Box sx={{ height: 600, width: '100%' }}>
								<DataGrid
									rows={filteredAircraft}
									columns={columns}
									initialState={{
										pagination: {
											paginationModel: { page: 0, pageSize: 25 },
										},
									}}
									pageSizeOptions={[25, 50, 100]}
									disableRowSelectionOnClick
									loading={loading}
									sx={{
										'& .MuiDataGrid-root': {
											border: 'none',
										},
										'& .MuiDataGrid-cell': {
											borderBottom: '1px solid #f0f0f0',
										},
										'& .MuiDataGrid-columnHeaders': {
											backgroundColor: '#f8f9fa',
											borderBottom: '2px solid #e9ecef',
										},
									}}
								/>
							</Box>
						</CardContent>
					</Card>

					{/* Aircraft Details Dialog */}
					<Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="md" fullWidth>
						<DialogTitle display="flex" alignItems="center" gap={1}>
							<PlaneIcon />
							Aircraft Details
						</DialogTitle>
						<DialogContent>
							{selectedAircraft && (
								<Grid container spacing={3}>
									<Grid item xs={12} md={6} component="div">
										<Typography variant="h6" gutterBottom>
											{selectedAircraft.manufacturer} {selectedAircraft.model}
										</Typography>
										<Typography color="text.secondary" paragraph>
											Year: {selectedAircraft.year}
										</Typography>
										<Typography color="text.secondary" paragraph>
											Status:{' '}
											<Chip
												label={selectedAircraft.status}
												color={
													getStatusColor(selectedAircraft.status) as
														| 'success'
														| 'error'
														| 'warning'
														| 'default'
												}
												size="small"
											/>
										</Typography>
										{selectedAircraft.askingPrice && (
											<Typography color="text.secondary" paragraph>
												Price: ${selectedAircraft.askingPrice.toLocaleString()}
											</Typography>
										)}
									</Grid>
									<Grid item xs={12} md={6} component="div">
										<Typography variant="body2" color="text.secondary">
											Serial Number: {selectedAircraft.serialNumber || 'N/A'}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Registration: {selectedAircraft.registration || 'N/A'}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Location: {selectedAircraft.location || 'N/A'}
										</Typography>
									</Grid>
								</Grid>
							)}
						</DialogContent>
						<DialogActions>
							<Button onClick={() => setShowDetails(false)}>Close</Button>
						</DialogActions>
					</Dialog>
				</Box>
			</Fade>
		</Container>
	);
}
