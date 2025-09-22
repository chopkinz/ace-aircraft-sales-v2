import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
	try {
		const { query } = await request.json();

		if (!query || typeof query !== 'string') {
			return NextResponse.json({ error: 'Query is required' }, { status: 400 });
		}

		// Basic security check - only allow SELECT queries
		const trimmedQuery = query.trim().toLowerCase();
		if (!trimmedQuery.startsWith('select')) {
			return NextResponse.json({ error: 'Only SELECT queries are allowed' }, { status: 400 });
		}

		const startTime = Date.now();

		// Execute the query
		const result = await prisma.$queryRawUnsafe(query);
		const executionTime = Date.now() - startTime;

		// Extract column names from the first row if available
		let columns: string[] = [];
		if (Array.isArray(result) && result.length > 0) {
			columns = Object.keys(result[0] as Record<string, unknown>);
		}

		return NextResponse.json({
			success: true,
			data: result,
			columns,
			executionTime,
			rowCount: Array.isArray(result) ? result.length : 0,
		});
	} catch (error) {
		console.error('Query execution error:', error);
		return NextResponse.json({ error: 'Query execution failed' }, { status: 500 });
	}
}
