import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
	try {
		const syncLogs = await prisma.syncLog.findMany({
			orderBy: { startedAt: 'desc' },
			take: 50,
		});

		return NextResponse.json({ logs: syncLogs });
	} catch (error) {
		console.error('Error fetching sync logs:', error);
		return NextResponse.json({ error: 'Failed to fetch sync logs' }, { status: 500 });
	}
}
