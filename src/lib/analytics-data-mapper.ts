// Comprehensive Analytics Data Mapper
// Maps and transforms data from all endpoints for analytics dashboard

export interface ComprehensiveAircraftData {
	// Core identification
	id: string;
	aircraftId?: number;
	registration?: string;
	serialNumber?: string;
	name?: string;

	// Basic aircraft info
	manufacturer: string;
	model: string;
	variant?: string;
	year?: number;
	yearManufactured?: number;
	yearDelivered?: number;

	// Pricing and market
	price?: number;
	askingPrice?: number;
	currency?: string;
	status: string;
	forSale?: boolean;
	marketStatus?: string;
	exclusive?: string;
	leased?: string;
	dateListed?: string;

	// Location and base
	location?: string;
	baseCity?: string;
	baseState?: string;
	baseCountry?: string;
	baseAirportId?: string;
	baseIcaoCode?: string;
	baseIataCode?: string;

	// Flight data
	totalTimeHours?: number;
	engineHours?: number;
	apuHours?: number;
	cycles?: number;
	estimatedAftt?: number;

	// Technical specifications
	engineSn1?: string;
	engineSn2?: string;
	avionics?: string;
	passengers?: string;
	engines?: string;
	maxRange?: number;
	maxSpeed?: number;
	maxAltitude?: number;

	// Images and media
	image?: string;
	photos?: string;
	images?: Array<{
		id: string;
		url: string;
		thumbnailUrl?: string;
		type: string;
		caption?: string;
		isHero?: boolean;
		order?: number;
	}>;

	// Ownership and relationships
	companyRelations?: Array<{
		id: string;
		companyId: string;
		relationshipType: string;
		status: boolean;
		startDate?: string;
		endDate?: string;
	}>;

	// Market data
	marketDataRecords?: Array<{
		id: string;
		category: string;
		avgPrice?: number;
		minPrice?: number;
		maxPrice?: number;
		totalListings?: number;
		priceTrend?: string;
		marketTrend?: string;
		dataDate: string;
		source: string;
	}>;

	// Lead scoring
	leadScores?: Array<{
		id: string;
		priorityLevel: string;
		commissionPotential?: number;
		tags: string[];
		researchStatus: string;
		notes?: string;
		ghlContactId?: string;
		ghlOpportunityId?: string;
	}>;

	// Reports and evaluations
	reports?: Array<{
		id: string;
		title: string;
		type: string;
		status: string;
		generatedAt?: string;
	}>;

	evaluations?: Array<{
		id: string;
		type: string;
		title: string;
		status: string;
		generatedAt: string;
	}>;

	// Timestamps
	createdAt: string;
	updatedAt: string;
	lastUpdated?: string;

	// Additional fields from raw data
	description?: string;
	notes?: string;
	specifications?: Record<string, unknown>;
	features?: string | string[];
	contactInfo?: Record<string, unknown>;
	maintenanceData?: string;
	ownershipData?: Record<string, unknown>;
	rawData?: Record<string, unknown>;
}

export interface AnalyticsFilters {
	// Basic filters
	manufacturer?: string;
	model?: string;
	variant?: string;
	yearMin?: number;
	yearMax?: number;
	priceMin?: number;
	priceMax?: number;
	location?: string;
	status?: string;
	forSale?: boolean;

	// Advanced filters
	totalTimeHoursMin?: number;
	totalTimeHoursMax?: number;
	engineHoursMin?: number;
	engineHoursMax?: number;
	baseCountry?: string;
	baseState?: string;
	registration?: string;
	serialNumber?: string;

	// Market filters
	priceTrend?: string;
	marketTrend?: string;
	exclusive?: boolean;
	leased?: boolean;

	// Date filters
	dateListedMin?: string;
	dateListedMax?: string;
	createdAtMin?: string;
	createdAtMax?: string;

	// Lead scoring filters
	priorityLevel?: string;
	researchStatus?: string;
	commissionPotentialMin?: number;
	commissionPotentialMax?: number;

	// Search
	search?: string;
}

export interface AnalyticsSortOptions {
	field: string;
	direction: 'asc' | 'desc';
}

