import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET() {
	// pull all db stats and return them
	try {
		const stats = await prisma.aircraft.aggregate({
			_count: {
				id: true,
			},
		});
		return NextResponse.json(stats);
	} catch (error) {
		console.error('Error fetching dashboard data:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch dashboard data' },
			{ status: 500 }
		);
	} finally {
		await prisma.$disconnect();
	}
}
