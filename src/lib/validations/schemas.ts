import { z } from 'zod';

// Common validation schemas
export const paginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(10000).default(1000), // Increased limit to 10,000
});

export const sortSchema = z.object({
	sortBy: z.string().default('lastUpdated'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Aircraft validation schemas
export const aircraftFiltersSchema = z
	.object({
		minPrice: z.coerce.number().positive().optional(),
		maxPrice: z.coerce.number().positive().optional(),
		minYear: z.coerce
			.number()
			.int()
			.min(1900)
			.max(new Date().getFullYear() + 1)
			.optional(),
		maxYear: z.coerce
			.number()
			.int()
			.min(1900)
			.max(new Date().getFullYear() + 1)
			.optional(),
		manufacturer: z.string().min(1).max(100).optional(),
		status: z
			.enum(['AVAILABLE', 'SOLD', 'UNDER_CONTRACT', 'MAINTENANCE', 'INSPECTION', 'WITHDRAWN'])
			.optional(),
		location: z.string().min(1).max(200).optional(),
		minHours: z.coerce.number().nonnegative().optional(),
		maxHours: z.coerce.number().nonnegative().optional(),
		recent: z.coerce.boolean().optional(),
	})
	.refine(
		data => {
			if (data.minPrice && data.maxPrice) {
				return data.minPrice <= data.maxPrice;
			}
			return true;
		},
		{
			message: 'minPrice must be less than or equal to maxPrice',
			path: ['minPrice'],
		}
	)
	.refine(
		data => {
			if (data.minYear && data.maxYear) {
				return data.minYear <= data.maxYear;
			}
			return true;
		},
		{
			message: 'minYear must be less than or equal to maxYear',
			path: ['minYear'],
		}
	)
	.refine(
		data => {
			if (data.minHours && data.maxHours) {
				return data.minHours <= data.maxHours;
			}
			return true;
		},
		{
			message: 'minHours must be less than or equal to maxHours',
			path: ['minHours'],
		}
	);

export const aircraftQuerySchema = paginationSchema.merge(sortSchema).merge(aircraftFiltersSchema);

export const aircraftSearchSchema = z.object({
	searchTerm: z.string().min(1).max(200), // Increased search term length
	limit: z.coerce.number().int().min(1).max(10000).default(1000), // Increased limit
});

// Aircraft creation/update schemas
export const aircraftCreateSchema = z.object({
	aircraftId: z.number().int().positive().optional(),
	manufacturer: z.string().min(1).max(100),
	model: z.string().min(1).max(100),
	variant: z.string().max(100).optional(),
	year: z
		.number()
		.int()
		.min(1900)
		.max(new Date().getFullYear() + 1)
		.optional(),
	yearManufactured: z
		.number()
		.int()
		.min(1900)
		.max(new Date().getFullYear() + 1)
		.optional(),
	price: z.number().positive().optional(),
	askingPrice: z.number().positive().optional(),
	currency: z.string().length(3).default('USD'),
	location: z.string().max(200).optional(),
	status: z
		.enum(['AVAILABLE', 'SOLD', 'UNDER_CONTRACT', 'MAINTENANCE', 'INSPECTION', 'WITHDRAWN'])
		.default('AVAILABLE'),
	image: z.string().url().optional(),
	description: z.string().max(2000).optional(),
	specifications: z.string().max(5000).optional(),
	features: z.string().max(2000).optional(),
	contactInfo: z.string().max(500).optional(),
	marketData: z.string().max(10000).optional(),
	maintenanceData: z.string().max(5000).optional(),
	ownershipData: z.string().max(2000).optional(),
	registration: z.string().max(20).optional(),
	make: z.string().max(100).optional(),
	serialNumber: z.string().max(50).optional(),
	forSale: z.boolean().default(true),
	totalTimeHours: z.number().nonnegative().optional(),
	engineHours: z.number().nonnegative().optional(),
	dateListed: z.coerce.date().optional(),
});

export const aircraftUpdateSchema = aircraftCreateSchema.partial();

// JetNet sync schemas
export const jetNetAircraftSchema = z.object({
	aircraftId: z.union([z.string(), z.number()]).optional(),
	make: z.string().optional(),
	model: z.string().optional(),
	year: z.union([z.string(), z.number()]).optional(),
	yearManufactured: z.union([z.string(), z.number()]).optional(),
	price: z.union([z.string(), z.number()]).optional(),
	askingPrice: z.union([z.string(), z.number()]).optional(),
	location: z.string().optional(),
	registration: z.string().optional(),
	serialNumber: z.string().optional(),
	forsale: z.union([z.string(), z.boolean()]).optional(),
	totalTimeHours: z.union([z.string(), z.number()]).optional(),
	listDate: z.string().optional(),
	notes: z.string().optional(),
	avionics: z.string().optional(),
	passengers: z.union([z.string(), z.number()]).optional(),
	engineSn1: z.string().optional(),
	engineSn2: z.string().optional(),
	estimatedAftt: z.union([z.string(), z.number()]).optional(),
	baseCity: z.string().optional(),
	baseState: z.string().optional(),
	baseCountry: z.string().optional(),
	baseAirportId: z.union([z.string(), z.number()]).optional(),
	baseIcaoCode: z.string().optional(),
	baseIataCode: z.string().optional(),
	exclusive: z.union([z.string(), z.boolean()]).optional(),
	leased: z.union([z.string(), z.boolean()]).optional(),
	marketStatus: z.string().optional(),
});

export const jetNetSyncRequestSchema = z.object({
	aircraft: jetNetAircraftSchema,
	source: z.string().optional(),
});

// User validation schemas
export const userRegistrationSchema = z.object({
	email: z.string().email(),
	name: z.string().min(1).max(100),
	password: z.string().min(8).max(100),
});

export const userLoginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

export const userUpdateSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	email: z.string().email().optional(),
	role: z.enum(['ADMIN', 'MANAGER', 'USER', 'VIEWER']).optional(),
	isActive: z.boolean().optional(),
});

// Contact validation schemas
export const contactCreateSchema = z.object({
	contactId: z.number().int().positive().optional(),
	companyId: z.number().int().positive().optional(),
	firstName: z.string().min(1).max(50).optional(),
	lastName: z.string().min(1).max(50).optional(),
	title: z.string().max(100).optional(),
	email: z.string().email().optional(),
	phone: z.string().max(20).optional(),
	mobile: z.string().max(20).optional(),
	name: z.string().min(1).max(100).optional(),
	company: z.string().max(100).optional(),
	position: z.string().max(100).optional(),
	status: z.enum(['LEAD', 'PROSPECT', 'CUSTOMER', 'INACTIVE']).default('LEAD'),
});

export const contactUpdateSchema = contactCreateSchema.partial();

// Opportunity validation schemas
export const opportunityCreateSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(2000).optional(),
	value: z.number().positive().optional(),
	currency: z.string().length(3).default('USD'),
	stage: z
		.enum(['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'])
		.default('QUALIFIED'),
	probability: z.number().int().min(0).max(100).default(50),
	expectedCloseDate: z.coerce.date().optional(),
	actualCloseDate: z.coerce.date().optional(),
	status: z.enum(['OPEN', 'WON', 'LOST', 'CANCELLED']).default('OPEN'),
	source: z.string().max(100).optional(),
	notes: z.string().max(2000).optional(),
	customFields: z.string().max(5000).optional(),
	userId: z.string().cuid().optional(),
	contactId: z.string().cuid().optional(),
	aircraftId: z.string().cuid().optional(),
});

