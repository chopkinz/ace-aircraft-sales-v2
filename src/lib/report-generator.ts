import { PrismaClient, Aircraft } from '@prisma/client';
import { smartLeadScoringSystem, LeadScoreResult } from './smart-lead-scoring';
import { cj4AlertSystem, CJ4Alert, CJ4MarketAnalysis } from './cj4-alert-system';
import { ghlWebhookService } from './ghl-webhook-service';
import { logger } from './logger';

const prisma = new PrismaClient();

export interface ReportParams {
	dateRange: {
		start: Date;
		end: Date;
	};
	filters?: {
		aircraftTypes?: string[];
		priceRange?: { min: number; max: number };
		locations?: string[];
		status?: string[];
	};
	includeCharts?: boolean;
	format?: 'PDF' | 'EXCEL' | 'CSV';
}

export interface ScoredAircraft extends Aircraft {
	score?: number;
	commissionPotential?: number;
}

export interface LeadScoreResultWithAircraft extends LeadScoreResult {
	aircraft: Aircraft;
}

export interface CJ4MarketAnalysisResult extends CJ4MarketAnalysis {
	// Extends the base CJ4MarketAnalysis interface
}

export interface CJ4OwnerNetworkData {
	totalOwners: number;
	cj4Owners: number;
	cj3Owners: number;
	fleetOwners: number;
	upgradeCandidates: number;
}

export interface CJ4MarketInsightsData {
	pricingRecommendations: string[];
	marketOpportunities: string[];
	riskFactors: string[];
}

export interface ClientPreferences {
	preferredModels: string[];
	budgetRange: { min: number; max: number };
	preferredLocations: string[];
	useCase: string;
	contactInfo?: {
		name: string;
		email: string | null;
		phone: string | null;
		company: string | null;
	};
}

export interface MarketComparisonsData {
	avgPrice: number;
	priceRange: { min: number; max: number };
	marketPosition: string;
	totalRecommendations: number;
}

export interface InvestmentAnalysisData {
	totalInvestment: number;
	avgCommission: number;
	roi: number;
	recommendationCount: number;
}

export interface ModelBreakdown {
	model: string;
	count: number;
	avgCommission: number;
	totalPotential: number;
}

export interface GeographicBreakdown {
	location: string;
	count: number;
	totalPotential: number;
}

export interface Report {
	id: string;
	name: string;
	type: 'MARKET_ANALYSIS' | 'COMMISSION_FORECAST' | 'CJ4_SPECIALTY' | 'CUSTOM_CLIENT';
	generatedAt: Date;
	params: ReportParams;
	data: MarketAnalysisData | CommissionForecastData | CJ4SpecialtyData | Record<string, unknown>;
	charts?: Array<{ type: string; data: unknown }>;
	summary: {
		totalAircraft: number;
		cj4Aircraft: number;
		totalCommissionPotential: number;
		avgPrice: number;
		marketTrend: string;
	};
}

export interface MarketAnalysisData {
	totalAircraft: number;
	cj4Aircraft: number;
	avgPrice: number;
	priceRange: { min: number; max: number };
	marketTrend: 'RISING' | 'FALLING' | 'STABLE';
	daysOnMarket: number;
	absorptionRate: number;
	geographicDistribution: {
		location: string;
		count: number;
		avgPrice: number;
	}[];
	competitorAnalysis: {
		name: string;
		listings: number;
		avgPrice: number;
		marketShare: number;
	}[];
	topOpportunities: LeadScoreResultWithAircraft[];
}

export interface CommissionForecastData {
	currentPipeline: {
		aircraft: LeadScoreResultWithAircraft[];
		totalValue: number;
		commissionPotential: number;
	};
	forecast30Days: {
		probability: number;
		commissionPotential: number;
	};
	forecast60Days: {
		probability: number;
		commissionPotential: number;
	};
	forecast90Days: {
		probability: number;
		commissionPotential: number;
	};
	modelBreakdown: ModelBreakdown[];
	geographicBreakdown: GeographicBreakdown[];
}

export interface CJ4SpecialtyData {
	cj4MarketOverview: {
		totalListings: number;
		avgPrice: number;
		priceRange: { min: number; max: number };
		marketTrend: string;
		daysOnMarket: number;
		absorptionRate: number;
	};
	competitorAnalysis: {
		name: string;
		listings: number;
		avgPrice: number;
	}[];
	opportunities: CJ4Alert[];
	alerts: CJ4Alert[];
	ownerNetwork: CJ4OwnerNetworkData;
	marketInsights: CJ4MarketInsightsData;
}

