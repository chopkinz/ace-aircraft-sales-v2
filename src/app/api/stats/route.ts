import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET() {
	try {
		console.log('📊 Fetching database stats...');

		// Get aircraft statistics
		const totalAircraft = await prisma.aircraft.count();
		const forSaleAircraft = await prisma.aircraft.count({
			where: { forSale: true },
		});
		console.log('totalAircraft', totalAircraft);
		console.log('forSaleAircraft', forSaleAircraft);

		// Get last sync instance
		const lastSync = await prisma.syncLog.findFirst({
			where: { syncType: 'aircraft' },
			orderBy: { completedAt: 'desc' },
			select: { completedAt: true, status: true },
		});

		// Get user count
		const totalUsers = await prisma.user.count();
		const activeUsers = await prisma.user.count({
			where: { isActive: true },
		});
		console.log('totalUsers', totalUsers);
		console.log('activeUsers', activeUsers);
		console.log('lastSync', lastSync);
		const stats = {
			success: true,
			totalAircraft,
			forSaleAircraft,
			totalUsers,
			activeUsers,
			lastSync: lastSync?.completedAt?.toISOString() || null,
			lastSyncStatus: lastSync?.status || null,
			jetnetApi: true, // Assume available if we can query DB
			timestamp: new Date().toISOString(),
		};

		console.log('✅ Database stats fetched:', stats);
		return NextResponse.json(stats);
	} catch (error) {
		console.error('❌ Error fetching database stats:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				totalAircraft: 0,
				forSaleAircraft: 0,
				totalUsers: 0,
				activeUsers: 0,
				lastSync: null,
				jetnetApi: false,
			},
			{ status: 500 }
		);
	}
}
