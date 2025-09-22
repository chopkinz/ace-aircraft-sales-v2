import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET() {
	try {
		// Get all table names from PostgreSQL database
		const tables = await prisma.$queryRaw`
			SELECT table_name
			FROM information_schema.tables
			WHERE table_schema = 'public'
			ORDER BY table_name;
		`;

		return NextResponse.json({ tables });
	} catch (error) {
		console.error('Database tables error:', error);
		return NextResponse.json({ error: 'Failed to fetch database tables' }, { status: 500 });
	}
}