export interface AnalyticsPagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export class AnalyticsDataMapper {
	/**
	 * Map raw aircraft data to comprehensive analytics format
	 */
	static mapAircraftData(rawData: Record<string, unknown>): ComprehensiveAircraftData {
		return {
			// Core identification
			id: String(rawData.id || rawData.aircraftId || ''),
			aircraftId: typeof rawData.aircraftId === 'number' ? rawData.aircraftId : undefined,
			registration: typeof rawData.registration === 'string' ? rawData.registration : undefined,
			serialNumber: typeof rawData.serialNumber === 'string' ? rawData.serialNumber : undefined,
			name: typeof rawData.name === 'string' ? rawData.name : undefined,

			// Basic aircraft info
			manufacturer: String(rawData.manufacturer || rawData.make || rawData.aircraftMake || ''),
			model: String(rawData.model || rawData.aircraftModel || ''),
			variant: typeof rawData.variant === 'string' ? rawData.variant : undefined,
			year: typeof rawData.year === 'number' ? rawData.year : undefined,
			yearManufactured:
				typeof rawData.yearManufactured === 'number' ? rawData.yearManufactured : undefined,
			yearDelivered: typeof rawData.yearDelivered === 'number' ? rawData.yearDelivered : undefined,

			// Pricing and market
			price: typeof rawData.price === 'number' ? rawData.price : undefined,
			askingPrice: typeof rawData.askingPrice === 'number' ? rawData.askingPrice : undefined,
			currency: String(rawData.currency || 'USD'),
			status: String(rawData.status || rawData.marketStatus || rawData.marketstatus || 'UNKNOWN'),
			forSale: Boolean(rawData.forSale ?? (rawData.forsale === 'Y' || rawData.forsale === true)),
			marketStatus: typeof rawData.marketStatus === 'string' ? rawData.marketStatus : undefined,
			exclusive: typeof rawData.exclusive === 'string' ? rawData.exclusive : undefined,
			leased: typeof rawData.leased === 'string' ? rawData.leased : undefined,
			dateListed: typeof rawData.dateListed === 'string' ? rawData.dateListed : undefined,

			// Location and base
			location: typeof rawData.location === 'string' ? rawData.location : undefined,
			baseCity: typeof rawData.baseCity === 'string' ? rawData.baseCity : undefined,
			baseState: typeof rawData.baseState === 'string' ? rawData.baseState : undefined,
			baseCountry: typeof rawData.baseCountry === 'string' ? rawData.baseCountry : undefined,
			baseAirportId: typeof rawData.baseAirportId === 'string' ? rawData.baseAirportId : undefined,
			baseIcaoCode: typeof rawData.baseIcaoCode === 'string' ? rawData.baseIcaoCode : undefined,
			baseIataCode: typeof rawData.baseIataCode === 'string' ? rawData.baseIataCode : undefined,

			// Flight data
			totalTimeHours:
				typeof rawData.totalTimeHours === 'number' ? rawData.totalTimeHours : undefined,
			engineHours: typeof rawData.engineHours === 'number' ? rawData.engineHours : undefined,
			apuHours: typeof rawData.apuHours === 'number' ? rawData.apuHours : undefined,
			cycles: typeof rawData.cycles === 'number' ? rawData.cycles : undefined,
			estimatedAftt: typeof rawData.estimatedAftt === 'number' ? rawData.estimatedAftt : undefined,

			// Technical specifications
			engineSn1: typeof rawData.engineSn1 === 'string' ? rawData.engineSn1 : undefined,
			engineSn2: typeof rawData.engineSn2 === 'string' ? rawData.engineSn2 : undefined,
			avionics: typeof rawData.avionics === 'string' ? rawData.avionics : undefined,
			passengers: typeof rawData.passengers === 'string' ? rawData.passengers : undefined,
			engines: typeof rawData.engines === 'string' ? rawData.engines : undefined,
			maxRange: typeof rawData.maxRange === 'number' ? rawData.maxRange : undefined,
			maxSpeed: typeof rawData.maxSpeed === 'number' ? rawData.maxSpeed : undefined,
			maxAltitude: typeof rawData.maxAltitude === 'number' ? rawData.maxAltitude : undefined,

			// Images and media
			image: typeof rawData.image === 'string' ? rawData.image : undefined,
			photos: typeof rawData.photos === 'string' ? rawData.photos : undefined,
			images: Array.isArray(rawData.images)
				? (rawData.images as ComprehensiveAircraftData['images'])
				: [],

			// Ownership and relationships
			companyRelations: Array.isArray(rawData.companyRelations)
				? (rawData.companyRelations as ComprehensiveAircraftData['companyRelations'])
				: [],

			// Market data
			marketDataRecords: Array.isArray(rawData.marketDataRecords)
				? (rawData.marketDataRecords as ComprehensiveAircraftData['marketDataRecords'])
				: [],

			// Lead scoring
			leadScores: Array.isArray(rawData.leadScores)
				? (rawData.leadScores as ComprehensiveAircraftData['leadScores'])
				: [],

			// Reports and evaluations
			reports: Array.isArray(rawData.reports)
				? (rawData.reports as ComprehensiveAircraftData['reports'])
				: [],
			evaluations: Array.isArray(rawData.evaluations)
				? (rawData.evaluations as ComprehensiveAircraftData['evaluations'])
				: [],

			// Timestamps
			createdAt: String(rawData.createdAt || rawData.created_at || new Date().toISOString()),
			updatedAt: String(rawData.updatedAt || rawData.updated_at || new Date().toISOString()),
			lastUpdated: typeof rawData.lastUpdated === 'string' ? rawData.lastUpdated : undefined,

			// Additional fields
			description: typeof rawData.description === 'string' ? rawData.description : undefined,
			notes: typeof rawData.notes === 'string' ? rawData.notes : undefined,
			specifications: rawData.specifications
				? typeof rawData.specifications === 'string'
					? JSON.parse(rawData.specifications)
					: (rawData.specifications as Record<string, unknown>)
				: {},
			features: rawData.features as string | string[] | undefined,
			contactInfo: rawData.contactInfo
				? typeof rawData.contactInfo === 'string'
					? JSON.parse(rawData.contactInfo)
					: (rawData.contactInfo as Record<string, unknown>)
				: {},
			maintenanceData:
				typeof rawData.maintenanceData === 'string' ? rawData.maintenanceData : undefined,
			ownershipData: rawData.ownershipData
				? typeof rawData.ownershipData === 'string'
					? JSON.parse(rawData.ownershipData)
					: (rawData.ownershipData as Record<string, unknown>)
				: {},
			rawData: (rawData.rawData as Record<string, unknown>) || rawData,
		};
	}

