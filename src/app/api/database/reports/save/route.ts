import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function POST(request: NextRequest) {
	try {
		const { report } = await request.json();

		// Save report to database
		const savedReport = await prisma.report.create({
			data: {
				title: report.title,
				data: JSON.stringify(report),
				generatedAt: new Date(report.generatedAt),
				type: report.type,
				description: report.description,
				parameters: JSON.stringify(report.parameters),
				expiresAt: new Date(report.expiresAt),
				createdAt: new Date(report.createdAt),
				updatedAt: new Date(report.updatedAt),
			},
		});

		return NextResponse.json({
			success: true,
			data: savedReport,
		});
	} catch (error) {
		console.error('Error saving report:', error);
		return NextResponse.json({ success: false, error: 'Failed to save report' }, { status: 500 });
	}
}
