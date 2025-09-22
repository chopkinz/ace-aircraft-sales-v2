import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Get a specific report by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		const report = await prisma.report.findUnique({
			where: {
				id,
			},
		});

		if (!report) {
			return NextResponse.json(
				{
					success: false,
					error: 'Report not found',
				},
				{ status: 404 }
			);
		}

		// Parse the JSON data
		const reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;

		return NextResponse.json({
			success: true,
			report: {
				...report,
				data: reportData,
			},
		});
	} catch (error) {
		console.error('Error fetching report:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to fetch report',
			},
			{ status: 500 }
		);
	}
}
