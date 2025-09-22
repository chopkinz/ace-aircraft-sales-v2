import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const limit = parseInt(searchParams.get('limit') || '100');
		const offset = parseInt(searchParams.get('offset') || '0');

		const marketData = await prisma.marketData.findMany({
			take: limit,
			skip: offset,
			orderBy: {
				createdAt: 'desc',
			},
		});

		return NextResponse.json({
			success: true,
			data: marketData,
			total: marketData.length,
		});
	} catch (error) {
		console.error('Error fetching market data:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to fetch market data',
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			aircraftId,
			make,
			model,
			category,
			avgPrice,
			minPrice,
			maxPrice,
			totalListings,
			avgDaysOnMarket,
			priceTrend,
			marketTrend,
			source,
		} = body;

		const marketData = await prisma.marketData.create({
			data: {
				aircraftId,
				make,
				model,
				category,
				avgPrice,
				minPrice,
				maxPrice,
				totalListings,
				avgDaysOnMarket,
				priceTrend,
				marketTrend,
				source,
				dataDate: new Date(),
			},
		});

		return NextResponse.json({
			success: true,
			data: marketData,
		});
	} catch (error) {
		console.error('Error creating market data:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to create market data',
			},
			{ status: 500 }
		);
	}
}
