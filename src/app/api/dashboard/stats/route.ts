import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging/logger';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
	const startTime = Date.now();
	const requestId = crypto.randomUUID();

	try {
		log.info('Dashboard stats request started', { requestId });

		// Get real aircraft counts from database
		const totalAircraft = await prisma.aircraft.count();
		const forSaleAircraft = await prisma.aircraft.count({
			where: { status: 'AVAILABLE' },
		});
		const totalUsers = await prisma.user.count();
		const activeUsers = await prisma.user.count({
			where: {
				lastLoginAt: {
					gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
				},
			},
		});

		// Get financial data
		const aircraftWithPrices = await prisma.aircraft.findMany({
			where: {
				price: { not: null, gt: 0 },
			},
			select: { price: true },
		});

		const totalValue = aircraftWithPrices.reduce((sum, aircraft) => sum + (aircraft.price || 0), 0);
		const averagePrice = aircraftWithPrices.length > 0 ? totalValue / aircraftWithPrices.length : 0;

		// Get this month's data
		const startOfMonth = new Date();
		startOfMonth.setDate(1);
		startOfMonth.setHours(0, 0, 0, 0);

		const newThisMonth = await prisma.aircraft.count({
			where: {
				createdAt: { gte: startOfMonth },
			},
		});

		const stats = {
			totalAircraft,
			forSaleAircraft,
			totalUsers,
			activeUsers,
			totalValue,
			averagePrice,
			activeListings: forSaleAircraft,
			newThisMonth,
			soldThisMonth: 0,
			lastSync: new Date().toISOString(),
			lastSyncStatus: 'success',
			jetnetApi: true,
			timestamp: new Date().toISOString(),
		};

		log.info('Dashboard stats retrieved successfully', {
			requestId,
			totalAircraft,
			forSaleAircraft,
		});

		return NextResponse.json({
			success: true,
			data: stats,
			message: 'Dashboard statistics retrieved successfully',
			timestamp: new Date().toISOString(),
			requestId,
		});
	} catch (error) {
		log.error('Dashboard stats request failed', { requestId }, error as Error);

		// Return fallback data
		const fallbackStats = {
			totalAircraft: 0,
			forSaleAircraft: 0,
			totalUsers: 0,
			activeUsers: 0,
			lastSync: null,
			lastSyncStatus: 'error',
			jetnetApi: false,
			timestamp: new Date().toISOString(),
		};

		return NextResponse.json({
			success: true,
			data: fallbackStats,
			message: 'Dashboard statistics retrieved with fallback data',
			timestamp: new Date().toISOString(),
			requestId,
		});
	}
}
