import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: Record<string, unknown>; timestamp: number }>();

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);

		// Create cache key from search parameters
		const cacheKey = searchParams.toString();
		const cached = cache.get(cacheKey);

		// Return cached data if still valid
		if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
			return NextResponse.json(cached.data, {
				headers: {
					'Cache-Control': 'public, max-age=300', // 5 minutes
					'X-Cache': 'HIT',
				},
			});
		}

		// Pagination parameters - No limits for comprehensive data access
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '10000'); // Increased default limit
		const offset = (page - 1) * limit;

		// Basic filtering parameters
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

		// Additional filtering parameters for enriched data
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

		// Sorting parameters
		const sortBy = searchParams.get('sortBy') || 'createdAt';
		const sortOrder = searchParams.get('sortOrder') || 'desc';

		// Search parameter
		const search = searchParams.get('search');

		// Build where clause
		const where: Record<string, unknown> = {};

		if (manufacturer) {
			where.manufacturer = { contains: manufacturer, mode: 'insensitive' };
		}

		if (model) {
			where.model = { contains: model, mode: 'insensitive' };
		}

		if (yearMin || yearMax) {
			where.year = {};
			if (yearMin) where.year.gte = parseInt(yearMin);
			if (yearMax) where.year.lte = parseInt(yearMax);
		}

		if (priceMin || priceMax) {
			where.price = {};
			if (priceMin) where.price.gte = parseInt(priceMin);
			if (priceMax) where.price.lte = parseInt(priceMax);
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

		// Enhanced filtering for enriched data fields
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

		// Global search across multiple fields including enriched data
		if (search) {
			where.OR = [
				{ manufacturer: { contains: search, mode: 'insensitive' } },
				{ model: { contains: search, mode: 'insensitive' } },
				{ registration: { contains: search, mode: 'insensitive' } },
				{ serialNumber: { contains: search, mode: 'insensitive' } },
				{ location: { contains: search, mode: 'insensitive' } },
				{ features: { contains: search, mode: 'insensitive' } },
				{ specifications: { contains: search, mode: 'insensitive' } },
				{ marketData: { contains: search, mode: 'insensitive' } },
				{ maintenanceData: { contains: search, mode: 'insensitive' } },
				{ contactInfo: { contains: search, mode: 'insensitive' } },
				{ ownershipData: { contains: search, mode: 'insensitive' } },
			];
		}

		// Build orderBy clause
		const orderBy: Record<string, unknown> = {};
		orderBy[sortBy] = sortOrder;

		// Get total count for pagination
		const totalCount = await prisma.aircraft.count({ where });

		// Get aircraft with pagination and filtering
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
		const enrichedAircraft = aircraft.map(aircraft => ({
			...aircraft,
			specifications: aircraft.specifications ? JSON.parse(aircraft.specifications) : null,
			features: aircraft.features ? JSON.parse(aircraft.features) : null,
			contactInfo: aircraft.contactInfo ? JSON.parse(aircraft.contactInfo) : null,
			marketData: aircraft.marketData ? JSON.parse(aircraft.marketData) : null,
			maintenanceData: aircraft.maintenanceData ? JSON.parse(aircraft.maintenanceData) : null,
			ownershipData: aircraft.ownershipData ? JSON.parse(aircraft.ownershipData) : null,
		}));

		// Get filter options for UI
		const [manufacturers, models, locations, statuses] = await Promise.all([
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
		]);

		// Get price range for UI
		const priceRange = await prisma.aircraft.aggregate({
			_min: { price: true },
			_max: { price: true },
			where: { price: { not: null } },
		});

		// Get year range for UI
		const yearRange = await prisma.aircraft.aggregate({
			_min: { year: true },
			_max: { year: true },
			where: { year: { not: null } },
		});

		const response = {
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
				locations: locations.map(l => l.location).filter(Boolean),
				statuses: statuses.map(s => s.status).filter(Boolean),
				priceRange: {
					min: priceRange._min.price || 0,
					max: priceRange._max.price || 0,
				},
				yearRange: {
					min: yearRange._min.year || 1900,
					max: yearRange._max.year || new Date().getFullYear(),
				},
			},
			stats: {
				totalAircraft: totalCount,
				activeListings: await prisma.aircraft.count({ where: { forSale: true } }),
				totalValue: await prisma.aircraft
					.aggregate({
						_sum: { price: true },
						where: { price: { not: null } },
					})
					.then(result => result._sum.price || 0),
			},
		};

		// Store in cache
		cache.set(cacheKey, { data: response, timestamp: Date.now() });

		// Clean old cache entries (keep only last 100 entries)
		if (cache.size > 100) {
			const entries = Array.from(cache.entries());
			entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
			const toDelete = entries.slice(0, entries.length - 100);
			toDelete.forEach(([key]) => cache.delete(key));
		}

		return NextResponse.json(response, {
			headers: {
				'Cache-Control': 'public, max-age=300', // 5 minutes
				'X-Cache': 'MISS',
			},
		});
	} catch (error) {
		console.error('Database viewer API error:', error);
		return NextResponse.json({ error: 'Failed to fetch aircraft data' }, { status: 500 });
	}
}