export class ReportGenerator {
	/**
	 * Generate comprehensive market analysis report
	 */
	async generateMarketAnalysisReport(params: ReportParams): Promise<Report> {
		logger.info('Generating market analysis report', { params });

		try {
			// Query live database for current market data
			const aircraft = await prisma.aircraft.findMany({
				where: {
					createdAt: {
						gte: params.dateRange.start,
						lte: params.dateRange.end,
					},
					...(params.filters?.aircraftTypes && {
						model: {
							in: params.filters.aircraftTypes,
						},
					}),
					...(params.filters?.priceRange && {
						price: {
							gte: params.filters.priceRange.min,
							lte: params.filters.priceRange.max,
						},
					}),
				},
				orderBy: { createdAt: 'desc' },
			});

			// Calculate market metrics and trends
			const marketData = await this.calculateMarketMetrics(aircraft);

			logger.info('Successfully fetched data from database', {
				aircraftCount: aircraft.length,
				totalAircraft: marketData.totalAircraft,
				cj4Aircraft: marketData.cj4Aircraft,
			});

			// Generate charts and visualizations
			const charts = params.includeCharts ? await this.generateMarketCharts(marketData) : [];

			// Create report data
			const reportData: MarketAnalysisData = {
				totalAircraft: marketData.totalAircraft,
				cj4Aircraft: marketData.cj4Aircraft,
				avgPrice: marketData.avgPrice,
				priceRange: marketData.priceRange,
				marketTrend: marketData.marketTrend,
				daysOnMarket: marketData.daysOnMarket,
				absorptionRate: marketData.absorptionRate,
				geographicDistribution: marketData.geographicDistribution,
				competitorAnalysis: marketData.competitorAnalysis,
				topOpportunities: marketData.topOpportunities,
			};

			// Save report history
			const report = await this.saveReport({
				name: 'Market Analysis Report',
				type: 'MARKET_ANALYSIS',
				params,
				data: reportData,
				charts,
				summary: {
					totalAircraft: reportData.totalAircraft,
					cj4Aircraft: reportData.cj4Aircraft,
					totalCommissionPotential: this.calculateTotalCommission(reportData.topOpportunities),
					avgPrice: reportData.avgPrice,
					marketTrend: reportData.marketTrend,
				},
			});

			logger.info('Market analysis report generated successfully', {
				reportId: report.id,
				totalAircraft: reportData.totalAircraft,
				cj4Aircraft: reportData.cj4Aircraft,
			});

			return report;
		} catch (error) {
			logger.error(
				'Failed to generate market analysis report',
				error instanceof Error ? error : undefined,
				{
					params,
				}
			);
			throw error;
		}
	}

	/**
	 * Generate commission forecast report
	 */
	async generateCommissionForecastReport(): Promise<Report> {
		logger.info('Generating commission forecast report');

		try {
			// Get current pipeline data
			const aircraft = await prisma.aircraft.findMany({
				where: { status: 'AVAILABLE' },
				orderBy: { price: 'desc' },
			});

			if (aircraft.length === 0) {
				logger.warn('No aircraft found for commission forecast report');
				throw new Error('No aircraft data available for commission forecast');
			}

			// Calculate lead scores for all aircraft
			const scoredAircraft = await smartLeadScoringSystem.batchScoreAircraft(aircraft, [], []);

			// Combine LeadScoreResult with Aircraft data
			const scoredAircraftWithData: LeadScoreResultWithAircraft[] = scoredAircraft.map(score => ({
				...score,
				aircraft: aircraft.find(ac => ac.id === score.aircraftId.toString())!,
			}));

			// Generate forecast data
			const forecastData: CommissionForecastData = {
				currentPipeline: {
					aircraft: scoredAircraftWithData.slice(0, 20), // Top 20 opportunities
					totalValue: scoredAircraftWithData.reduce(
						(sum, ac) => sum + (ac.commissionPotential || 0),
						0
					),
					commissionPotential: scoredAircraftWithData.reduce(
						(sum, ac) => sum + (ac.commissionPotential || 0),
						0
					),
				},
				forecast30Days: this.calculateForecast(scoredAircraftWithData, 30),
				forecast60Days: this.calculateForecast(scoredAircraftWithData, 60),
				forecast90Days: this.calculateForecast(scoredAircraftWithData, 90),
				modelBreakdown: this.calculateModelBreakdown(scoredAircraftWithData),
				geographicBreakdown: this.calculateGeographicBreakdown(scoredAircraftWithData),
			};

			const report = await this.saveReport({
				name: 'Commission Forecast Report',
				type: 'COMMISSION_FORECAST',
				params: {
					dateRange: {
						start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
						end: new Date(),
					},
				},
				data: forecastData,
				summary: {
					totalAircraft: aircraft.length,
					cj4Aircraft: aircraft.filter(ac => ac.model.toUpperCase().includes('CJ4')).length,
					totalCommissionPotential: forecastData.currentPipeline.commissionPotential,
					avgPrice: aircraft.reduce((sum, ac) => sum + Number(ac.price || 0), 0) / aircraft.length,
					marketTrend: 'STABLE',
				},
			});

			logger.info('Commission forecast report generated successfully', {
				reportId: report.id,
				totalAircraft: aircraft.length,
				commissionPotential: forecastData.currentPipeline.commissionPotential,
			});

			return report;
		} catch (error) {
			logger.error(
				'Failed to generate commission forecast report',
				error instanceof Error ? error : undefined
			);
			throw error;
		}
	}

