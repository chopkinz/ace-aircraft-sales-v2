import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			clientInfo,
			reportType = 'market-analysis',
			filters = {},
			includeContactInfo = true,
			includeBrokerInfo = true,
			format: _ = 'pdf',
		} = body;

		// Validate client info
		if (!clientInfo || !clientInfo.name || !clientInfo.email) {
			return NextResponse.json(
				{
					success: false,
					error: 'Client information is required (name and email)',
				},
				{ status: 400 }
			);
		}

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
				...((whereClause.price as Record<string, unknown>) || {}),
				gte: parseInt(filters.minPrice),
			};
		}

		if (filters.maxPrice) {
			whereClause.price = {
				...((whereClause.price as Record<string, unknown>) || {}),
				lte: parseInt(filters.maxPrice),
			};
		}

		if (filters.minYear) {
			whereClause.year = {
				...((whereClause.year as Record<string, unknown>) || {}),
				gte: parseInt(filters.minYear),
			};
		}

		if (filters.maxYear) {
			whereClause.year = {
				...((whereClause.year as Record<string, unknown>) || {}),
				lte: parseInt(filters.maxYear),
			};
		}

		// Fetch aircraft data with real JetNet data
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

		// Generate market analysis
		const marketAnalysis = generateMarketAnalysis(aircraft);

		// Generate client-specific report data
		const reportData = {
			clientInfo,
			reportType,
			generatedAt: new Date().toISOString(),
			generatedBy: 'ACE Aircraft Sales',
			contactInfo: {
				name: 'Douglas Young',
				phone: '(714) 501-9339',
				email: 'douglas@aceaircraftsales.com',
				company: 'ACE Aircraft Sales',
			},
			summary: {
				totalAircraft: aircraft.length,
				priceRange: {
					min: Math.min(...aircraft.map(a => a.price || 0).filter(p => p > 0)),
					max: Math.max(...aircraft.map(a => a.price || 0).filter(p => p > 0)),
					average: aircraft.reduce((sum, a) => sum + (a.price || 0), 0) / aircraft.length,
				},
				yearRange: {
					min: Math.min(...aircraft.map(a => a.year || 0).filter(y => y > 0)),
					max: Math.max(...aircraft.map(a => a.year || 0).filter(y => y > 0)),
				},
				manufacturers: [...new Set(aircraft.map(a => a.manufacturer))],
				locations: [...new Set(aircraft.map(a => a.location).filter(Boolean))],
			},
			marketAnalysis,
			aircraft: aircraft.map(a =>
				processAircraftForReport(a, includeContactInfo, includeBrokerInfo)
			),
		};

		// Save the client report to database
		const savedReport = await prisma.report.create({
			data: {
				title: `Client Report - ${clientInfo.name} - ${reportType}`,
				type: 'MARKET_ANALYSIS' as const,
				description: `Custom client report for ${clientInfo.name} (${clientInfo.email})`,
				data: JSON.stringify(reportData),
				status: 'COMPLETED',
				generatedAt: new Date(),
			},
		});

		return NextResponse.json({
			success: true,
			reportId: savedReport.id,
			reportData,
			message: 'Client report generated successfully',
		});
	} catch (error) {
		console.error('Error generating client report:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to generate client report',
			},
			{ status: 500 }
		);
	}
}

