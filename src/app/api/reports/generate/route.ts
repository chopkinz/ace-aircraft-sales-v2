import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { PriceTrend, MarketTrendType } from '@prisma/client';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { type, reportType, aircraftIds } = body;
		const reportTypeToUse = type || reportType;

		if (reportTypeToUse === 'market-evaluation') {
			// Generate market evaluation report
			const aircraft = await prisma.aircraft.findMany({
				where: {
					id: {
						in: aircraftIds,
					},
				},
			});

			// Group by manufacturer and model
			const groupedData = aircraft.reduce((acc, aircraft) => {
				const key = `${aircraft.manufacturer}-${aircraft.model}`;
				if (!acc[key]) {
					acc[key] = {
						make: aircraft.manufacturer,
						model: aircraft.model,
						prices: [],
						totalListings: 0,
					};
				}
				if (aircraft.price) {
					acc[key].prices.push(aircraft.price);
				}
				acc[key].totalListings++;
				return acc;
			}, {} as Record<string, { make: string; model: string; prices: number[]; totalListings: number }>);

			// Calculate market data for each group
			const marketData = Object.values(groupedData).map(
				(group: { make: string; model: string; prices: number[]; totalListings: number }) => {
					const prices = group.prices.filter((p: number) => p > 0);
					const avgPrice =
						prices.length > 0
							? prices.reduce((a: number, b: number) => a + b, 0) / prices.length
							: 0;
					const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
					const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

					return {
						make: group.make,
						model: group.model,
						category: 'Business Jet',
						avgPrice,
						minPrice,
						maxPrice,
						totalListings: group.totalListings,
						avgDaysOnMarket: 0, // Would need additional data
						priceTrend: PriceTrend.STABLE, // Would need historical data
						marketTrend: MarketTrendType.WARM,
						dataDate: new Date(),
						source: 'ACE Aircraft Intelligence',
					};
				}
			);

			// Save market data to database
			for (const data of marketData) {
				await prisma.marketData.create({
					data: {
						aircraftId: aircraftIds[0], // Use first aircraft ID as reference
						make: data.make as string,
						model: data.model,
						category: data.category as string,
						avgPrice: data.avgPrice as number,
						minPrice: data.minPrice as number,
						maxPrice: data.maxPrice as number,
						totalListings: data.totalListings as number,
						avgDaysOnMarket: data.avgDaysOnMarket as number,
						priceTrend: data.priceTrend as PriceTrend,
						marketTrend: data.marketTrend as MarketTrendType,
						source: data.source as string,
						dataDate: data.dataDate,
					},
				});
			}

			// Save the report to database
			const savedReport = await prisma.report.create({
				data: {
					title: 'Market Evaluation Report',
					type: 'MARKET_ANALYSIS',
					description: 'Comprehensive market analysis for aircraft listings',
					data: JSON.stringify({
						aircraft: aircraft,
						marketData: marketData,
						summary: {
							totalAircraft: aircraft.length,
							totalValue: aircraft.reduce((sum, a) => sum + (a.price || 0), 0),
							avgPrice: aircraft.reduce((sum, a) => sum + (a.price || 0), 0) / aircraft.length || 0,
							manufacturers: [...new Set(aircraft.map(a => a.manufacturer))],
							generatedAt: new Date(),
						},
					}),
					status: 'COMPLETED',
					generatedAt: new Date(),
				},
			});

			return NextResponse.json({
				success: true,
				report: savedReport,
				data: {
					reportType: 'market-evaluation',
					aircraftCount: aircraft.length,
					marketDataCount: marketData.length,
					generatedAt: new Date(),
				},
			});
		}

		return NextResponse.json(
			{
				success: false,
				error: 'Invalid report type',
			},
			{ status: 400 }
		);
	} catch (error) {
		console.error('Error generating report:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to generate report',
			},
			{ status: 500 }
		);
	}
}
