import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			exportType = 'all',
			formats = ['csv', 'excel'],
			filters = {},
			includeRawData = true,
			includeContactInfo = true,
			includeBrokerInfo = true,
		} = body;

		// Build query filters
		const whereClause: Record<string, unknown> = {};

		if (filters.manufacturer && filters.manufacturer !== 'all') {
			whereClause.manufacturer = filters.manufacturer;
		}

		if (filters.model && filters.model !== 'all') {
			whereClause.model = filters.model;
		}

		if (filters.status && filters.status !== 'all') {
			whereClause.status = filters.status;
		}

		if (filters.minPrice) {
			whereClause.price = {
				...((whereClause.price as any) || {}),
				gte: parseInt(filters.minPrice),
			};
		}

		if (filters.maxPrice) {
			whereClause.price = {
				...((whereClause.price as any) || {}),
				lte: parseInt(filters.maxPrice),
			};
		}

		if (filters.minYear) {
			whereClause.year = { ...((whereClause.year as any) || {}), gte: parseInt(filters.minYear) };
		}

		if (filters.maxYear) {
			whereClause.year = { ...((whereClause.year as any) || {}), lte: parseInt(filters.maxYear) };
		}

		// Fetch all aircraft data with real JetNet data
		const aircraft = await prisma.aircraft.findMany({
			where: whereClause,
			orderBy: [{ manufacturer: 'asc' }, { model: 'asc' }, { year: 'desc' }],
		});

		if (aircraft.length === 0) {
			return NextResponse.json(
				{
					success: false,
					error: 'No aircraft data found matching the specified criteria',
				},
				{ status: 404 }
			);
		}

		// Process data for export
		const exportData = aircraft.map(aircraft => {
			const aircraftData = aircraft as any; // Type cast to access all properties
			const baseData: Record<string, unknown> = {
				// Basic Aircraft Information
				'Aircraft ID': aircraftData.id,
				Registration: aircraftData.registration,
				Manufacturer: aircraftData.manufacturer,
				Model: aircraftData.model,
				Year: aircraftData.year,
				'Serial Number': aircraftData.serialNumber,
				'Total Time': aircraftData.totalTimeHours,
				'Engine Time': aircraftData.engineHours,
				Price: aircraftData.price,
				Currency: aircraftData.currency || 'USD',
				Status: aircraftData.status,
				Location: aircraftData.location,
				Country: aircraftData.country,
				State: aircraftData.state,
				City: aircraftData.city,
				Description: aircraftData.description,
				'Last Updated': aircraftData.updatedAt?.toISOString(),
				Created: aircraftData.createdAt?.toISOString(),
			};

			// Add enrichment data if available
			if (aircraftData.enrichment && typeof aircraftData.enrichment === 'object') {
				const enrichment = aircraftData.enrichment as unknown;
				baseData['Market Value'] = enrichment.marketValue;
				baseData['Market Trend'] = enrichment.marketTrend;
				baseData['Days on Market'] = enrichment.daysOnMarket;
				baseData['Price History'] = enrichment.priceHistory;
			}

			// Add raw JetNet data if available and requested
			if (includeRawData && aircraftData.rawData && typeof aircraftData.rawData === 'object') {
				const rawData = aircraftData.rawData as any;

				// Aircraft specifications
				if (rawData.engines) baseData['Engines'] = rawData.engines;
				if (rawData.maxRange) baseData['Max Range (nm)'] = rawData.maxRange;
				if (rawData.maxSpeed) baseData['Max Speed (kts)'] = rawData.maxSpeed;
				if (rawData.maxAltitude) baseData['Max Altitude (ft)'] = rawData.maxAltitude;
				if (rawData.passengerCapacity) baseData['Passenger Capacity'] = rawData.passengerCapacity;
				if (rawData.cabinHeight) baseData['Cabin Height (in)'] = rawData.cabinHeight;
				if (rawData.cabinLength) baseData['Cabin Length (ft)'] = rawData.cabinLength;
				if (rawData.cabinWidth) baseData['Cabin Width (in)'] = rawData.cabinWidth;
				if (rawData.baggageCapacity) baseData['Baggage Capacity (cu ft)'] = rawData.baggageCapacity;
				if (rawData.fuelCapacity) baseData['Fuel Capacity (gal)'] = rawData.fuelCapacity;
				if (rawData.emptyWeight) baseData['Empty Weight (lbs)'] = rawData.emptyWeight;
				if (rawData.maxTakeoffWeight)
					baseData['Max Takeoff Weight (lbs)'] = rawData.maxTakeoffWeight;
				if (rawData.maxLandingWeight)
					baseData['Max Landing Weight (lbs)'] = rawData.maxLandingWeight;

				// Operating costs if available
				if (rawData.hourlyRate) baseData['Hourly Operating Cost'] = rawData.hourlyRate;
				if (rawData.fuelBurnRate) baseData['Fuel Burn Rate (gph)'] = rawData.fuelBurnRate;
				if (rawData.maintenanceCost) baseData['Maintenance Cost'] = rawData.maintenanceCost;

				// Owner information if available and requested
				if (includeContactInfo) {
					if (rawData.own1companyname) baseData['Owner Company'] = rawData.own1companyname;
					if (rawData.own1fname || rawData.own1lname) {
						baseData['Owner Name'] = `${rawData.own1fname || ''} ${rawData.own1lname || ''}`.trim();
					}
					if (rawData.own1phone1) baseData['Owner Phone'] = rawData.own1phone1;
					if (rawData.own1email) baseData['Owner Email'] = rawData.own1email;
					if (rawData.own1address1) baseData['Owner Address'] = rawData.own1address1;
					if (rawData.own1city) baseData['Owner City'] = rawData.own1city;
					if (rawData.own1state) baseData['Owner State'] = rawData.own1state;
					if (rawData.own1zip) baseData['Owner ZIP'] = rawData.own1zip;
					if (rawData.own1country) baseData['Owner Country'] = rawData.own1country;
				}

				// Operator information if available and requested
				if (includeContactInfo) {
					if (rawData.oper1companyname) baseData['Operator Company'] = rawData.oper1companyname;
					if (rawData.oper1fname || rawData.oper1lname) {
						baseData['Operator Name'] = `${rawData.oper1fname || ''} ${
							rawData.oper1lname || ''
						}`.trim();
					}
					if (rawData.oper1phone1) baseData['Operator Phone'] = rawData.oper1phone1;
					if (rawData.oper1email) baseData['Operator Email'] = rawData.oper1email;
				}

				// Broker information if available and requested
				if (includeBrokerInfo) {
					if (rawData.excbrk1companyname) baseData['Broker Company'] = rawData.excbrk1companyname;
					if (rawData.excbrk1fname || rawData.excbrk1lname) {
						baseData['Broker Name'] = `${rawData.excbrk1fname || ''} ${
							rawData.excbrk1lname || ''
						}`.trim();
					}
					if (rawData.excbrk1phone1) baseData['Broker Phone'] = rawData.excbrk1phone1;
					if (rawData.excbrk1email) baseData['Broker Email'] = rawData.excbrk1email;
					if (rawData.excbrk1address1) baseData['Broker Address'] = rawData.excbrk1address1;
					if (rawData.excbrk1city) baseData['Broker City'] = rawData.excbrk1city;
					if (rawData.excbrk1state) baseData['Broker State'] = rawData.excbrk1state;
					if (rawData.excbrk1zip) baseData['Broker ZIP'] = rawData.excbrk1zip;
					if (rawData.excbrk1country) baseData['Broker Country'] = rawData.excbrk1country;
				}
			}

			return baseData;
		});

		// Generate exports based on requested formats
		const results: any = {
			success: true,
			exportType,
			totalRecords: exportData.length,
			generatedAt: new Date().toISOString(),
			files: [],
		};

		// Generate CSV
		if (formats.includes('csv')) {
			const csvContent = generateCSV(exportData);
			results.files.push({
				format: 'csv',
				filename: `aircraft-data-export-${new Date().toISOString().split('T')[0]}.csv`,
				content: csvContent,
				mimeType: 'text/csv',
			});
		}

		// Generate Excel
		if (formats.includes('excel')) {
			const excelBuffer = generateExcel(exportData);
			results.files.push({
				format: 'excel',
				filename: `aircraft-data-export-${new Date().toISOString().split('T')[0]}.xlsx`,
				content: Buffer.from(excelBuffer).toString('base64'),
				mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});
		}

		return NextResponse.json(results);
	} catch (error) {
		console.error('Error generating comprehensive export:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to generate export',
			},
			{ status: 500 }
		);
	}
}

function generateCSV(data: any[]): string {
	if (data.length === 0) return '';

	const headers = Object.keys(data[0]);
	const csvRows = [
		headers.join(','),
		...data.map(row =>
			headers
				.map(header => {
					const value = row[header];
					if (value === null || value === undefined) return '';
					if (typeof value === 'string' && value.includes(',')) {
						return `"${value.replace(/"/g, '""')}"`;
					}
					return value;
				})
				.join(',')
		),
	];

	return csvRows.join('\n');
}

function generateExcel(data: any[]): Buffer {
	const workbook = XLSX.utils.book_new();
	const worksheet = XLSX.utils.json_to_sheet(data);

	// Set column widths
	const columnWidths = Object.keys(data[0] || {}).map(key => ({
		wch: Math.max(key.length, 15),
	}));
	worksheet['!cols'] = columnWidths;

	XLSX.utils.book_append_sheet(workbook, worksheet, 'Aircraft Data');

	return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