export const opportunityUpdateSchema = opportunityCreateSchema.partial();

// Report validation schemas
export const reportCreateSchema = z.object({
	title: z.string().min(1).max(200),
	type: z.enum([
		'SALES_SUMMARY',
		'MARKET_ANALYSIS',
		'CONTACT_REPORT',
		'OPPORTUNITY_PIPELINE',
		'AIRCRAFT_INVENTORY',
		'CUSTOM',
	]),
	description: z.string().max(2000).optional(),
	parameters: z.string().max(5000).optional(),
	userId: z.string().cuid().optional(),
	aircraftId: z.string().cuid().optional(),
});

export const reportUpdateSchema = reportCreateSchema.partial();

// Alert validation schemas
export const alertCreateSchema = z.object({
	title: z.string().min(1).max(200),
	message: z.string().min(1).max(2000),
	type: z.enum(['SYSTEM', 'MARKET', 'CONTACT', 'OPPORTUNITY', 'AIRCRAFT', 'CUSTOM']),
	priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
	status: z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']).default('ACTIVE'),
	actionUrl: z.string().url().optional(),
	metadata: z.string().max(5000).optional(),
	expiresAt: z.coerce.date().optional(),
	userId: z.string().cuid().optional(),
	contactId: z.string().cuid().optional(),
	aircraftId: z.string().cuid().optional(),
});

