import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
	try {
		const stats = await prisma.aircraft.aggregate({
			_count: { id: true },
			_min: { price: true },
			_max: { price: true },
			_avg: { price: true },
		});

		return NextResponse.json({
			success: true,
			stats: {
				totalAircraft: stats._count.id,
				minPrice: stats._min.price,
				maxPrice: stats._max.price,
				avgPrice: stats._avg.price,
			},
		});
	} catch (error) {
		console.error('Database stats error:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch database stats' },
			{ status: 500 }
		);
	}
}
