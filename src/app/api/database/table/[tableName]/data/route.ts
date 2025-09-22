import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ tableName: string }> }
) {
	try {
		const { tableName } = await params;
		const { searchParams } = new URL(request.url);
		const limit = parseInt(searchParams.get('limit') || '10');

		// Security check - only allow specific table names
		const allowedTables = [
			'aircraft',
			'companies',
			'contacts',
			'reports',
			'sync_logs',
			'users',
			'accounts',
			'activities',
			'alerts',
			'api_sync_logs',
			'contact_activities',
			'lead_scores',
			'market_data',
			'market_stats',
			'market_trends',
			'opportunities',
			'opportunity_activities',
			'sessions',
			'system_config',
			'user_activities',
			'user_settings',
			'verification_tokens',
			'aircraft_company_relationships',
			'aircraft_images',
		];

		if (!allowedTables.includes(tableName)) {
			return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });
		}

		// Execute query safely
		const result = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" LIMIT ${limit}`);

		return NextResponse.json({
			data: result,
			tableName,
			limit,
			rowCount: Array.isArray(result) ? result.length : 0,
		});
	} catch (error) {
		console.error('Table data error:', error);
		return NextResponse.json({ error: 'Failed to fetch table data' }, { status: 500 });
	}
}
