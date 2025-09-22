import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class OptimizedAircraftQueries {
	static async getAircraftWithFilters(filters: any, page: number = 1, limit: number = 50) {
		const skip = (page - 1) * limit;

		const whereClause: any = {};

		if (filters.search) {
			whereClause.OR = [
				{ manufacturer: { contains: filters.search, mode: 'insensitive' } },
				{ model: { contains: filters.search, mode: 'insensitive' } },
				{ registration: { contains: filters.search, mode: 'insensitive' } },
				{ serialNumber: { contains: filters.search, mode: 'insensitive' } },
			];
		}

		if (filters.manufacturer) {
			whereClause.manufacturer = { contains: filters.manufacturer, mode: 'insensitive' };
		}

		if (filters.model) {
			whereClause.model = { contains: filters.model, mode: 'insensitive' };
		}

		if (filters.status) {
			whereClause.status = filters.status;
		}

		if (filters.location) {
			whereClause.location = { contains: filters.location, mode: 'insensitive' };
		}

		if (filters.forSale !== null) {
			whereClause.forSale = filters.forSale;
		}

		if (filters.priceRange) {
			whereClause.price = {
				gte: filters.priceRange[0],
				lte: filters.priceRange[1],
			};
		}

		if (filters.yearRange) {
			whereClause.year = {
				gte: filters.yearRange[0],
				lte: filters.yearRange[1],
			};
		}

		if (filters.totalTimeHoursRange) {
			whereClause.totalTimeHours = {
				gte: filters.totalTimeHoursRange[0],
				lte: filters.totalTimeHoursRange[1],
			};
		}

		const orderBy: any = {};
		if (filters.sortBy) {
			orderBy[filters.sortBy] = filters.sortOrder || 'desc';
		} else {
			orderBy.createdAt = 'desc';
		}

		const [aircraft, total] = await Promise.all([
			prisma.aircraft.findMany({
				where: whereClause,
				skip,
				take: limit,
				orderBy,
			}),
			prisma.aircraft.count({ where: whereClause }),
		]);

		return {
			aircraft,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	static async getFilterOptions() {
		const [manufacturers, models, statuses, locations] = await Promise.all([
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
				select: { status: true },
				distinct: ['status'],
				orderBy: { status: 'asc' },
			}),
			prisma.aircraft.findMany({
				select: { location: true },
				distinct: ['location'],
				orderBy: { location: 'asc' },
			}),
		]);

		const priceStats = await prisma.aircraft.aggregate({
			_min: { price: true },
			_max: { price: true },
		});

		const yearStats = await prisma.aircraft.aggregate({
			_min: { year: true },
			_max: { year: true },
		});

		const timeStats = await prisma.aircraft.aggregate({
			_min: { totalTimeHours: true },
			_max: { totalTimeHours: true },
		});

		return {
			manufacturers: manufacturers.map(m => m.manufacturer),
			models: models.map(m => m.model),
			statuses: statuses.map(s => s.status),
			locations: locations.map(l => l.location),
			priceRange: {
				min: priceStats._min.price || 0,
				max: priceStats._max.price || 10000000,
			},
			yearRange: {
				min: yearStats._min.year || 1950,
				max: yearStats._max.year || 2024,
			},
			timeRange: {
				min: timeStats._min.totalTimeHours || 0,
				max: timeStats._max.totalTimeHours || 50000,
			},
			engineRange: {
				min: 0,
				max: 50000,
			},
		};
	}
}

export const queryMonitor = {
	async getQueryStats() {
		return {
			totalQueries: 0,
			avgResponseTime: 0,
			errorRate: 0,
		};
	},
};

export const dbConnectionManager = {
	async getConnectionStatus() {
		try {
			await prisma.$queryRaw`SELECT 1`;
			return { status: 'connected', timestamp: new Date().toISOString() };
		} catch (error) {
			return { status: 'disconnected', error: String(error), timestamp: new Date().toISOString() };
		}
	},
};
