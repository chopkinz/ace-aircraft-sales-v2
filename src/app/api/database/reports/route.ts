import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Get all reports
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const limit = parseInt(searchParams.get('limit') || '50');
		const offset = parseInt(searchParams.get('offset') || '0');

		const reports = await prisma.report.findMany({
			take: limit,
			skip: offset,
			orderBy: {
				generatedAt: 'desc',
			},
			include: {
				user: {
					select: {
						name: true,
						email: true,
					},
				},
				aircraft: {
					select: {
						manufacturer: true,
						model: true,
						registration: true,
					},
				},
			},
		});

		// Parse JSON data for each report
		const parsedReports = reports.map(report => ({
			...report,
			data: report.data ? JSON.parse(report.data) : null,
			parameters: report.parameters ? JSON.parse(report.parameters) : null,
		}));

		return NextResponse.json({
			success: true,
			reports: parsedReports,
			pagination: {
				limit,
				offset,
				total: parsedReports.length,
			},
		});
	} catch (error) {
		console.error('Error fetching reports:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to fetch reports',
			},
			{ status: 500 }
		);
	}
}

// Create a new report
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { title, type, description, parameters, data, aircraftId, userId } = body;

		const report = await prisma.report.create({
			data: {
				title: title || 'Market Evaluation Report',
				type: type || 'MARKET_ANALYSIS',
				description: description || 'Generated market analysis report',
				parameters: parameters ? JSON.stringify(parameters) : null,
				data: data ? JSON.stringify(data) : null,
				status: 'COMPLETED',
				generatedAt: new Date(),
				aircraftId: aircraftId || null,
				userId: userId || null,
			},
			include: {
				user: {
					select: {
						name: true,
						email: true,
					},
				},
				aircraft: {
					select: {
						manufacturer: true,
						model: true,
						registration: true,
					},
				},
			},
		});

		return NextResponse.json({
			success: true,
			report: {
				...report,
				data: report.data ? JSON.parse(report.data) : null,
				parameters: report.parameters ? JSON.parse(report.parameters) : null,
			},
		});
	} catch (error) {
		console.error('Error creating report:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to create report',
			},
			{ status: 500 }
		);
	}
}