	/**
	 * Generate CJ4 specialty report for Douglas
	 */
	async generateCJ4SpecialtyReport(): Promise<Report> {
		logger.info('Generating CJ4 specialty report');

		try {
			// Get CJ4 aircraft data
			const cj4Aircraft = await prisma.aircraft.findMany({
				where: {
					model: {
						contains: 'CJ4',
					},
				},
				orderBy: { price: 'desc' },
			});

			if (cj4Aircraft.length === 0) {
				logger.warn('No CJ4 aircraft found for specialty report');
				throw new Error('No CJ4 aircraft data available for specialty report');
			}

			// Generate CJ4 market analysis
			const cj4Analysis = cj4AlertSystem.generateCJ4MarketAnalysis(cj4Aircraft, []);

			// Generate CJ4 alerts
			const cj4Alerts = cj4AlertSystem.analyzeCJ4Opportunities(cj4Aircraft, [], []);

			// Calculate owner network data
			const ownerNetwork = await this.calculateCJ4OwnerNetwork();

			// Generate market insights
			const marketInsights = this.generateCJ4MarketInsights(cj4Analysis);

			const specialtyData: CJ4SpecialtyData = {
				cj4MarketOverview: {
					totalListings: cj4Analysis.totalCJ4Listings,
					avgPrice: cj4Analysis.avgPrice,
					priceRange: cj4Analysis.priceRange,
					marketTrend: cj4Analysis.marketTrend,
					daysOnMarket: cj4Analysis.daysOnMarket,
					absorptionRate: cj4Analysis.absorptionRate,
				},
				competitorAnalysis: cj4Analysis.competitorAnalysis,
				opportunities: cj4Analysis.opportunities,
				alerts: cj4Alerts,
				ownerNetwork,
				marketInsights,
			};

			const report = await this.saveReport({
				name: 'CJ4 Specialty Report',
				type: 'CJ4_SPECIALTY',
				params: {
					dateRange: {
						start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
						end: new Date(),
					},
				},
				data: specialtyData,
				summary: {
					totalAircraft: cj4Aircraft.length,
					cj4Aircraft: cj4Aircraft.length,
					totalCommissionPotential: cj4Aircraft.reduce(
						(sum, ac) => sum + Number(ac.price || 0) * 0.03,
						0
					),
					avgPrice: cj4Analysis.avgPrice,
					marketTrend: cj4Analysis.marketTrend,
				},
			});

			logger.info('CJ4 specialty report generated successfully', {
				reportId: report.id,
				cj4AircraftCount: cj4Aircraft.length,
				avgPrice: cj4Analysis.avgPrice,
			});

			return report;
		} catch (error) {
			logger.error(
				'Failed to generate CJ4 specialty report',
				error instanceof Error ? error : undefined
			);
			throw error;
		}
	}

