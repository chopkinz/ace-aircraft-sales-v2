import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ tableName: string }> }
) {
	try {
		const { tableName } = await params;

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

		// Get table schema information
		const columns = await prisma.$queryRaw`
			SELECT column_name, data_type, is_nullable, column_default
			FROM information_schema.columns
			WHERE table_name = ${tableName}
			ORDER BY ordinal_position;
		`;

		// Get row count
		const countResult = await prisma.$queryRawUnsafe(
			`SELECT COUNT(*) as count FROM "${tableName}"`
		);
		const rowCount =
			Array.isArray(countResult) && countResult.length > 0
				? (countResult[0] as Record<string, unknown>).count
				: 0;

		return NextResponse.json({
			tableName,
			columns,
			rowCount: parseInt((rowCount as number).toString()),
		});
	} catch (error) {
		console.error('Table info error:', error);
		return NextResponse.json({ error: 'Failed to fetch table info' }, { status: 500 });
	}
}