	/**
	 * Filter aircraft data based on analytics filters
	 */
	static filterAircraftData(
		data: ComprehensiveAircraftData[],
		filters: AnalyticsFilters
	): ComprehensiveAircraftData[] {
		return data.filter(aircraft => {
			// Basic filters
			if (
				filters.manufacturer &&
				!aircraft.manufacturer?.toLowerCase().includes(filters.manufacturer.toLowerCase())
			) {
				return false;
			}
			if (filters.model && !aircraft.model?.toLowerCase().includes(filters.model.toLowerCase())) {
				return false;
			}
			if (
				filters.variant &&
				!aircraft.variant?.toLowerCase().includes(filters.variant.toLowerCase())
			) {
				return false;
			}
			if (filters.yearMin && (aircraft.year || 0) < filters.yearMin) {
				return false;
			}
			if (filters.yearMax && (aircraft.year || 0) > filters.yearMax) {
				return false;
			}
			if (filters.priceMin && (aircraft.price || 0) < filters.priceMin) {
				return false;
			}
			if (filters.priceMax && (aircraft.price || 0) > filters.priceMax) {
				return false;
			}
			if (
				filters.location &&
				!aircraft.location?.toLowerCase().includes(filters.location.toLowerCase())
			) {
				return false;
			}
			if (filters.status && aircraft.status !== filters.status) {
				return false;
			}
			if (filters.forSale !== undefined && aircraft.forSale !== filters.forSale) {
				return false;
			}

			// Advanced filters
			if (filters.totalTimeHoursMin && (aircraft.totalTimeHours || 0) < filters.totalTimeHoursMin) {
				return false;
			}
			if (filters.totalTimeHoursMax && (aircraft.totalTimeHours || 0) > filters.totalTimeHoursMax) {
				return false;
			}
			if (filters.engineHoursMin && (aircraft.engineHours || 0) < filters.engineHoursMin) {
				return false;
			}
			if (filters.engineHoursMax && (aircraft.engineHours || 0) > filters.engineHoursMax) {
				return false;
			}
			if (filters.baseCountry && aircraft.baseCountry !== filters.baseCountry) {
				return false;
			}
			if (filters.baseState && aircraft.baseState !== filters.baseState) {
				return false;
			}
			if (
				filters.registration &&
				!aircraft.registration?.toLowerCase().includes(filters.registration.toLowerCase())
			) {
				return false;
			}
			if (
				filters.serialNumber &&
				!aircraft.serialNumber?.toLowerCase().includes(filters.serialNumber.toLowerCase())
			) {
				return false;
			}

			// Market filters
			if (
				filters.priceTrend &&
				aircraft.marketDataRecords?.some(md => md.priceTrend !== filters.priceTrend)
			) {
				return false;
			}
			if (
				filters.marketTrend &&
				aircraft.marketDataRecords?.some(md => md.marketTrend !== filters.marketTrend)
			) {
				return false;
			}
			if (filters.exclusive !== undefined && (aircraft.exclusive === 'Y') !== filters.exclusive) {
				return false;
			}
			if (filters.leased !== undefined && (aircraft.leased === 'Y') !== filters.leased) {
				return false;
			}

			// Date filters
			if (
				filters.dateListedMin &&
				aircraft.dateListed &&
				aircraft.dateListed < filters.dateListedMin
			) {
				return false;
			}
			if (
				filters.dateListedMax &&
				aircraft.dateListed &&
				aircraft.dateListed > filters.dateListedMax
			) {
				return false;
			}
			if (filters.createdAtMin && aircraft.createdAt < filters.createdAtMin) {
				return false;
			}
			if (filters.createdAtMax && aircraft.createdAt > filters.createdAtMax) {
				return false;
			}

			// Lead scoring filters
			if (
				filters.priorityLevel &&
				!aircraft.leadScores?.some(ls => ls.priorityLevel === filters.priorityLevel)
			) {
				return false;
			}
			if (
				filters.researchStatus &&
				!aircraft.leadScores?.some(ls => ls.researchStatus === filters.researchStatus)
			) {
				return false;
			}
			if (
				filters.commissionPotentialMin &&
				!aircraft.leadScores?.some(
					ls => (ls.commissionPotential || 0) >= filters.commissionPotentialMin!
				)
			) {
				return false;
			}
			if (
				filters.commissionPotentialMax &&
				!aircraft.leadScores?.some(
					ls => (ls.commissionPotential || 0) <= filters.commissionPotentialMax!
				)
			) {
				return false;
			}

			// Search filter
			if (filters.search) {
				const searchLower = filters.search.toLowerCase();
				const searchableFields = [
					aircraft.manufacturer,
					aircraft.model,
					aircraft.variant,
					aircraft.registration,
					aircraft.serialNumber,
					aircraft.location,
					aircraft.baseCity,
					aircraft.baseState,
					aircraft.baseCountry,
					aircraft.description,
					aircraft.notes,
				]
					.filter(Boolean)
					.join(' ')
					.toLowerCase();

				if (!searchableFields.includes(searchLower)) {
					return false;
				}
			}

			return true;
		});
	}

