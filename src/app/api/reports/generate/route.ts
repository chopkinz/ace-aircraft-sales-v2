import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { PriceTrend, MarketTrendType } from '@prisma/client';
import { ComprehensiveMarketReport } from '@/lib/comprehensive-market-report';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { type, reportType, aircraftIds, filters } = body;
		const reportTypeToUse = type || reportType;

		// Market Evaluation Report
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

		// Comprehensive Market Intelligence Report
		if (reportTypeToUse === 'comprehensive-market-intelligence') {
			const reportGenerator = new ComprehensiveMarketReport({
				reportTitle: 'ACE Aircraft Sales - Comprehensive Market Intelligence Report',
				contactInfo: {
					primary: {
						name: 'Douglas Young',
						phone: '(714) 501-9339',
						email: 'douglas@aceaircraftsales.com',
					},
					business: {
						name: 'ACE Aircraft Sales',
						email: 'douglas@aceaircraftsales.com',
						phone: '(714) 501-9339',
						website: 'www.aceaircraftsales.com',
					},
				},
			});

			const result = await reportGenerator.generateComprehensiveReport();

			if (result.success) {
				// Save the report to database
				const savedReport = await prisma.report.create({
					data: {
						title: 'Comprehensive Market Intelligence Report',
						type: 'MARKET_ANALYSIS' as const,
						description:
							'Complete market intelligence with all aircraft data, analysis, and insights',
						data: JSON.stringify(result),
						status: 'COMPLETED',
						generatedAt: new Date(),
					},
				});

				return NextResponse.json({
					success: true,
					report: savedReport,
					data: {
						reportType: 'comprehensive-market-intelligence',
						totalAircraft: result.totalAircraft,
						duration: result.duration,
						datasets: Object.keys(result.datasets).length,
						generatedAt: new Date(),
					},
				});
			} else {
				throw new Error(result.error || 'Failed to generate comprehensive report');
			}
		}

		// Recent Sales Detailed Report
		if (reportTypeToUse === 'recent-sales-detailed') {
			const { manufacturer, model, timeframe = '12months' } = filters || {};

			// Get aircraft data based on filters
			const whereClause: Record<string, unknown> = {
				status: 'SOLD',
			};

			if (manufacturer && manufacturer !== 'all') {
				whereClause.manufacturer = manufacturer;
			}
			if (model && model !== 'all') {
				whereClause.model = model;
			}

			// Add date filter based on timeframe
			const now = new Date();
			const dateFilter = new Date();
			switch (timeframe) {
				case '6months':
					dateFilter.setMonth(now.getMonth() - 6);
					break;
				case '12months':
					dateFilter.setFullYear(now.getFullYear() - 1);
					break;
				case '24months':
					dateFilter.setFullYear(now.getFullYear() - 2);
					break;
				default:
					dateFilter.setFullYear(now.getFullYear() - 1);
			}

			whereClause.updatedAt = {
				gte: dateFilter,
			};

			const soldAircraft = await prisma.aircraft.findMany({
				where: whereClause,
				orderBy: { updatedAt: 'desc' },
			});

			// Analyze sold aircraft data
			const analysis = {
				totalSold: soldAircraft.length,
				averageSalePrice: 0,
				medianSalePrice: 0,
				priceRange: { min: 0, max: 0 },
				yearRange: { min: 0, max: 0 },
				topModels: {},
				geographicDistribution: {},
				timeToSale: {},
			};

			if (soldAircraft.length > 0) {
				const prices = soldAircraft
					.map(a => a.price)
					.filter((p): p is number => p !== null && p !== undefined && p > 0)
					.sort((a, b) => a - b);

				const years = soldAircraft
					.map(a => a.year)
					.filter((y): y is number => y !== null && y !== undefined && y > 0)
					.sort((a, b) => a - b);

				analysis.averageSalePrice =
					prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
				analysis.medianSalePrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;
				analysis.priceRange = {
					min: prices.length > 0 ? prices[0] : 0,
					max: prices.length > 0 ? prices[prices.length - 1] : 0,
				};
				analysis.yearRange = {
					min: years.length > 0 ? years[0] : 0,
					max: years.length > 0 ? years[years.length - 1] : 0,
				};

				// Top models analysis
				const modelCounts = soldAircraft.reduce((acc, aircraft) => {
					const key = `${aircraft.manufacturer} ${aircraft.model}`;
					acc[key] = (acc[key] || 0) + 1;
					return acc;
				}, {} as Record<string, number>);

				analysis.topModels = Object.entries(modelCounts)
					.sort(([, a], [, b]) => b - a)
					.slice(0, 10)
					.reduce((acc, [model, count]) => {
						acc[model] = count;
						return acc;
					}, {} as Record<string, number>);

				// Geographic distribution
				const geoCounts = soldAircraft.reduce((acc, aircraft) => {
					const state = aircraft.location?.split(',')[1]?.trim() || 'Unknown';
					acc[state] = (acc[state] || 0) + 1;
					return acc;
				}, {} as Record<string, number>);

				analysis.geographicDistribution = Object.entries(geoCounts)
					.sort(([, a], [, b]) => b - a)
					.slice(0, 10)
					.reduce((acc, [state, count]) => {
						acc[state] = count;
						return acc;
					}, {} as Record<string, number>);
			}

			// Save the report to database
			const savedReport = await prisma.report.create({
				data: {
					title: `Recent Sales Detailed Report - ${manufacturer || 'All Makes'} ${
						model || ''
					}`.trim(),
					type: 'MARKET_ANALYSIS' as const,
					description: `Detailed analysis of recent aircraft sales for ${
						manufacturer || 'all manufacturers'
					} ${model || ''} in the last ${timeframe}`,
					data: JSON.stringify({
						filters: { manufacturer, model, timeframe },
						aircraft: soldAircraft,
						analysis,
						summary: {
							totalSold: soldAircraft.length,
							averageSalePrice: analysis.averageSalePrice,
							medianSalePrice: analysis.medianSalePrice,
							priceRange: analysis.priceRange,
							yearRange: analysis.yearRange,
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
					reportType: 'recent-sales-detailed',
					aircraftCount: soldAircraft.length,
					averagePrice: analysis.averageSalePrice,
					generatedAt: new Date(),
				},
			});
		}

		// AviaCost Analysis Report
		if (reportTypeToUse === 'aviacost-analysis') {
			const { aircraft1, aircraft2, utilization = '200' } = filters || {};

			// Get aircraft data for comparison
			const aircraftData = await prisma.aircraft.findMany({
				where: {
					id: {
						in: [aircraft1, aircraft2].filter(Boolean),
					},
				},
			});

			if (aircraftData.length < 2) {
				return NextResponse.json(
					{
						success: false,
						error: 'Two aircraft are required for AviaCost analysis',
					},
					{ status: 400 }
				);
			}

			const [aircraft1Data, aircraft2Data] = aircraftData;

			// Calculate AviaCost analysis
			const utilizationHours = parseInt(utilization) || 200;

			const calculateOperatingCosts = async (aircraft: Record<string, unknown>, hours: number) => {
				// Get real operating cost data from JetNet or database
				// First try to get cost data from aircraft raw data
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const rawData = aircraft.rawData as any;
				let hourlyRate = 0;
				let fuelCost = 0;
				let maintenanceCost = 0;
				let crewCost = 0;

				// Try to extract real cost data from raw data if available
				if (rawData && typeof rawData === 'object') {
					// Look for cost-related fields in raw data
					hourlyRate = rawData.hourlyRate || rawData.operatingCost || rawData.costPerHour || 0;
					fuelCost = rawData.fuelCost || rawData.fuelBurnRate || 0;
					maintenanceCost = rawData.maintenanceCost || rawData.maintenanceRate || 0;
					crewCost = rawData.crewCost || rawData.pilotCost || 0;
				}

				// If no real data available, use aircraft characteristics for estimation
				if (hourlyRate === 0) {
					// Base estimation on aircraft size and type from real data
					const year = aircraft.year as number;
					const price = aircraft.price as number;
					const manufacturer = aircraft.manufacturer as string;

					// Calculate base rate from aircraft value and age
					if (price && year) {
						const age = new Date().getFullYear() - year;
						const depreciationFactor = Math.max(0.3, 1 - age * 0.05); // 5% depreciation per year, minimum 30%
						const baseValue = price * depreciationFactor;

						// Estimate hourly rate based on aircraft value (roughly 2-4% of value per 100 hours)
						hourlyRate = (baseValue * 0.03) / 100;

						// Adjust for manufacturer type based on real market data
						if (manufacturer === 'GULFSTREAM') {
							hourlyRate *= 1.5;
						} else if (manufacturer === 'BOMBARDIER' || manufacturer === 'DASSAULT') {
							hourlyRate *= 1.2;
						} else if (manufacturer === 'CESSNA' || manufacturer === 'EMBRAER') {
							hourlyRate *= 0.8;
						}
					} else {
						// Fallback to manufacturer-based estimation only if no price data
						hourlyRate =
							manufacturer === 'GULFSTREAM'
								? 2500
								: manufacturer === 'BOMBARDIER'
								? 2000
								: manufacturer === 'DASSAULT'
								? 2200
								: manufacturer === 'CESSNA'
								? 1200
								: manufacturer === 'EMBRAER'
								? 1500
								: 1000;
					}
				}

				// Calculate costs based on real or estimated hourly rate
				const totalCost = hourlyRate * hours;

				// Use real cost breakdown if available, otherwise use industry averages
				fuelCost = fuelCost > 0 ? fuelCost * hours : totalCost * 0.35; // 35% fuel
				maintenanceCost = maintenanceCost > 0 ? maintenanceCost * hours : totalCost * 0.25; // 25% maintenance
				crewCost = crewCost > 0 ? crewCost * hours : totalCost * 0.2; // 20% crew
				const otherCosts = totalCost * 0.2; // 20% other

				return {
					totalOperatingCost: totalCost,
					fuelCost,
					maintenanceCost,
					crewCost,
					otherCosts,
					hourlyRate,
					dataSource:
						rawData && (rawData.hourlyRate || rawData.operatingCost) ? 'real' : 'estimated',
				};
			};

			const aircraft1Costs = await calculateOperatingCosts(aircraft1Data, utilizationHours);
			const aircraft2Costs = await calculateOperatingCosts(aircraft2Data, utilizationHours);

			const comparison = {
				aircraft1: {
					...aircraft1Data,
					costs: aircraft1Costs,
				},
				aircraft2: {
					...aircraft2Data,
					costs: aircraft2Costs,
				},
				utilizationHours,
				savings: aircraft1Costs.totalOperatingCost - aircraft2Costs.totalOperatingCost,
				recommendation:
					aircraft1Costs.totalOperatingCost < aircraft2Costs.totalOperatingCost
						? `${aircraft1Data.manufacturer} ${aircraft1Data.model}`
						: `${aircraft2Data.manufacturer} ${aircraft2Data.model}`,
			};

			// Save the report to database
			const savedReport = await prisma.report.create({
				data: {
					title: `AviaCost Analysis - ${aircraft1Data.manufacturer} ${aircraft1Data.model} vs ${aircraft2Data.manufacturer} ${aircraft2Data.model}`,
					type: 'MARKET_ANALYSIS' as const,
					description: `Operating cost comparison analysis for ${utilizationHours} hours utilization`,
					data: JSON.stringify({
						filters: { aircraft1, aircraft2, utilization: utilizationHours },
						comparison,
						summary: {
							totalCost1: aircraft1Costs.totalOperatingCost,
							totalCost2: aircraft2Costs.totalOperatingCost,
							savings: comparison.savings,
							recommendation: comparison.recommendation,
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
					reportType: 'aviacost-analysis',
					totalCost1: aircraft1Costs.totalOperatingCost,
					totalCost2: aircraft2Costs.totalOperatingCost,
					savings: comparison.savings,
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