export const alertUpdateSchema = alertCreateSchema.partial();

// Sync log validation schemas
export const syncLogCreateSchema = z.object({
	syncType: z.string().min(1).max(100),
	status: z.string().min(1).max(50),
	recordsProcessed: z.number().int().nonnegative().default(0),
	recordsCreated: z.number().int().nonnegative().default(0),
	recordsUpdated: z.number().int().nonnegative().default(0),
	errorMessage: z.string().max(2000).optional(),
	syncDurationMs: z.number().int().nonnegative().optional(),
	metadata: z.string().max(5000).optional(),
});

// Market data validation schemas
export const marketDataCreateSchema = z.object({
	aircraftId: z.string().cuid().optional(),
	make: z.string().min(1).max(100),
	model: z.string().min(1).max(100),
	category: z.string().min(1).max(100),
	avgPrice: z.number().nonnegative(),
	minPrice: z.number().nonnegative(),
	maxPrice: z.number().nonnegative(),
	totalListings: z.number().int().nonnegative(),
	avgDaysOnMarket: z.number().int().nonnegative(),
	priceTrend: z.enum(['RISING', 'FALLING', 'STABLE', 'VOLATILE']),
	marketTrend: z.enum(['HOT', 'WARM', 'COOL', 'COLD']),
	dataDate: z.coerce.date(),
	source: z.string().max(100).default('JetNet'),
	rawData: z.string().max(10000).optional(),
});

// System configuration validation schemas
export const systemConfigCreateSchema = z.object({
	key: z.string().min(1).max(100),
	value: z.string().max(5000),
	description: z.string().max(500).optional(),
	isEncrypted: z.boolean().default(false),
});

export const systemConfigUpdateSchema = systemConfigCreateSchema.partial().omit({ key: true });

// Export all schemas for easy access
export const schemas = {
	pagination: paginationSchema,
	sort: sortSchema,
	aircraftFilters: aircraftFiltersSchema,
	aircraftQuery: aircraftQuerySchema,
	aircraftSearch: aircraftSearchSchema,
	aircraftCreate: aircraftCreateSchema,
	aircraftUpdate: aircraftUpdateSchema,
	jetNetAircraft: jetNetAircraftSchema,
	jetNetSyncRequest: jetNetSyncRequestSchema,
	userRegistration: userRegistrationSchema,
	userLogin: userLoginSchema,
	userUpdate: userUpdateSchema,
	contactCreate: contactCreateSchema,
	contactUpdate: contactUpdateSchema,
	opportunityCreate: opportunityCreateSchema,
	opportunityUpdate: opportunityUpdateSchema,
	reportCreate: reportCreateSchema,
	reportUpdate: reportUpdateSchema,
	alertCreate: alertCreateSchema,
	alertUpdate: alertUpdateSchema,
	syncLogCreate: syncLogCreateSchema,
	marketDataCreate: marketDataCreateSchema,
	systemConfigCreate: systemConfigCreateSchema,
	systemConfigUpdate: systemConfigUpdateSchema,
};