	/**
	 * Sort aircraft data
	 */
	static sortAircraftData(
		data: ComprehensiveAircraftData[],
		sortOptions: AnalyticsSortOptions
	): ComprehensiveAircraftData[] {
		return [...data].sort((a, b) => {
			const aValue = this.getNestedValue(a as Record<string, unknown>, sortOptions.field); 
			const bValue = this.getNestedValue(b as Record<string, unknown>, sortOptions.field);

			// Handle null/undefined values
			if (aValue == null && bValue == null) return 0;
			if (aValue == null) return sortOptions.direction === 'asc' ? 1 : -1;
			if (bValue == null) return sortOptions.direction === 'asc' ? -1 : 1;

			// Convert to numbers if possible
			const aNum = Number(aValue);
			const bNum = Number(bValue);
			if (!isNaN(aNum) && !isNaN(bNum)) {
				if (aNum < bNum) return sortOptions.direction === 'asc' ? -1 : 1;
				if (aNum > bNum) return sortOptions.direction === 'asc' ? 1 : -1;
				return 0;
			}

			// String comparison
			const aStr = String(aValue).toLowerCase();
			const bStr = String(bValue).toLowerCase();
			if (aStr < bStr) return sortOptions.direction === 'asc' ? -1 : 1;
			if (aStr > bStr) return sortOptions.direction === 'asc' ? 1 : -1;
			return 0;
		});
	}