	/**
	 * Generate custom client report
	 */
	async generateCustomClientReport(clientId: string): Promise<Report> {
		logger.info(`Generating custom client report for ${clientId}`);

		try {
			// Get client preferences and requirements
			const clientPreferences = await this.getClientPreferences(clientId);

			// Get aircraft recommendations based on client preferences
			const recommendations = await this.getAircraftRecommendations(clientPreferences);

			if (recommendations.length === 0) {
				logger.warn(`No aircraft recommendations found for client ${clientId}`);
				throw new Error('No aircraft recommendations available for this client');
			}

			// Generate market comparisons
			const marketComparisons = await this.generateMarketComparisons(recommendations);

			// Generate investment analysis
			const investmentAnalysis = await this.generateInvestmentAnalysis(recommendations);

			const clientData = {
				clientPreferences,
				recommendations,
				marketComparisons,
				investmentAnalysis,
				generatedAt: new Date(),
			};

			const report = await this.saveReport({
				name: `Custom Client Report - ${clientId}`,
				type: 'CUSTOM_CLIENT',
				params: {
					dateRange: {
						start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
						end: new Date(),
					},
				},
				data: clientData,
				summary: {
					totalAircraft: recommendations.length,
					cj4Aircraft: recommendations.filter(ac =>
						ac.aircraft?.model?.toUpperCase().includes('CJ4')
					).length,
					totalCommissionPotential: recommendations.reduce(
						(sum, ac) => sum + (ac.commissionPotential || 0),
						0
					),
					avgPrice:
						recommendations.reduce((sum, ac) => sum + Number(ac.aircraft?.price || 0), 0) /
						recommendations.length,
					marketTrend: 'STABLE',
				},
			});

			logger.info('Custom client report generated successfully', {
				reportId: report.id,
				clientId,
				recommendationsCount: recommendations.length,
			});

			return report;
		} catch (error) {
			logger.error(
				'Failed to generate custom client report',
				error instanceof Error ? error : undefined,
				{ clientId }
			);
			throw error;
		}
	}

	/**
	 * Export report to PDF
	 */
	async exportToPDF(report: Report): Promise<Buffer> {
		logger.info(`Exporting report to PDF: ${report.name}`);

		try {
			// This would integrate with a PDF generation library like Puppeteer or jsPDF
			// For now, return a placeholder buffer
			const pdfContent = this.generatePDFContent(report);
			return Buffer.from(pdfContent, 'utf-8');
		} catch (error) {
			logger.error('Failed to export to PDF', error instanceof Error ? error : undefined);
			throw error;
		}
	}

	/**
	 * Export report to Excel
	 */
	async exportToExcel(report: Report): Promise<Buffer> {
		logger.info(`Exporting report to Excel: ${report.name}`);

		try {
			// This would integrate with a library like xlsx
			const excelContent = this.generateExcelContent(report);
			return Buffer.from(excelContent, 'utf-8');
		} catch (error) {
			logger.error('Failed to export to Excel', error instanceof Error ? error : undefined);
			throw error;
		}
	}

	/**
	 * Export data to CSV
	 */
	async exportToCSV(data: Record<string, unknown>[]): Promise<string> {
		logger.info('Exporting data to CSV');

		try {
			if (data.length === 0) return '';

			const headers = Object.keys(data[0]);
			const csvRows = [headers.join(',')];

			for (const row of data) {
				const values = headers.map(header => {
					const value = row[header];
					return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
				});
				csvRows.push(values.join(','));
			}

			return csvRows.join('\n');
		} catch (error) {
			logger.error('Failed to export to CSV', error instanceof Error ? error : undefined);
			throw error;
		}
	}

	/**
	 * Email report to recipients
	 */
	async emailReport(report: Report, recipients: string[]): Promise<void> {
		logger.info(`Emailing report to ${recipients.length} recipients: ${report.name}`);

		try {
			// This would integrate with an email service like SendGrid or Nodemailer
			// const emailContent = this.generateEmailContent(report);

			for (const recipient of recipients) {
				await this.sendEmail(recipient, report.name);
			}

			logger.info('Report emailed successfully');
		} catch (error) {
			logger.error('Failed to email report', error instanceof Error ? error : undefined);
			throw error;
		}
	}

	/**
	 * Schedule automatic report generation
	 */
	async scheduleAutomaticReports(): Promise<void> {
		logger.info('Setting up automatic report generation');

		// Schedule daily CJ4 report
		this.scheduleReport('daily-cj4', 'CJ4_SPECIALTY', '0 8 * * *'); // 8 AM daily

		// Schedule weekly market analysis
		this.scheduleReport('weekly-market', 'MARKET_ANALYSIS', '0 9 * * 1'); // 9 AM Mondays

		// Schedule monthly commission forecast
		this.scheduleReport('monthly-commission', 'COMMISSION_FORECAST', '0 10 1 * *'); // 10 AM 1st of month

		logger.info('Automatic reports scheduled');
	}

