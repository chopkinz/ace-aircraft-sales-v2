import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
	AnalyticsDataMapper,
	type AnalyticsFilters,
	type AnalyticsSortOptions,
} from '@/lib/analytics-data-mapper';
import { log } from '@/lib/logging/logger';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: Record<string, unknown>; timestamp: number }>();

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const requestId = crypto.randomUUID();

		log.info('Comprehensive analytics request started', {
			requestId,
			component: 'api',
			action: 'analytics_comprehensive_request',
			metadata: {
				method: request.method,
				url: request.url,
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
					'Cache-Control': 'public, max-age=300', // 5 minutes
					'X-Cache': 'HIT',
					'X-Request-ID': requestId,
				},
			});
		}

		// Parse parameters
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '100');
		const includeImages = searchParams.get('includeImages') === 'true';
		const includeMarketData = searchParams.get('includeMarketData') === 'true';
		const includeLeadScores = searchParams.get('includeLeadScores') === 'true';
		const includeReports = searchParams.get('includeReports') === 'true';
		const generateSummary = searchParams.get('generateSummary') !== 'false';

		// Parse filters
		const filters: AnalyticsFilters = {
			manufacturer: searchParams.get('manufacturer') || undefined,
			model: searchParams.get('model') || undefined,
			variant: searchParams.get('variant') || undefined,
			yearMin: searchParams.get('yearMin') ? parseInt(searchParams.get('yearMin')!) : undefined,
			yearMax: searchParams.get('yearMax') ? parseInt(searchParams.get('yearMax')!) : undefined,
			priceMin: searchParams.get('priceMin')
				? parseFloat(searchParams.get('priceMin')!)
				: undefined,
			priceMax: searchParams.get('priceMax')
				? parseFloat(searchParams.get('priceMax')!)
				: undefined,
			location: searchParams.get('location') || undefined,
			status: searchParams.get('status') || undefined,
			forSale: searchParams.get('forSale') ? searchParams.get('forSale') === 'true' : undefined,
			totalTimeHoursMin: searchParams.get('totalTimeHoursMin')
				? parseFloat(searchParams.get('totalTimeHoursMin')!)
				: undefined,
			totalTimeHoursMax: searchParams.get('totalTimeHoursMax')
				? parseFloat(searchParams.get('totalTimeHoursMax')!)
				: undefined,
			engineHoursMin: searchParams.get('engineHoursMin')
				? parseFloat(searchParams.get('engineHoursMin')!)
				: undefined,
			engineHoursMax: searchParams.get('engineHoursMax')
				? parseFloat(searchParams.get('engineHoursMax')!)
				: undefined,
			baseCountry: searchParams.get('baseCountry') || undefined,
			baseState: searchParams.get('baseState') || undefined,
			registration: searchParams.get('registration') || undefined,
			serialNumber: searchParams.get('serialNumber') || undefined,
			priceTrend: searchParams.get('priceTrend') || undefined,
			marketTrend: searchParams.get('marketTrend') || undefined,
			exclusive: searchParams.get('exclusive')
				? searchParams.get('exclusive') === 'true'
				: undefined,
			leased: searchParams.get('leased') ? searchParams.get('leased') === 'true' : undefined,
			dateListedMin: searchParams.get('dateListedMin') || undefined,
			dateListedMax: searchParams.get('dateListedMax') || undefined,
			createdAtMin: searchParams.get('createdAtMin') || undefined,
			createdAtMax: searchParams.get('createdAtMax') || undefined,
			priorityLevel: searchParams.get('priorityLevel') || undefined,
			researchStatus: searchParams.get('researchStatus') || undefined,
			commissionPotentialMin: searchParams.get('commissionPotentialMin')
				? parseFloat(searchParams.get('commissionPotentialMin')!)
				: undefined,
			commissionPotentialMax: searchParams.get('commissionPotentialMax')
				? parseFloat(searchParams.get('commissionPotentialMax')!)
				: undefined,
			search: searchParams.get('search') || undefined,
		};

		// Parse sorting
		const sortBy = searchParams.get('sortBy') || 'createdAt';
		const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
		const sortOptions: AnalyticsSortOptions = { field: sortBy, direction: sortOrder };

		// Build database query
		const where: any = {};

		// Apply basic filters to database query
		if (filters.manufacturer) {
			where.manufacturer = { contains: filters.manufacturer, mode: 'insensitive' };
		}
		if (filters.model) {
			where.model = { contains: filters.model, mode: 'insensitive' };
		}
		if (filters.variant) {
			where.variant = { contains: filters.variant, mode: 'insensitive' };
		}
		if (filters.yearMin || filters.yearMax) {
			where.year = {};
			if (filters.yearMin) where.year.gte = filters.yearMin;
			if (filters.yearMax) where.year.lte = filters.yearMax;
		}
		if (filters.priceMin || filters.priceMax) {
			where.OR = [{ price: {} }, { askingPrice: {} }];
			if (filters.priceMin) {
				where.OR[0].price.gte = filters.priceMin;
				where.OR[1].askingPrice.gte = filters.priceMin;
			}
			if (filters.priceMax) {
				where.OR[0].price.lte = filters.priceMax;
				where.OR[1].askingPrice.lte = filters.priceMax;
			}
		}
		if (filters.location) {
			where.OR = [
				{ location: { contains: filters.location, mode: 'insensitive' } },
				{ baseCity: { contains: filters.location, mode: 'insensitive' } },
			];
		}
		if (filters.status) {
			where.status = filters.status;
		}
		if (filters.forSale !== undefined) {
			where.forSale = filters.forSale;
		}
		if (filters.totalTimeHoursMin || filters.totalTimeHoursMax) {
			where.totalTimeHours = {};
			if (filters.totalTimeHoursMin) where.totalTimeHours.gte = filters.totalTimeHoursMin;
			if (filters.totalTimeHoursMax) where.totalTimeHours.lte = filters.totalTimeHoursMax;
		}
		if (filters.engineHoursMin || filters.engineHoursMax) {
			where.engineHours = {};
			if (filters.engineHoursMin) where.engineHours.gte = filters.engineHoursMin;
			if (filters.engineHoursMax) where.engineHours.lte = filters.engineHoursMax;
		}
		if (filters.baseCountry) {
			where.baseCountry = filters.baseCountry;
		}
		if (filters.baseState) {
			where.baseState = filters.baseState;
		}
		if (filters.registration) {
			where.registration = { contains: filters.registration, mode: 'insensitive' };
		}
		if (filters.serialNumber) {
			where.serialNumber = { contains: filters.serialNumber, mode: 'insensitive' };
		}
		if (filters.createdAtMin || filters.createdAtMax) {
			where.createdAt = {};
			if (filters.createdAtMin) where.createdAt.gte = new Date(filters.createdAtMin);
			if (filters.createdAtMax) where.createdAt.lte = new Date(filters.createdAtMax);
		}

		// Build include clause
		const include: Record<string, boolean> = {};
		if (includeImages) {
			include.images = true;
		}
		if (includeMarketData) {
			include.marketDataRecords = true;
		}
		if (includeLeadScores) {
			include.leadScores = true;
		}
		if (includeReports) {
			include.reports = true;
		}

		// Execute database query
		const startTime = Date.now();
		const aircraft = await prisma.aircraft.findMany({
			where,
			include,
			orderBy: { [sortBy]: sortOrder },
		});

		const queryTime = Date.now() - startTime;

		// Map and transform data
		const mappedData = aircraft.map(item => AnalyticsDataMapper.mapAircraftData(item));

		// Apply additional filters that couldn't be done at database level
		let filteredData = mappedData;
		if (
			filters.priceTrend ||
			filters.marketTrend ||
			filters.priorityLevel ||
			filters.researchStatus ||
			filters.commissionPotentialMin ||
			filters.commissionPotentialMax ||
			filters.search
		) {
			filteredData = AnalyticsDataMapper.filterAircraftData(mappedData, filters);
		}

		// Apply sorting
		const sortedData = AnalyticsDataMapper.sortAircraftData(filteredData, sortOptions);

		// Generate summary if requested
		let summary = null;
		if (generateSummary) {
			summary = AnalyticsDataMapper.generateAnalyticsSummary(sortedData);
		}

		// Paginate results
		const { data: paginatedData, pagination } = AnalyticsDataMapper.paginateData(
			sortedData,
			page,
			limit
		);

		const response = {
			success: true,
			data: paginatedData,
			pagination,
			summary,
			metadata: {
				totalRecords: sortedData.length,
				filteredRecords: filteredData.length,
				queryTime,
				requestId,
				timestamp: new Date().toISOString(),
				filters: Object.fromEntries(
					Object.entries(filters).filter(([, value]) => value !== undefined)
				),
				sortOptions,
			},
		};

		// Cache the response
		cache.set(cacheKey, { data: response, timestamp: Date.now() });

		log.info('Comprehensive analytics request completed', {
			requestId,
			component: 'api',
			action: 'analytics_comprehensive_request',
			metadata: {
				totalRecords: sortedData.length,
				paginatedRecords: paginatedData.length,
				queryTime,
				cacheKey,
			},
		});

		return NextResponse.json(response, {
			headers: {
				'Cache-Control': 'public, max-age=300', // 5 minutes
				'X-Cache': 'MISS',
				'X-Request-ID': requestId,
			},
		});
	} catch (error) {
		log.error('Comprehensive analytics request failed', {
			component: 'api',
			action: 'analytics_comprehensive_request',
			error: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined,
		});

		return NextResponse.json(
			{
				success: false,
				error: 'Failed to fetch analytics data',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
