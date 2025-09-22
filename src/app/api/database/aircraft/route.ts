import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { log } from '@/lib/logging/logger';

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '20');
		const offset = (page - 1) * limit;

		const manufacturer = searchParams.get('manufacturer');
		const model = searchParams.get('model');
		const status = searchParams.get('status');
		const search = searchParams.get('search');

		// Build where clause
		const where: any = {};
		if (manufacturer) where.manufacturer = { contains: manufacturer, mode: 'insensitive' };
		if (model) where.model = { contains: model, mode: 'insensitive' };
		if (status) where.status = status;
		if (search) {
			where.OR = [
				{ manufacturer: { contains: search, mode: 'insensitive' } },
				{ model: { contains: search, mode: 'insensitive' } },
				{ registration: { contains: search, mode: 'insensitive' } },
			];
		}

		const [aircraft, totalCount] = await Promise.all([
			prisma.aircraft.findMany({
				where,
				skip: offset,
				take: limit,
				orderBy: { createdAt: 'desc' },
				include: {
					images: true,
					marketDataRecords: { take: 1, orderBy: { createdAt: 'desc' } },
				},
			}),
			prisma.aircraft.count({ where }),
		]);

		return NextResponse.json({
			success: true,
			data: aircraft,
			pagination: {
				total: totalCount,
				page,
				limit,
				totalPages: Math.ceil(totalCount / limit),
				hasNext: offset + limit < totalCount,
				hasPrev: page > 1,
			},
		});
	} catch (error) {
		log.error('Error fetching aircraft data', {}, error as Error);
		return NextResponse.json({ error: 'Failed to fetch aircraft data' }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { manufacturer, model, year, price, location, status } = body;

		const aircraft = await prisma.aircraft.create({
			data: {
				manufacturer,
				model,
				year: year ? parseInt(year) : null,
				price: price ? parseFloat(price) : null,
				location,
				status: status || 'AVAILABLE',
				currency: 'USD',
				forSale: true,
			},
		});

		return NextResponse.json({
			success: true,
			data: aircraft,
			message: 'Aircraft created successfully',
		});
	} catch (error) {
		log.error('Error creating aircraft', {}, error as Error);
		return NextResponse.json({ error: 'Failed to create aircraft' }, { status: 500 });
	}
}