	/**
	 * Helper methods
	 */
	private async calculateMarketMetrics(aircraft: Aircraft[]): Promise<MarketAnalysisData> {
		if (aircraft.length === 0) {
			logger.warn('No aircraft data available for market metrics calculation');
			throw new Error('No aircraft data available for market analysis');
		}

		const cj4Aircraft = aircraft.filter(ac => ac.model.toUpperCase().includes('CJ4'));
		const prices = aircraft
			.map(ac => ac.price)
			.filter(price => price !== null && price !== undefined)
			.map(price => Number(price)) as number[];

		const avgPrice =
			prices.length > 0 ? prices.reduce((sum, price) => sum + Number(price), 0) / prices.length : 0;
		const priceRange =
			prices.length > 0
				? {
						min: Math.min(...prices),
						max: Math.max(...prices),
					}
				: { min: 0, max: 0 };

		// Calculate geographic distribution from actual aircraft data
		const locationMap = new Map<string, { count: number; totalPrice: number }>();
		aircraft.forEach(ac => {
			const location = ac.location || 'Unknown';
			const existing = locationMap.get(location) || { count: 0, totalPrice: 0 };
			existing.count++;
			if (ac.price) existing.totalPrice += Number(ac.price);
			locationMap.set(location, existing);
		});

		const geographicDistribution = Array.from(locationMap.entries()).map(([location, data]) => ({
			location,
			count: data.count,
			avgPrice: data.count > 0 ? data.totalPrice / data.count : 0,
		}));

		// Calculate competitor analysis from actual data
		const competitorMap = new Map<string, { listings: number; totalPrice: number }>();
		aircraft.forEach(ac => {
			// Extract competitor info from aircraft data or use manufacturer as proxy
			const competitor = ac.manufacturer || 'Unknown';
			const existing = competitorMap.get(competitor) || { listings: 0, totalPrice: 0 };
			existing.listings++;
			if (ac.price) existing.totalPrice += Number(ac.price);
			competitorMap.set(competitor, existing);
		});

		const competitorAnalysis = Array.from(competitorMap.entries()).map(([name, data]) => ({
			name,
			listings: data.listings,
			avgPrice: data.listings > 0 ? data.totalPrice / data.listings : 0,
			marketShare: aircraft.length > 0 ? (data.listings / aircraft.length) * 100 : 0,
		}));

		// Get top opportunities using smart lead scoring
		const scoredAircraft = await smartLeadScoringSystem.batchScoreAircraft(
			aircraft.slice(0, 10),
			[],
			[]
		);

		// Combine LeadScoreResult with Aircraft data
		const topOpportunities: LeadScoreResultWithAircraft[] = scoredAircraft.map(score => ({
			...score,
			aircraft: aircraft.find(ac => ac.id === score.aircraftId.toString())!,
		}));

		// Calculate market trend based on price changes over time
		const marketTrend = this.calculateMarketTrend(aircraft);

		return {
			totalAircraft: aircraft.length,
			cj4Aircraft: cj4Aircraft.length,
			avgPrice,
			priceRange,
			marketTrend,
			daysOnMarket: this.calculateAverageDaysOnMarket(aircraft),
			absorptionRate: this.calculateAbsorptionRate(aircraft),
			geographicDistribution,
			competitorAnalysis,
			topOpportunities,
		};
	}

	private async generateMarketCharts(
		data: MarketAnalysisData
	): Promise<Array<{ type: string; data: unknown }>> {
		// This would generate chart data for visualization libraries
		return [
			{ type: 'price-trend', data: [] },
			{ type: 'geographic-distribution', data: data.geographicDistribution },
			{ type: 'competitor-analysis', data: data.competitorAnalysis },
		];
	}

	private calculateTotalCommission(opportunities: LeadScoreResultWithAircraft[]): number {
		return opportunities.reduce((sum, opp) => sum + (opp.commissionPotential || 0), 0);
	}

	private calculateForecast(
		aircraft: LeadScoreResultWithAircraft[],
		days: number
	): { probability: number; commissionPotential: number } {
		const totalPotential = aircraft.reduce((sum, ac) => sum + (ac.commissionPotential || 0), 0);
		const probability = Math.min(days / 90, 1); // Simple probability calculation

		return {
			probability,
			commissionPotential: totalPotential * probability,
		};
	}

	private calculateModelBreakdown(aircraft: LeadScoreResultWithAircraft[]): ModelBreakdown[] {
		const modelMap = new Map<string, { count: number; totalCommission: number }>();

		aircraft.forEach(ac => {
			const model = ac.aircraft.model || 'Unknown';
			const existing = modelMap.get(model) || { count: 0, totalCommission: 0 };
			existing.count++;
			existing.totalCommission += ac.commissionPotential || 0;
			modelMap.set(model, existing);
		});

		return Array.from(modelMap.entries()).map(([model, data]) => ({
			model,
			count: data.count,
			avgCommission: data.count > 0 ? data.totalCommission / data.count : 0,
			totalPotential: data.totalCommission,
		}));
	}

