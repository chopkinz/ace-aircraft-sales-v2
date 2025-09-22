import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { log } from '@/lib/logging/logger';

// Cache configuration
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for more frequent updates
const cache = new Map<string, { data: Record<string, unknown>; timestamp: number }>();

// Comprehensive aircraft data endpoint with no limits
export const GET = async (req: NextRequest) => {
	try {
		const { searchParams } = new URL(req.url);
		const requestId = crypto.randomUUID();

		log.info('Comprehensive aircraft data request started', {
			requestId,
			component: 'api',
			action: 'comprehensive_aircraft_request',
			metadata: {
				method: req.method,
				url: req.url,
				searchParams: Object.fromEntries(searchParams.entries()),
			},
		});

		// Create cache key from search parameters
		const cacheKey = searchParams.toString();
		const cached = cache.get(cacheKey);

		// Return cached data if still valid
		if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
			return NextResponse.json(cached.data, {
				headers: {
					'Cache-Control': 'public, max-age=120', // 2 minutes
					'X-Cache': 'HIT',
					'X-Request-ID': requestId,
				},
			});
		}

		// Pagination parameters - No limits for comprehensive data access
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '10000'); // No practical limit
		const offset = (page - 1) * limit;

		// Comprehensive filtering parameters
		const manufacturer = searchParams.get('manufacturer');
		const model = searchParams.get('model');
		const yearMin = searchParams.get('yearMin');
		const yearMax = searchParams.get('yearMax');
		const priceMin = searchParams.get('priceMin');
		const priceMax = searchParams.get('priceMax');
		const location = searchParams.get('location');
		const status = searchParams.get('status');
		const forSale = searchParams.get('forSale');
		const registration = searchParams.get('registration');
		const serialNumber = searchParams.get('serialNumber');
		const make = searchParams.get('make');
		const variant = searchParams.get('variant');

		// Advanced filtering parameters for enriched data
		const engineType = searchParams.get('engineType');
		const avionicsSuite = searchParams.get('avionicsSuite');
		const interiorYear = searchParams.get('interiorYear');
		const exteriorYear = searchParams.get('exteriorYear');
		const maintenanceDue = searchParams.get('maintenanceDue');
		const features = searchParams.get('features');
		const additionalEquipment = searchParams.get('additionalEquipment');
		const marketPosition = searchParams.get('marketPosition');
		const exclusivity = searchParams.get('exclusivity');
		const leaseStatus = searchParams.get('leaseStatus');
		const totalTimeHoursMin = searchParams.get('totalTimeHoursMin');
		const totalTimeHoursMax = searchParams.get('totalTimeHoursMax');
		const engineHoursMin = searchParams.get('engineHoursMin');
		const engineHoursMax = searchParams.get('engineHoursMax');

		// Sorting parameters
		const sortBy = searchParams.get('sortBy') || 'createdAt';
		const sortOrder = searchParams.get('sortOrder') || 'desc';

		// Search parameter
		const search = searchParams.get('search');

		// Report generation parameters
		const generateReport = searchParams.get('generateReport') === 'true';
		const reportType = searchParams.get('reportType') || 'comprehensive';

		// Build comprehensive where clause
		const where: Record<string, unknown> = {};

		// Basic filters
		if (manufacturer) {
			where.manufacturer = { contains: manufacturer, mode: 'insensitive' };
		}

		if (model) {
			where.model = { contains: model, mode: 'insensitive' };
		}

		if (make) {
			where.make = { contains: make, mode: 'insensitive' };
		}

		if (variant) {
			where.variant = { contains: variant, mode: 'insensitive' };
		}

		if (yearMin || yearMax) {
			(where as Record<string, unknown>).year = {};
			if (yearMin) {
				const yearObj = (where as Record<string, unknown>).year as Record<string, unknown>;
				yearObj.gte = parseInt(yearMin);
			}
			if (yearMax) {
				const yearObj = (where as Record<string, unknown>).year as Record<string, unknown>;
				yearObj.lte = parseInt(yearMax);
			}
		}

		if (priceMin || priceMax) {
			(where as Record<string, unknown>).price = {};
			if (priceMin) {
				const priceObj = (where as Record<string, unknown>).price as Record<string, unknown>;
				priceObj.gte = parseInt(priceMin);
			}
			if (priceMax) {
				const priceObj = (where as Record<string, unknown>).price as Record<string, unknown>;
				priceObj.lte = parseInt(priceMax);
			}
		}

		if (location) {
			where.location = { contains: location, mode: 'insensitive' };
		}

		if (status) {
			where.status = status;
		}

		if (forSale !== null && forSale !== undefined) {
			where.forSale = forSale === 'true';
		}

		if (registration) {
			where.registration = { contains: registration, mode: 'insensitive' };
		}

		if (serialNumber) {
			where.serialNumber = { contains: serialNumber, mode: 'insensitive' };
		}

		// Advanced filters for enriched data
		if (engineType) {
			where.features = { contains: engineType, mode: 'insensitive' };
		}

		if (avionicsSuite) {
			where.features = { contains: avionicsSuite, mode: 'insensitive' };
		}

		if (interiorYear) {
			where.features = { contains: `"interiorYear":${interiorYear}`, mode: 'insensitive' };
		}

		if (exteriorYear) {
			where.features = { contains: `"exteriorYear":${exteriorYear}`, mode: 'insensitive' };
		}

		if (maintenanceDue) {
			where.maintenanceData = { contains: `"nextDueDays":${maintenanceDue}`, mode: 'insensitive' };
		}

		if (features) {
			where.features = { contains: features, mode: 'insensitive' };
		}

		if (additionalEquipment) {
			where.features = { contains: additionalEquipment, mode: 'insensitive' };
		}

		if (marketPosition) {
			where.marketData = { contains: marketPosition, mode: 'insensitive' };
		}

		if (exclusivity) {
			where.marketData = { contains: exclusivity, mode: 'insensitive' };
		}

		if (leaseStatus) {
			where.marketData = { contains: leaseStatus, mode: 'insensitive' };
		}

		// Time-based filters
		if (totalTimeHoursMin || totalTimeHoursMax) {
			(where as Record<string, unknown>).totalTimeHours = {};
			if (totalTimeHoursMin) {
				const timeObj = (where as Record<string, unknown>).totalTimeHours as Record<
					string,
					unknown
				>;
				timeObj.gte = parseInt(totalTimeHoursMin);
			}
			if (totalTimeHoursMax) {
				const timeObj = (where as Record<string, unknown>).totalTimeHours as Record<
					string,
					unknown
				>;
				timeObj.lte = parseInt(totalTimeHoursMax);
			}
		}

		if (engineHoursMin || engineHoursMax) {
			(where as Record<string, unknown>).engineHours = {};
			if (engineHoursMin) {
				const engineObj = (where as Record<string, unknown>).engineHours as Record<string, unknown>;
				engineObj.gte = parseInt(engineHoursMin);
			}
			if (engineHoursMax) {
				const engineObj = (where as Record<string, unknown>).engineHours as Record<string, unknown>;
				engineObj.lte = parseInt(engineHoursMax);
			}
		}

		// Global search across all fields including enriched data
		if (search) {
			where.OR = [
				{ manufacturer: { contains: search, mode: 'insensitive' } },
				{ model: { contains: search, mode: 'insensitive' } },
				{ make: { contains: search, mode: 'insensitive' } },
				{ variant: { contains: search, mode: 'insensitive' } },
				{ registration: { contains: search, mode: 'insensitive' } },
				{ serialNumber: { contains: search, mode: 'insensitive' } },
				{ location: { contains: search, mode: 'insensitive' } },
				{ features: { contains: search, mode: 'insensitive' } },
				{ specifications: { contains: search, mode: 'insensitive' } },
				{ marketData: { contains: search, mode: 'insensitive' } },
				{ maintenanceData: { contains: search, mode: 'insensitive' } },
				{ contactInfo: { contains: search, mode: 'insensitive' } },
				{ ownershipData: { contains: search, mode: 'insensitive' } },
				{ description: { contains: search, mode: 'insensitive' } },
			];
		}

		// Build orderBy clause
		const orderBy: Record<string, unknown> = {};
		orderBy[sortBy] = sortOrder;

		// Get total count for pagination
		const totalCount = await prisma.aircraft.count({ where });

		// Get aircraft with comprehensive data and pagination
		const aircraft = await prisma.aircraft.findMany({
			where,
			orderBy,
			skip: offset,
			take: limit,
			include: {
				images: true,
				marketDataRecords: true,
				reports: true,
				opportunities: true,
			},
		});

		// Parse JSON fields for easier frontend consumption
		const enrichedAircraft =
			aircraft && Array.isArray(aircraft)
				? aircraft.map(aircraft => ({
						...aircraft,
						specifications: aircraft.specifications ? JSON.parse(aircraft.specifications) : null,
						features: aircraft.features ? JSON.parse(aircraft.features) : null,
						contactInfo: aircraft.contactInfo ? JSON.parse(aircraft.contactInfo) : null,
						marketData: aircraft.marketData ? JSON.parse(aircraft.marketData) : null,
						maintenanceData: aircraft.maintenanceData ? JSON.parse(aircraft.maintenanceData) : null,
						ownershipData: aircraft.ownershipData ? JSON.parse(aircraft.ownershipData) : null,
				  }))
				: [];

		// Get comprehensive filter options for UI
		const [
			manufacturers,
			models,
			makes,
			variants,
			locations,
			statuses,
			registrations,
			serialNumbers,
		] = await Promise.all([
			prisma.aircraft.findMany({
				select: { manufacturer: true },
				distinct: ['manufacturer'],
				orderBy: { manufacturer: 'asc' },
			}),
			prisma.aircraft.findMany({
				select: { model: true },
				distinct: ['model'],
				orderBy: { model: 'asc' },
			}),
			prisma.aircraft.findMany({
				select: { make: true },
				distinct: ['make'],
				where: { make: { not: null } },
				orderBy: { make: 'asc' },
			}),
			prisma.aircraft.findMany({
				select: { variant: true },
				distinct: ['variant'],
				where: { variant: { not: null } },
				orderBy: { variant: 'asc' },
			}),
			prisma.aircraft.findMany({
				select: { location: true },
				distinct: ['location'],
				where: { location: { not: null } },
				orderBy: { location: 'asc' },
			}),
			prisma.aircraft.findMany({
				select: { status: true },
				distinct: ['status'],
				orderBy: { status: 'asc' },
			}),
			prisma.aircraft.findMany({
				select: { registration: true },
				distinct: ['registration'],
				where: { registration: { not: null } },
				orderBy: { registration: 'asc' },
			}),
			prisma.aircraft.findMany({
				select: { serialNumber: true },
				distinct: ['serialNumber'],
				where: { serialNumber: { not: null } },
				orderBy: { serialNumber: 'asc' },
			}),
		]);

		// Get comprehensive ranges for UI
		const [priceRange, yearRange, timeRange, engineRange] = await Promise.all([
			prisma.aircraft.aggregate({
				_min: { price: true },
				_max: { price: true },
				where: { price: { not: null } },
			}),
			prisma.aircraft.aggregate({
				_min: { year: true },
				_max: { year: true },
				where: { year: { not: null } },
			}),
			prisma.aircraft.aggregate({
				_min: { totalTimeHours: true },
				_max: { totalTimeHours: true },
				where: { totalTimeHours: { not: null } },
			}),
			prisma.aircraft.aggregate({
				_min: { engineHours: true },
				_max: { engineHours: true },
				where: { engineHours: { not: null } },
			}),
		]);

		// Generate comprehensive statistics
		const stats = await (async () => {
			const [
				totalAircraft,
				activeListings,
				totalValue,
				avgPrice,
				avgYear,
				avgTimeHours,
				avgEngineHours,
				statusBreakdown,
				manufacturerBreakdown,
				yearBreakdown,
			] = await Promise.all([
				prisma.aircraft.count(),
				prisma.aircraft.count({ where: { forSale: true } }),
				prisma.aircraft.aggregate({
					_sum: { price: true },
					where: { price: { not: null } },
				}),
				prisma.aircraft.aggregate({
					_avg: { price: true },
					where: { price: { not: null } },
				}),
				prisma.aircraft.aggregate({
					_avg: { year: true },
					where: { year: { not: null } },
				}),
				prisma.aircraft.aggregate({
					_avg: { totalTimeHours: true },
					where: { totalTimeHours: { not: null } },
				}),
				prisma.aircraft.aggregate({
					_avg: { engineHours: true },
					where: { engineHours: { not: null } },
				}),
				prisma.aircraft.groupBy({
					by: ['status'],
					_count: { status: true },
				}),
				prisma.aircraft.groupBy({
					by: ['manufacturer'],
					_count: { manufacturer: true },
					orderBy: { _count: { manufacturer: 'desc' } },
					take: 10,
				}),
				prisma.aircraft.groupBy({
					by: ['year'],
					_count: { year: true },
					where: { year: { not: null } },
					orderBy: { year: 'desc' },
					take: 10,
				}),
			]);

			return {
				totalAircraft,
				activeListings,
				totalValue: totalValue._sum.price || 0,
				avgPrice: avgPrice._avg.price || 0,
				avgYear: avgYear._avg.year || 0,
				avgTimeHours: avgTimeHours._avg.totalTimeHours || 0,
				avgEngineHours: avgEngineHours._avg.engineHours || 0,
				statusBreakdown,
				manufacturerBreakdown,
				yearBreakdown,
			};
		})();

		const response: Record<string, unknown> = {
			aircraft: enrichedAircraft,
			pagination: {
				total: totalCount,
				page,
				limit,
				totalPages: Math.ceil(totalCount / limit),
				hasNext: offset + limit < totalCount,
				hasPrev: page > 1,
			},
			filters: {
				manufacturers: manufacturers.map(m => m.manufacturer).filter(Boolean),
				models: models.map(m => m.model).filter(Boolean),
				makes: makes.map(m => m.make).filter(Boolean),
				variants: variants.map(v => v.variant).filter(Boolean),
				locations: locations.map(l => l.location).filter(Boolean),
				statuses: statuses.map(s => s.status).filter(Boolean),
				registrations: registrations.map(r => r.registration).filter(Boolean),
				serialNumbers: serialNumbers.map(s => s.serialNumber).filter(Boolean),
				priceRange: {
					min: priceRange._min.price || 0,
					max: priceRange._max.price || 0,
				},
				yearRange: {
					min: yearRange._min.year || 1900,
					max: yearRange._max.year || new Date().getFullYear(),
				},
				timeRange: {
					min: timeRange._min.totalTimeHours || 0,
					max: timeRange._max.totalTimeHours || 0,
				},
				engineRange: {
					min: engineRange._min.engineHours || 0,
					max: engineRange._max.engineHours || 0,
				},
			},
			stats,
			metadata: {
				requestId,
				timestamp: new Date().toISOString(),
				cacheStatus: 'MISS',
				dataSource: 'database',
			},
		};

		// Generate report if requested
		if (generateReport) {
			const reportData = await generateAircraftReport(enrichedAircraft, reportType, stats);
			response.report = reportData;
		}

		// Store in cache
		cache.set(cacheKey, { data: response, timestamp: Date.now() });

		// Clean old cache entries (keep only last 200 entries)
		if (cache.size > 200) {
			const entries = Array.from(cache.entries());
			entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
			const toDelete = entries.slice(0, entries.length - 200);
			toDelete.forEach(([key]) => cache.delete(key));
		}

		log.info('Comprehensive aircraft data retrieved successfully', {
			requestId,
			component: 'api',
			action: 'comprehensive_aircraft_success',
			metadata: {
				count: enrichedAircraft.length,
				totalCount,
				page,
				limit,
				hasReport: generateReport,
			},
		});

		return NextResponse.json(response, {
			headers: {
				'Cache-Control': 'public, max-age=120', // 2 minutes
				'X-Cache': 'MISS',
				'X-Request-ID': requestId,
				'X-Total-Count': totalCount.toString(),
				'X-Page': page.toString(),
				'X-Limit': limit.toString(),
			},
		});
	} catch (error) {
		log.error(
			'Comprehensive aircraft data request failed',
			{
				component: 'api',
				action: 'comprehensive_aircraft_error',
				metadata: { url: req.url },
			},
			error as Error
		);

		return NextResponse.json(
			{
				error: 'Failed to fetch comprehensive aircraft data',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
};

// Helper function to generate aircraft reports
async function generateAircraftReport(
	aircraft: Record<string, unknown>[],
	reportType: string,
	stats: Record<string, unknown>
): Promise<Record<string, unknown>> {
	const report: Record<string, unknown> = {
		reportType,
		generatedAt: new Date().toISOString(),
		summary: {
			totalAircraft: aircraft.length,
			totalValue: aircraft.reduce((sum, a) => sum + ((a.price as number) || 0), 0),
			avgPrice: aircraft.reduce((sum, a) => sum + ((a.price as number) || 0), 0) / aircraft.length,
			manufacturers: [...new Set(aircraft.map(a => a.manufacturer))],
			yearRange: {
				min: Math.min(...aircraft.map(a => (a.year as number) || 0)),
				max: Math.max(...aircraft.map(a => (a.year as number) || 0)),
			},
		},
		detailed: {
			byManufacturer: {},
			byYear: {},
			byStatus: {},
			byLocation: {},
			priceAnalysis: {
				min: Math.min(...aircraft.map(a => (a.price as number) || 0)),
				max: Math.max(...aircraft.map(a => (a.price as number) || 0)),
				median: aircraft.map(a => (a.price as number) || 0).sort((a, b) => a - b)[
					Math.floor(aircraft.length / 2)
				],
			},
		},
		statistics: stats,
	};

	// Generate breakdowns
	aircraft.forEach(aircraft => {
		const detailed = report.detailed as Record<string, Record<string, Record<string, number>>>;

		// By manufacturer
		const manufacturer = aircraft.manufacturer as string;
		if (!detailed.byManufacturer[manufacturer]) {
			detailed.byManufacturer[manufacturer] = { count: 0, totalValue: 0 };
		}
		detailed.byManufacturer[manufacturer].count++;
		detailed.byManufacturer[manufacturer].totalValue += (aircraft.price as number) || 0;

		// By year
		const year = aircraft.year as string;
		if (!detailed.byYear[year]) {
			detailed.byYear[year] = { count: 0, totalValue: 0 };
		}
		detailed.byYear[year].count++;
		detailed.byYear[year].totalValue += (aircraft.price as number) || 0;

		// By status
		const status = aircraft.status as string;
		if (!detailed.byStatus[status]) {
			detailed.byStatus[status] = { count: 0, totalValue: 0 };
		}
		detailed.byStatus[status].count++;
		detailed.byStatus[status].totalValue += (aircraft.price as number) || 0;

		// By location
		const location = aircraft.location as string;
		if (!detailed.byLocation[location]) {
			detailed.byLocation[location] = { count: 0, totalValue: 0 };
		}
		detailed.byLocation[location].count++;
		detailed.byLocation[location].totalValue += (aircraft.price as number) || 0;
	});

	return report;
}