	/**
	 * Get nested value from object using dot notation
	 */
	private static getNestedValue(obj: Record<string, unknown>, path: string): unknown {
		return path.split('.').reduce((current: unknown, key: string) => {
			if (current && typeof current === 'object' && key in current) {
				return (current as Record<string, unknown>)[key];
			}
			return undefined;
		}, obj);
	}

	/**
	 * Paginate data
	 */
	static paginateData<T>(
		data: T[],
		page: number,
		limit: number
	): { data: T[]; pagination: AnalyticsPagination } {
		const total = data.length;
		const totalPages = Math.ceil(total / limit);
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;

		return {
			data: data.slice(startIndex, endIndex),
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
		};
	}

	/**
	 * Generate analytics summary
	 */
	static generateAnalyticsSummary(data: ComprehensiveAircraftData[]) {
		const totalAircraft = data.length;
		const forSaleCount = data.filter(a => a.forSale).length;
		const totalValue = data.reduce((sum, a) => sum + (a.price || 0), 0);
		const averagePrice = totalAircraft > 0 ? totalValue / totalAircraft : 0;

		// Manufacturer distribution
		const manufacturerCounts = data.reduce((acc, a) => {
			acc[a.manufacturer] = (acc[a.manufacturer] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		// Year distribution
		const yearCounts = data.reduce((acc, a) => {
			if (a.year) {
				acc[a.year] = (acc[a.year] || 0) + 1;
			}
			return acc;
		}, {} as Record<number, number>);

		// Status distribution
		const statusCounts = data.reduce((acc, a) => {
			acc[a.status] = (acc[a.status] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		// Location distribution
		const locationCounts = data.reduce((acc, a) => {
			const loc = a.location || a.baseCity || a.baseCountry || 'Unknown';
			acc[loc] = (acc[loc] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		// Price ranges
		const priceRanges = [
			{ range: '0-1M', min: 0, max: 1000000 },
			{ range: '1M-5M', min: 1000000, max: 5000000 },
			{ range: '5M-10M', min: 5000000, max: 10000000 },
			{ range: '10M-25M', min: 10000000, max: 25000000 },
			{ range: '25M-50M', min: 25000000, max: 50000000 },
			{ range: '50M+', min: 50000000, max: Infinity },
		];

		const priceDistribution = priceRanges.map(range => ({
			range: range.range,
			count: data.filter(a => a.price && a.price >= range.min && a.price < range.max).length,
			percentage:
				totalAircraft > 0
					? (data.filter(a => a.price && a.price >= range.min && a.price < range.max).length /
							totalAircraft) *
					  100
					: 0,
		}));

		return {
			totalAircraft,
			forSaleCount,
			totalValue,
			averagePrice,
			manufacturerCounts,
			yearCounts,
			statusCounts,
			locationCounts,
			priceDistribution,
			topManufacturers: Object.entries(manufacturerCounts)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 10)
				.map(([manufacturer, count]) => ({ manufacturer, count })),
			recentAircraft: data
				.filter(a => a.createdAt)
				.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
				.slice(0, 10),
		};
	}
}
