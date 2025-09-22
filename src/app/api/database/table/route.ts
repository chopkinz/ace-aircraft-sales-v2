import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const tableName = searchParams.get('table');
		const limit = parseInt(searchParams.get('limit') || '100');
		const offset = parseInt(searchParams.get('offset') || '0');

		if (!tableName) {
			return NextResponse.json(
				{ success: false, error: 'Table name is required' },
				{ status: 400 }
			);
		}

		// Get table structure
		const columns = (await prisma.$queryRaw`
			SELECT column_name, data_type, is_nullable, column_default
			FROM information_schema.columns
			WHERE table_name = ${tableName}
			ORDER BY ordinal_position;
		`) as Array<{
			column_name: string;
			data_type: string;
			is_nullable: string;
			column_default: string | null;
		}>;

		// Get table data with pagination
		const data = await prisma.$queryRawUnsafe(
			`SELECT * FROM "${tableName}" LIMIT ${limit} OFFSET ${offset}`
		);
		// give me an example request
		// http://localhost:3000/api/database/table?table=aircraft&limit=10&offset=0
		// http://localhost:3000/api/database/table?table=aircraft&limit=10&offset=10
		// http://localhost:3000/api/database/table?table=aircraft&limit=10&offset=20
		// http://localhost:3000/api/database/table?table=aircraft&limit=10&offset=30
		// http://localhost:3000/api/database/table?table=aircraft&limit=10&offset=40
		// http://localhost:3000/api/database/table?table=aircraft&limit=10&offset=50
		// http://localhost:3000/api/database/table?table=aircraft&limit=10&offset=60
		// http://localhost:3000/api/database/table?table=aircraft&limit=10&offset=70
		// http://localhost:3000/api/database/table?table=aircraft&limit=10&offset=80
		// http://localhost:3000/api/database/table?table=aircraft&limit=10&offset=90
		// http://localhost:3000/api/database/table?table=aircraft&limit=10&offset=100
		// Get total count
		const countResult = (await prisma.$queryRawUnsafe(
			`SELECT COUNT(*) as count FROM "${tableName}"`
		)) as Array<{ count: bigint }>;

		return NextResponse.json({
			success: true,
			data: {
				tableName,
				columns,
				rows: data,
				totalCount: Number(countResult[0].count),
				pagination: {
					limit,
					offset,
					hasMore: offset + limit < Number(countResult[0].count),
				},
			},
		});
	} catch (error) {
		console.error('Database table data error:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to fetch table data' },
			{ status: 500 }
		);
	}
}
