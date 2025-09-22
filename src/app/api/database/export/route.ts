import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const format = searchParams.get('format') || 'csv';
		const table = searchParams.get('table') || 'aircraft';

		if (table === 'aircraft') {
			const aircraft = await prisma.aircraft.findMany({
				orderBy: {
					createdAt: 'desc',
				},
			});

			if (format === 'csv') {
				// Generate CSV
				const headers = [
					'ID',
					'Manufacturer',
					'Model',
					'Year',
					'Price',
					'Asking Price',
					'Location',
					'Status',
					'Registration',
					'Serial Number',
					'Total Time Hours',
					'Engine Hours',
					'Created At',
					'Updated At',
				];

				const csvRows = [
					headers.join(','),
					...aircraft.map(aircraft =>
						[
							aircraft.id,
							aircraft.manufacturer,
							aircraft.model,
							aircraft.year || '',
							aircraft.price || '',
							aircraft.askingPrice || '',
							aircraft.location || '',
							aircraft.status,
							aircraft.registration || '',
							aircraft.serialNumber || '',
							aircraft.totalTimeHours || '',
							aircraft.engineHours || '',
							aircraft.createdAt,
							aircraft.updatedAt,
						].join(',')
					),
				];

				const csvContent = csvRows.join('\n');

				return new NextResponse(csvContent, {
					headers: {
						'Content-Type': 'text/csv',
						'Content-Disposition': `attachment; filename="aircraft-export-${
							new Date().toISOString().split('T')[0]
						}.csv"`,
					},
				});
			}
		}

		return NextResponse.json(
			{
				success: false,
				error: 'Invalid format or table',
			},
			{ status: 400 }
		);
	} catch (error) {
		console.error('Error exporting data:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to export data',
			},
			{ status: 500 }
		);
	}
}
