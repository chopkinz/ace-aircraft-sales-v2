import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
	try {
		const { format, fields, filters, dataType } = await request.json();

		// Fetch data based on type and filters
		let data;
		switch (dataType) {
			case 'aircraft':
				data = await fetchAircraftData(filters);
				break;
			case 'market':
				data = await fetchMarketData();
				break;
			case 'reports':
				data = await fetchReportsData();
				break;
			default:
				data = await fetchAircraftData(filters);
		}

		// Filter fields
		const filteredData = data.map(record => {
			const filtered: Record<string, unknown> = {};
			fields.forEach((field: string) => {
				filtered[field] = (record as Record<string, unknown>)[field] || null;
			});
			return filtered;
		});

		// Generate file based on format
		switch (format) {
			case 'csv':
				return generateCSV(filteredData);
			case 'excel':
				return generateExcel(filteredData);
			case 'json':
				return generateJSON(filteredData);
			default:
				return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
		}
	} catch (error) {
		console.error('Export error:', error);
		return NextResponse.json({ error: 'Export failed' }, { status: 500 });
	}
}

async function fetchAircraftData(filters: Record<string, unknown>) {
	const where: Record<string, unknown> = {};

	// Apply filters
	if (filters.status) {
		where.status = filters.status;
	}
	if (filters.manufacturer) {
		where.manufacturer = {
			contains: filters.manufacturer,
			mode: 'insensitive',
		};
	}
	const priceRange = filters.priceRange as { min?: string; max?: string } | undefined;
	const dateRange = filters.dateRange as { start?: string; end?: string } | undefined;

	if (priceRange?.min || priceRange?.max) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(where as any).price = {};
		if (priceRange.min) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(where as any).price.gte = parseFloat(priceRange.min);
		}
		if (priceRange.max) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(where as any).price.lte = parseFloat(priceRange.max);
		}
	}
	if (dateRange?.start || dateRange?.end) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(where as any).createdAt = {};
		if (dateRange.start) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(where as any).createdAt.gte = new Date(dateRange.start);
		}
		if (dateRange.end) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(where as any).createdAt.lte = new Date(dateRange.end);
		}
	}

	const aircraft = await prisma.aircraft.findMany({
		where,
		orderBy: { createdAt: 'desc' },
		take: 10000, // Limit for performance
	});

	return aircraft;
}

async function fetchMarketData() {
	// Fetch market analysis data
	const aircraft = await prisma.aircraft.findMany({
		select: {
			manufacturer: true,
			model: true,
			year: true,
			price: true,
			status: true,
			location: true,
			createdAt: true,
			marketData: true,
		},
		orderBy: { createdAt: 'desc' },
		take: 5000,
	});

	return aircraft;
}

async function fetchReportsData() {
	// Generate summary reports data
	const stats = await prisma.aircraft.groupBy({
		by: ['manufacturer', 'status'],
		_count: true,
		_avg: {
			price: true,
			year: true,
		},
	});

	return stats;
}

function generateCSV(data: Record<string, unknown>[]): NextResponse {
	if (data.length === 0) {
		return new NextResponse('No data to export', {
			status: 200,
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': 'attachment; filename="aircraft-export.csv"',
			},
		});
	}

	// Get headers from first record
	const headers = Object.keys(data[0]);

	// Create CSV content
	const csvContent = [
		headers.join(','),
		...data.map(record =>
			headers
				.map(header => {
					const value = record[header];
					if (value === null || value === undefined) return '';
					if (
						typeof value === 'string' &&
						(value.includes(',') || value.includes('"') || value.includes('\n'))
					) {
						return `"${value.replace(/"/g, '""')}"`;
					}
					return value;
				})
				.join(',')
		),
	].join('\n');

	return new NextResponse(csvContent, {
		status: 200,
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': `attachment; filename="aircraft-export-${
				new Date().toISOString().split('T')[0]
			}.csv"`,
		},
	});
}

function generateExcel(data: Record<string, unknown>[]): NextResponse {
	if (data.length === 0) {
		return new NextResponse('No data to export', {
			status: 200,
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': 'attachment; filename="aircraft-export.xlsx"',
			},
		});
	}

	// Create workbook and worksheet
	const workbook = XLSX.utils.book_new();
	const worksheet = XLSX.utils.json_to_sheet(data);

	// Add worksheet to workbook
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Aircraft Data');

	// Generate Excel file buffer
	const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

	return new NextResponse(excelBuffer, {
		status: 200,
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="aircraft-export-${
				new Date().toISOString().split('T')[0]
			}.xlsx"`,
		},
	});
}

function generateJSON(data: Record<string, unknown>[]): NextResponse {
	return new NextResponse(JSON.stringify(data, null, 2), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="aircraft-export-${
				new Date().toISOString().split('T')[0]
			}.json"`,
		},
	});
}