	private calculateGeographicBreakdown(
		aircraft: LeadScoreResultWithAircraft[]
	): GeographicBreakdown[] {
		const locationMap = new Map<string, { count: number; totalPotential: number }>();

		aircraft.forEach(ac => {
			const location = ac.aircraft.location || 'Unknown';
			const existing = locationMap.get(location) || { count: 0, totalPotential: 0 };
			existing.count++;
			existing.totalPotential += ac.commissionPotential || 0;
			locationMap.set(location, existing);
		});

		return Array.from(locationMap.entries()).map(([location, data]) => ({
			location,
			count: data.count,
			totalPotential: data.totalPotential,
		}));
	}

	private async calculateCJ4OwnerNetwork(): Promise<CJ4OwnerNetworkData> {
		try {
			// Query companies that own CJ4 aircraft
			const cj4Companies = await prisma.company.findMany({
				where: {
					aircraftRelations: {
						some: {
							aircraft: {
								model: {
									contains: 'CJ4',
								},
							},
						},
					},
				},
				include: { aircraftRelations: true },
			});

			// Query companies that own CJ3 aircraft (potential upgrade candidates)
			const cj3Companies = await prisma.company.findMany({
				where: {
					aircraftRelations: {
						some: {
							aircraft: {
								model: {
									contains: 'CJ3',
								},
							},
						},
					},
				},
				include: { aircraftRelations: true },
			});

			// Count fleet owners (companies with multiple aircraft)
			const fleetOwners = await prisma.company.findMany({
				where: {
					aircraftRelations: {
						some: {},
					},
				},
				include: { aircraftRelations: true },
			});

			const fleetOwnerCount = fleetOwners.filter(
				company => company.aircraftRelations && company.aircraftRelations.length > 1
			).length;

			return {
				totalOwners: cj4Companies.length + cj3Companies.length,
				cj4Owners: cj4Companies.length,
				cj3Owners: cj3Companies.length,
				fleetOwners: fleetOwnerCount,
				upgradeCandidates: cj3Companies.length,
			};
		} catch (error) {
			logger.warn('Failed to calculate CJ4 owner network, using fallback data', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			return {
				totalOwners: 0,
				cj4Owners: 0,
				cj3Owners: 0,
				fleetOwners: 0,
				upgradeCandidates: 0,
			};
		}
	}

	private calculateMarketTrend(aircraft: Aircraft[]): 'RISING' | 'FALLING' | 'STABLE' {
		if (aircraft.length < 2) return 'STABLE';

		// Sort aircraft by creation date
		const sortedAircraft = aircraft.sort(
			(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
		);

		// Calculate average price for first half vs second half
		const midPoint = Math.floor(sortedAircraft.length / 2);
		const firstHalf = sortedAircraft.slice(0, midPoint);
		const secondHalf = sortedAircraft.slice(midPoint);

		const firstHalfAvg =
			firstHalf.reduce((sum, ac) => sum + Number(ac.price || 0), 0) / firstHalf.length;
		const secondHalfAvg =
			secondHalf.reduce((sum, ac) => sum + Number(ac.price || 0), 0) / secondHalf.length;

		const priceChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

		if (priceChange > 5) return 'RISING';
		if (priceChange < -5) return 'FALLING';
		return 'STABLE';
	}

	private calculateAverageDaysOnMarket(aircraft: Aircraft[]): number {
		if (aircraft.length === 0) return 0;

		const now = new Date();
		const totalDays = aircraft.reduce((sum, ac) => {
			const createdAt = new Date(ac.createdAt);
			const daysOnMarket = Math.floor(
				(now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
			);
			return sum + daysOnMarket;
		}, 0);

		return Math.floor(totalDays / aircraft.length);
	}

	private calculateAbsorptionRate(aircraft: Aircraft[]): number {
		if (aircraft.length === 0) return 0;

		// Calculate absorption rate based on aircraft status
		const soldAircraft = aircraft.filter(ac => ac.status === 'SOLD').length;
		const totalAircraft = aircraft.length;

		return totalAircraft > 0 ? soldAircraft / totalAircraft : 0;
	}

	private generateCJ4MarketInsights(analysis: CJ4MarketAnalysis): CJ4MarketInsightsData {
		const insights = {
			pricingRecommendations: [] as string[],
			marketOpportunities: [] as string[],
			riskFactors: [] as string[],
		};

		// Generate insights based on actual analysis data
		if (analysis.avgPrice) {
			insights.pricingRecommendations.push(
				`Current CJ4 average price: $${analysis.avgPrice.toLocaleString()}`
			);
		}

		if (analysis.totalCJ4Listings > 0) {
			insights.marketOpportunities.push(
				`${analysis.totalCJ4Listings} CJ4 aircraft currently available`
			);
		}

		if (analysis.absorptionRate > 0.8) {
			insights.marketOpportunities.push('Strong market absorption rate indicates healthy demand');
		} else if (analysis.absorptionRate < 0.5) {
			insights.riskFactors.push('Low absorption rate may indicate market challenges');
		}

		if (analysis.marketTrend === 'RISING') {
			insights.pricingRecommendations.push('Market trend is rising - consider premium pricing');
		} else if (analysis.marketTrend === 'FALLING') {
			insights.riskFactors.push('Market trend is falling - monitor pricing carefully');
		}

		return insights;
	}

	private async getClientPreferences(clientId: string): Promise<ClientPreferences> {
		try {
			// Try to get client preferences from database
			const contact = await prisma.contact.findFirst({
				where: { id: clientId },
				include: { company: true },
			});

			if (contact) {
				return {
					preferredModels: ['CJ4', 'CJ3+'], // Default preferences
					budgetRange: { min: 5000000, max: 15000000 },
					preferredLocations: ['New York', 'Los Angeles', 'Miami'],
					useCase: 'Business Travel',
					contactInfo: {
						name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
						email: contact.email || null,
						phone: contact.phone || null,
						company: contact.company?.companyName || null,
					},
				};
			}

			// Fallback to default preferences
			return {
				preferredModels: ['CJ4', 'CJ3+'],
				budgetRange: { min: 5000000, max: 15000000 },
				preferredLocations: ['New York', 'Los Angeles', 'Miami'],
				useCase: 'Business Travel',
			};
		} catch (error) {
			logger.warn('Failed to get client preferences, using defaults', {
				clientId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			return {
				preferredModels: ['CJ4', 'CJ3+'],
				budgetRange: { min: 5000000, max: 15000000 },
				preferredLocations: ['New York', 'Los Angeles', 'Miami'],
				useCase: 'Business Travel',
			};
		}
	}

	private async getAircraftRecommendations(
		preferences: ClientPreferences
	): Promise<LeadScoreResultWithAircraft[]> {
		try {
			// Query aircraft based on client preferences
			const aircraft = await prisma.aircraft.findMany({
				where: {
					status: 'AVAILABLE',
					model: {
						in: preferences.preferredModels,
					},
					price: {
						gte: preferences.budgetRange.min,
						lte: preferences.budgetRange.max,
					},
					...(preferences.preferredLocations.length > 0 && {
						location: {
							in: preferences.preferredLocations,
						},
					}),
				},
				orderBy: { price: 'asc' },
				take: 10, // Limit to top 10 recommendations
			});

			// Score the recommendations
			const scoredAircraft = await smartLeadScoringSystem.batchScoreAircraft(aircraft, [], []);

			// Combine LeadScoreResult with Aircraft data
			const recommendations: LeadScoreResultWithAircraft[] = scoredAircraft.map(score => ({
				...score,
				aircraft: aircraft.find(ac => ac.id === score.aircraftId.toString())!,
			}));

			return recommendations;
		} catch (error) {
			logger.error(
				'Failed to get market intelligence',
				error instanceof Error ? error : undefined,
				{
					stack: error instanceof Error ? error.stack : undefined,
				}
			);
			throw error;
		}
	}

	private async generateMarketComparisons(
		recommendations: LeadScoreResultWithAircraft[]
	): Promise<MarketComparisonsData> {
		if (recommendations.length === 0) {
			return {
				avgPrice: 0,
				priceRange: { min: 0, max: 0 },
				marketPosition: 'No data available',
				totalRecommendations: 0,
			};
		}

		const prices = recommendations
			.map(ac => Number(ac.aircraft.price || 0))
			.filter(price => price > 0);
		const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
		const priceRange = {
			min: Math.min(...prices),
			max: Math.max(...prices),
		};

		return {
			avgPrice,
			priceRange,
			marketPosition:
				avgPrice > 8000000 ? 'Premium' : avgPrice > 6000000 ? 'Mid-market' : 'Entry-level',
			totalRecommendations: recommendations.length,
		};
	}

	private async generateInvestmentAnalysis(
		recommendations: LeadScoreResultWithAircraft[]
	): Promise<InvestmentAnalysisData> {
		if (recommendations.length === 0) {
			return {
				totalInvestment: 0,
				avgCommission: 0,
				roi: 0,
				recommendationCount: 0,
			};
		}

		const totalInvestment = recommendations.reduce(
			(sum, ac) => sum + Number(ac.aircraft.price || 0),
			0
		);
		const avgCommission =
			recommendations.reduce((sum, ac) => sum + (ac.commissionPotential || 0), 0) /
			recommendations.length;
		const roi = totalInvestment > 0 ? (avgCommission / totalInvestment) * 100 : 0;

		return {
			totalInvestment,
			avgCommission,
			roi,
			recommendationCount: recommendations.length,
		};
	}

	private async saveReport(reportData: {
		name: string;
		type: 'MARKET_ANALYSIS' | 'COMMISSION_FORECAST' | 'CJ4_SPECIALTY' | 'CUSTOM_CLIENT';
		params: ReportParams;
		data: MarketAnalysisData | CommissionForecastData | CJ4SpecialtyData | Record<string, unknown>;
		charts?: Array<{ type: string; data: unknown }>;
		summary: {
			totalAircraft: number;
			cj4Aircraft: number;
			totalCommissionPotential: number;
			avgPrice: number;
			marketTrend: string;
		};
		userId?: string;
		contactId?: string;
		attachments?: string[];
	}): Promise<Report> {
		const report: Report = {
			id: `report-${Date.now()}`,
			name: reportData.name,
			type: reportData.type,
			generatedAt: new Date(),
			params: reportData.params,
			data: reportData.data,
			charts: reportData.charts,
			summary: reportData.summary,
		};

		// This would save to database
		console.log(`💾 Saved report: ${report.name}`);

		// Send report to GHL webhook for email/SMS workflow processing
		try {
			const reportContent = this.generateReportContent(report);
			const reportSummary = this.generateReportSummary(report);

			const webhookPayload = ghlWebhookService.createReportPayload(
				report.id,
				this.mapReportTypeToWebhookType(report.type),
				report.name,
				reportSummary,
				reportContent,
				reportData.userId,
				reportData.contactId,
				reportData.attachments
			);

			const webhookResult = await ghlWebhookService.sendReportGenerated(webhookPayload);

			if (webhookResult.success) {
				logger.info('Report sent to GHL webhook successfully', {
					reportId: report.id,
					reportName: report.name,
					webhookId: webhookResult.webhookId,
				});
			} else {
				logger.warn('Failed to send report to GHL webhook', {
					reportId: report.id,
					reportName: report.name,
					error: webhookResult.message,
					errors: webhookResult.errors,
				});
			}
		} catch (error) {
			logger.error(
				'Error sending report to GHL webhook',
				error instanceof Error ? error : undefined,
				{
					reportId: report.id,
					reportName: report.name,
				}
			);
		}

		return report;
	}

	private generatePDFContent(report: Report): string {
		// This would generate actual PDF content
		return `PDF Content for ${report.name}`;
	}

	private generateExcelContent(report: Report): string {
		// This would generate actual Excel content
		return `Excel Content for ${report.name}`;
	}

	private generateEmailContent(report: Report): string {
		// This would generate email content
		return `Email content for ${report.name}`;
	}

	private async sendEmail(recipient: string, reportName: string): Promise<void> {
		// This would send actual email
		console.log(`📧 Sent email to ${recipient}: ${reportName}`);
	}

	private scheduleReport(name: string, type: string, cronExpression: string): void {
		// This would schedule reports using a cron library
		console.log(`📅 Scheduled ${name} report: ${cronExpression}`);
	}

	/**
	 * Generate report content for webhook
	 */
	private generateReportContent(report: Report): string {
		const content = {
			reportId: report.id,
			reportName: report.name,
			reportType: report.type,
			generatedAt: report.generatedAt.toISOString(),
			summary: report.summary,
			data: report.data,
			params: report.params,
		};

		return JSON.stringify(content, null, 2);
	}

	/**
	 * Generate report summary for webhook
	 */
	private generateReportSummary(report: Report): string {
		const summary = report.summary;
		return `${report.name} - Total Aircraft: ${summary.totalAircraft}, CJ4 Aircraft: ${summary.cj4Aircraft}, Commission Potential: $${summary.totalCommissionPotential?.toLocaleString() || '0'}, Avg Price: $${summary.avgPrice?.toLocaleString() || '0'}, Market Trend: ${summary.marketTrend}`;
	}

	/**
	 * Map internal report type to webhook report type
	 */
	private mapReportTypeToWebhookType(
		reportType: string
	): 'market_intelligence' | 'aircraft_analysis' | 'trend_report' | 'custom' {
		switch (reportType) {
			case 'MARKET_ANALYSIS':
				return 'market_intelligence';
			case 'COMMISSION_FORECAST':
				return 'trend_report';
			case 'CJ4_SPECIALTY':
				return 'aircraft_analysis';
			case 'CUSTOM_CLIENT':
				return 'custom';
			default:
				return 'custom';
		}
	}
}

// Export singleton instance
export const reportGenerator = new ReportGenerator();