function generateMarketAnalysis(aircraft: Record<string, unknown>[]) {
	const analysis: Record<string, unknown> = {
		marketTrends: {},
		priceAnalysis: {},
		manufacturerBreakdown: {},
		yearDistribution: {},
		locationAnalysis: {},
		recommendations: [],
	};

	// Manufacturer breakdown
	const manufacturerCounts = aircraft.reduce(
		(acc: Record<string, number>, a: Record<string, unknown>) => {
			const manufacturer = a.manufacturer as string;
			acc[manufacturer] = (acc[manufacturer] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);
	analysis.manufacturerBreakdown = manufacturerCounts;

	// Price analysis
	const prices = aircraft.map(a => a.price as number).filter((p: number) => p && p > 0);
	if (prices.length > 0) {
		prices.sort((a: number, b: number) => a - b);
		analysis.priceAnalysis = {
			min: prices[0],
			max: prices[prices.length - 1],
			average: prices.reduce((sum, p) => sum + p, 0) / prices.length,
			median: prices[Math.floor(prices.length / 2)],
			count: prices.length,
		};
	}

	// Year distribution
	const yearCounts = aircraft.reduce((acc: Record<string, number>, a: Record<string, unknown>) => {
		const year = a.year as number;
		if (year) {
			const decade = Math.floor(year / 10) * 10;
			acc[decade.toString()] = (acc[decade.toString()] || 0) + 1;
		}
		return acc;
	}, {} as Record<string, number>);
	analysis.yearDistribution = yearCounts;

	// Location analysis
	const locationCounts = aircraft.reduce(
		(acc: Record<string, number>, a: Record<string, unknown>) => {
			if (a.location) {
				const country = (a.country as string) || 'Unknown';
				acc[country] = (acc[country] || 0) + 1;
			}
			return acc;
		},
		{} as Record<string, number>
	);
	analysis.locationAnalysis = locationCounts;

	// Generate recommendations based on data
	const priceAnalysis = analysis.priceAnalysis as Record<string, unknown>;
	if (
		priceAnalysis.average &&
		typeof priceAnalysis.average === 'number' &&
		priceAnalysis.average > 0
	) {
		const recommendations = analysis.recommendations as string[];
		recommendations.push(
			`Market shows ${
				aircraft.length
			} aircraft with average price of $${priceAnalysis.average.toLocaleString()}`,
			`Most popular manufacturers: ${Object.entries(manufacturerCounts)
				.sort(([, a], [, b]) => (b as number) - (a as number))
				.slice(0, 3)
				.map(([m]) => m)
				.join(', ')}`,
			`Price range: $${(priceAnalysis.min as number).toLocaleString()} - $${(
				priceAnalysis.max as number
			).toLocaleString()}`
		);
	}

	return analysis;
}

function processAircraftForReport(
	aircraft: Record<string, unknown>,
	includeContactInfo: boolean,
	includeBrokerInfo: boolean
) {
	const processed: Record<string, unknown> = {
		// Basic info
		id: aircraft.id,
		registration: aircraft.registration,
		manufacturer: aircraft.manufacturer,
		model: aircraft.model,
		year: aircraft.year,
		serialNumber: aircraft.serialNumber,
		totalTime: aircraft.totalTime,
		engineTime: aircraft.engineTime,
		price: aircraft.price,
		currency: aircraft.currency || 'USD',
		status: aircraft.status,
		location: aircraft.location,
		country: aircraft.country,
		state: aircraft.state,
		city: aircraft.city,
		description: aircraft.description,
		updatedAt: aircraft.updatedAt ? (aircraft.updatedAt as Date).toISOString() : null,

		// Enrichment data
		marketValue: null,
		marketTrend: null,
		daysOnMarket: null,

		// Contact info (if requested and available)
		ownerInfo: null,
		operatorInfo: null,
		brokerInfo: null,

		// Technical specifications
		specifications: {},
	};

	// Add enrichment data
	if (aircraft.enrichment && typeof aircraft.enrichment === 'object') {
		const enrichment = aircraft.enrichment as Record<string, unknown>;
		processed.marketValue = enrichment.marketValue;
		processed.marketTrend = enrichment.marketTrend;
		processed.daysOnMarket = enrichment.daysOnMarket;
	}

	// Add contact info if requested and available
	if (includeContactInfo && aircraft.rawData && typeof aircraft.rawData === 'object') {
		const rawData = aircraft.rawData as Record<string, unknown>;

		// Owner info
		if (rawData.own1companyname || rawData.own1fname || rawData.own1lname) {
			processed.ownerInfo = {
				company: rawData.own1companyname,
				name: `${rawData.own1fname || ''} ${rawData.own1lname || ''}`.trim(),
				phone: rawData.own1phone1,
				email: rawData.own1email,
				address: rawData.own1address1,
				city: rawData.own1city,
				state: rawData.own1state,
				zip: rawData.own1zip,
				country: rawData.own1country,
			};
		}

		// Operator info
		if (rawData.oper1companyname || rawData.oper1fname || rawData.oper1lname) {
			processed.operatorInfo = {
				company: rawData.oper1companyname,
				name: `${rawData.oper1fname || ''} ${rawData.oper1lname || ''}`.trim(),
				phone: rawData.oper1phone1,
				email: rawData.oper1email,
			};
		}

		// Broker info (if requested)
		if (
			includeBrokerInfo &&
			(rawData.excbrk1companyname || rawData.excbrk1fname || rawData.excbrk1lname)
		) {
			processed.brokerInfo = {
				company: rawData.excbrk1companyname,
				name: `${rawData.excbrk1fname || ''} ${rawData.excbrk1lname || ''}`.trim(),
				phone: rawData.excbrk1phone1,
				email: rawData.excbrk1email,
				address: rawData.excbrk1address1,
				city: rawData.excbrk1city,
				state: rawData.excbrk1state,
				zip: rawData.excbrk1zip,
				country: rawData.excbrk1country,
			};
		}

		// Technical specifications
		processed.specifications = {
			engines: rawData.engines,
			maxRange: rawData.maxRange,
			maxSpeed: rawData.maxSpeed,
			maxAltitude: rawData.maxAltitude,
			passengerCapacity: rawData.passengerCapacity,
			cabinHeight: rawData.cabinHeight,
			cabinLength: rawData.cabinLength,
			cabinWidth: rawData.cabinWidth,
			baggageCapacity: rawData.baggageCapacity,
			fuelCapacity: rawData.fuelCapacity,
			emptyWeight: rawData.emptyWeight,
			maxTakeoffWeight: rawData.maxTakeoffWeight,
			hourlyRate: rawData.hourlyRate,
			fuelBurnRate: rawData.fuelBurnRate,
		};
	}

	return processed;
}
