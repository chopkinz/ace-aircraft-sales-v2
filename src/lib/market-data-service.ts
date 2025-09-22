import { PrismaClient } from '@prisma/client';
import { jetNetClient } from './jetnet-client';
import { logger } from './logger';

const prisma = new PrismaClient();

export interface MarketDataSummary {
	totalAircraft: number;
	marketValue: string;
	activeListings: number;
	transactionsThisMonth: number;
	avgDaysOnMarket: number;
	topMake: string;
	avgPrice: number;
	priceRange: {
		min: number;
		max: number;
	};
	categories: string[];
	makes: string[];
	trends: {
		rising: number;
		falling: number;
		stable: number;
	};
}

export interface MarketDataFilters {
	category?: string;
	period?: string;
	make?: string;
	model?: string;
	yearMin?: number;
	yearMax?: number;
	priceMin?: number;
	priceMax?: number;
	location?: string;
	status?: string;
}

export class MarketDataService {
	private readonly cache = new Map<string, { data: MarketDataSummary; expires: number }>();
	private readonly cacheTtl = 5 * 60 * 1000; // 5 minutes

	/**
	 * Get market data with caching and database storage
	 */
	async getMarketData(filters: MarketDataFilters = {}): Promise<{
		success: boolean;
		data: MarketDataSummary;
		metadata: Record<string, unknown>;
	}> {
		const cacheKey = this.generateCacheKey(filters);

		try {
			// Check cache first
			const cached = this.getFromCache(cacheKey);
			if (cached) {
				logger.info('Market data served from cache', { filters, cacheKey });
				return {
					success: true,
					data: cached,
					metadata: {
						timestamp: new Date().toISOString(),
						source: 'Cache',
						cached: true,
						filters,
					},
				};
			}

			// Get data from JetNet API
			logger.info('Fetching market data from JetNet API', { filters });
			const jetnetData = await this.fetchFromJetNet(filters);

			// Store in database
			await this.storeMarketData(jetnetData, filters);

			// Cache the result
			this.setCache(cacheKey, jetnetData);

			logger.info('Market data fetched and stored successfully', {
				filters,
				aircraftCount: jetnetData.totalAircraft,
			});

			return {
				success: true,
				data: jetnetData,
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'JetNet API',
					cached: false,
					filters,
					aircraftCount: jetnetData.totalAircraft,
				},
			};
		} catch (error) {
			logger.error('Failed to fetch market data', error instanceof Error ? error : undefined, {
				stack: error instanceof Error ? error.stack : undefined,
			});

			// Try to get from database as fallback
			try {
				const dbData = await this.getFromDatabase(filters);
				if (dbData) {
					logger.info('Served market data from database fallback', { filters });
					return {
						success: true,
						data: dbData,
						metadata: {
							timestamp: new Date().toISOString(),
							source: 'Database Fallback',
							cached: false,
							filters,
							note: 'JetNet API unavailable, using cached database data',
						},
					};
				}
			} catch (dbError) {
				logger.error(
					'Database fallback also failed',
					dbError instanceof Error ? dbError : undefined,
					{
						stack: dbError instanceof Error ? dbError.stack : undefined,
					}
				);
			}

			// Return error response
			return {
				success: false,
				data: this.getDefaultMarketData(),
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'Default Data',
					cached: false,
					filters,
					error: error instanceof Error ? error.message : 'Unknown error',
					stack: error instanceof Error ? error.stack : undefined,
				},
			};
		}
	}

	/**
	 * Fetch market data from JetNet API
	 */
	private async fetchFromJetNet(filters: MarketDataFilters): Promise<MarketDataSummary> {
		try {
			// Get market trends from JetNet
			const marketTrends = await jetNetClient.getMarketTrends(
				filters.category || 'all',
				filters.period || '30d'
			);

			// Get market stats
			const marketStats = await jetNetClient.getMarketStats();

			// Get aircraft data for analysis
			const aircraftSearch = await jetNetClient.searchAircraft({
				query: '',
				filters: {
					marketStatus: 'For Sale',
					make: filters.make,
					model: filters.model,
					yearMin: filters.yearMin,
					yearMax: filters.yearMax,
					priceMin: filters.priceMin,
					priceMax: filters.priceMax,
					location: filters.location,
				},
				sort: {
					field: 'listdate',
					direction: 'desc',
				},
				page: 1,
				limit: 1000, // Get more data for better analysis
			});

			// Calculate summary statistics
			const summary = this.calculateMarketSummary(marketTrends, marketStats, aircraftSearch);

			return summary;
		} catch (error) {
			logger.error('JetNet API fetch failed', error instanceof Error ? error : undefined, {
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	}

	/**
	 * Calculate market summary from JetNet data
	 */
	private calculateMarketSummary(
		marketTrends: unknown[],
		marketStats: unknown,
		aircraftSearch: unknown
	): MarketDataSummary {
		const aircraft = (aircraftSearch as { data?: unknown[] })?.data || [];

		// Calculate basic stats
		const totalAircraft = aircraft.length;
		const activeListings = aircraft.filter(
			(a: unknown) => (a as { status?: string }).status === 'For Sale'
		).length;

		// Calculate price statistics
		const prices = aircraft
			.filter((a: unknown) => {
				const aircraft = a as { price?: number };
				return aircraft.price && aircraft.price > 0;
			})
			.map((a: unknown) => parseFloat(String((a as { price: number }).price)));

		const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
		const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
		const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

		// Calculate market value
		const marketValue = avgPrice * totalAircraft;
		const marketValueFormatted = this.formatCurrency(marketValue);

		// Calculate average days on market
		const avgDaysOnMarket =
			aircraft
				.filter((a: unknown) => (a as { daysOnMarket?: number }).daysOnMarket)
				.reduce(
					(sum: number, a: unknown) => sum + ((a as { daysOnMarket?: number }).daysOnMarket || 0),
					0
				) / totalAircraft || 0;

		// Get top make
		const makeCounts = aircraft.reduce((acc: Record<string, number>, a: unknown) => {
			const aircraft = a as { make?: string };
			const make = aircraft.make || 'Unknown';
			acc[make] = (acc[make] || 0) + 1;
			return acc;
		}, {});
		const topMake = Object.keys(makeCounts).reduce(
			(a, b) => (makeCounts[a] > makeCounts[b] ? a : b),
			'Unknown'
		);

		// Get categories and makes
		const categories = [
			...new Set(
				aircraft.map((a: unknown) => (a as { category?: string }).category).filter(Boolean)
			),
		] as string[];
		const makes = [
			...new Set(aircraft.map((a: unknown) => (a as { make?: string }).make).filter(Boolean)),
		] as string[];

		// Calculate trends
		const trends = {
			rising: marketTrends.filter(
				(t: unknown) => (t as { priceTrend?: string }).priceTrend === 'RISING'
			).length,
			falling: marketTrends.filter(
				(t: unknown) => (t as { priceTrend?: string }).priceTrend === 'FALLING'
			).length,
			stable: marketTrends.filter(
				(t: unknown) => (t as { priceTrend?: string }).priceTrend === 'STABLE'
			).length,
		};

		// Estimate transactions this month (this would need historical data)
		const transactionsThisMonth = Math.floor(totalAircraft * 0.1); // Rough estimate

		return {
			totalAircraft,
			marketValue: marketValueFormatted,
			activeListings,
			transactionsThisMonth,
			avgDaysOnMarket: Math.round(avgDaysOnMarket),
			topMake,
			avgPrice,
			priceRange: {
				min: minPrice,
				max: maxPrice,
			},
			categories,
			makes,
			trends,
		};
	}

	/**
	 * Store market data in database
	 */
	private async storeMarketData(
		data: MarketDataSummary,
		filters: MarketDataFilters
	): Promise<void> {
		try {
			// Store market stats
			await prisma.marketStats.upsert({
				where: { id: 'current' },
				update: {
					totalAircraft: data.totalAircraft,
					activeListings: data.activeListings,
					avgPrice: data.avgPrice,
					lastUpdated: new Date(),
				},
				create: {
					id: 'current',
					totalAircraft: data.totalAircraft,
					activeListings: data.activeListings,
					avgPrice: data.avgPrice,
					lastUpdated: new Date(),
				},
			});

			// Store market trends
			const period = filters.period || '30d';
			const category = filters.category || 'all';

			await prisma.marketTrend.upsert({
				where: {
					period_category: {
						period,
						category,
					},
				},
				update: {
					aircraftCount: data.totalAircraft,
					avgPrice: data.avgPrice,
					transactions: data.transactionsThisMonth,
					marketValue: this.parseCurrency(data.marketValue),
					lastUpdated: new Date(),
				},
				create: {
					period,
					category,
					aircraftCount: data.totalAircraft,
					avgPrice: data.avgPrice,
					transactions: data.transactionsThisMonth,
					marketValue: this.parseCurrency(data.marketValue),
					lastUpdated: new Date(),
				},
			});

			logger.info('Market data stored in database', {
				totalAircraft: data.totalAircraft,
				period,
				category,
			});
		} catch (error) {
			logger.error(
				'Failed to store market data in database',
				error instanceof Error ? error : undefined,
				{
					stack: error instanceof Error ? error.stack : undefined,
				}
			);
			throw error;
		}
	}

	/**
	 * Get market data from database as fallback
	 */
	private async getFromDatabase(filters: MarketDataFilters): Promise<MarketDataSummary | null> {
		try {
			const period = filters.period || '30d';
			const category = filters.category || 'all';

			// Get latest market stats
			const stats = await prisma.marketStats.findFirst({
				orderBy: { lastUpdated: 'desc' },
			});

			// Get latest market trend
			const trend = await prisma.marketTrend.findUnique({
				where: {
					period_category: {
						period,
						category,
					},
				},
			});

			if (!stats) return null;

			return {
				totalAircraft: stats.totalAircraft,
				marketValue: this.formatCurrency(Number(stats.avgPrice) * stats.totalAircraft),
				activeListings: stats.activeListings,
				transactionsThisMonth: trend?.transactions || 0,
				avgDaysOnMarket: 120, // Default value
				topMake: 'Cessna', // Default value
				avgPrice: Number(stats.avgPrice),
				priceRange: {
					min: Number(stats.avgPrice) * 0.5,
					max: Number(stats.avgPrice) * 2,
				},
				categories: [category],
				makes: ['Cessna', 'Bombardier', 'Gulfstream'],
				trends: {
					rising: 0,
					falling: 0,
					stable: 1,
				},
			};
		} catch (error) {
			logger.error(
				'Failed to get market data from database',
				error instanceof Error ? error : new Error('Unknown error')
			);
			return null;
		}
	}

	/**
	 * Get default market data when all else fails
	 */
	private getDefaultMarketData(): MarketDataSummary {
		return {
			totalAircraft: 0,
			marketValue: '$0',
			activeListings: 0,
			transactionsThisMonth: 0,
			avgDaysOnMarket: 0,
			topMake: 'Unknown',
			avgPrice: 0,
			priceRange: {
				min: 0,
				max: 0,
			},
			categories: [],
			makes: [],
			trends: {
				rising: 0,
				falling: 0,
				stable: 0,
			},
		};
	}

	/**
	 * Cache management
	 */
	private getFromCache(key: string): MarketDataSummary | null {
		const item = this.cache.get(key);
		if (!item) return null;

		if (Date.now() > item.expires) {
			this.cache.delete(key);
			return null;
		}

		return item.data;
	}

	private setCache(key: string, data: MarketDataSummary): void {
		this.cache.set(key, {
			data,
			expires: Date.now() + this.cacheTtl,
		});
	}

	private generateCacheKey(filters: MarketDataFilters): string {
		return `market_data_${JSON.stringify(filters)}`;
	}

	/**
	 * Utility functions
	 */
	private formatCurrency(amount: number): string {
		if (amount >= 1000000000) {
			return `$${(amount / 1000000000).toFixed(1)}B`;
		} else if (amount >= 1000000) {
			return `$${(amount / 1000000).toFixed(1)}M`;
		} else if (amount >= 1000) {
			return `$${(amount / 1000).toFixed(1)}K`;
		}
		return `$${amount.toFixed(0)}`;
	}

	private parseCurrency(value: string): number {
		const cleaned = value.replace(/[$,]/g, '');
		const num = parseFloat(cleaned);

		if (cleaned.includes('B')) {
			return num * 1000000000;
		} else if (cleaned.includes('M')) {
			return num * 1000000;
		} else if (cleaned.includes('K')) {
			return num * 1000;
		}

		return num;
	}

	/**
	 * Get market trends for specific categories
	 */
	async getMarketTrends(
		categories: string[],
		period: string = '30d'
	): Promise<{
		success: boolean;
		data: Record<string, unknown>;
		errors?: Record<string, string>;
		metadata: Record<string, unknown>;
	}> {
		try {
			const results = await Promise.allSettled(
				categories.map(async category => {
					const trends = await jetNetClient.getMarketTrends(category, period);
					return { category, trends };
				})
			);

			const marketData: Record<string, unknown> = {};
			const errors: Record<string, string> = {};

			results.forEach((result, index) => {
				if (result.status === 'fulfilled') {
					const { category, trends } = result.value;
					marketData[category] = trends;
				} else {
					errors[categories[index]] =
						result.reason instanceof Error ? result.reason.message : 'Request failed';
				}
			});

			return {
				success: Object.keys(marketData).length > 0,
				data: marketData,
				errors: Object.keys(errors).length > 0 ? errors : undefined,
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'JetNet API',
					period,
					requestedCategories: categories.length,
					successfulCategories: Object.keys(marketData).length,
					failedCategories: Object.keys(errors).length,
				},
			};
		} catch (error) {
			logger.error('Failed to get market trends', error instanceof Error ? error : undefined, {
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	}

	/**
	 * Get market intelligence for specific make/model
	 */
	async getMarketIntelligence(
		make: string,
		model: string
	): Promise<{
		success: boolean;
		data: Record<string, unknown>;
		metadata: Record<string, unknown>;
	}> {
		try {
			const intelligence = await jetNetClient.getMarketIntelligence(make, model);

			if (intelligence) {
				// Store in database for future reference
				await prisma.marketData.create({
					data: {
						make,
						model,
						category: 'intelligence',
						avgPrice: (intelligence as { avgPrice?: number }).avgPrice || 0,
						minPrice: (intelligence as { minPrice?: number }).minPrice || 0,
						maxPrice: (intelligence as { maxPrice?: number }).maxPrice || 0,
						totalListings: (intelligence as { totalListings?: number }).totalListings || 0,
						avgDaysOnMarket: (intelligence as { avgDaysOnMarket?: number }).avgDaysOnMarket || 0,
						priceTrend:
							((intelligence as { priceTrend?: string }).priceTrend as
								| 'RISING'
								| 'FALLING'
								| 'STABLE'
								| 'VOLATILE') || 'STABLE',
						marketTrend:
							((intelligence as { marketTrend?: string }).marketTrend as
								| 'HOT'
								| 'WARM'
								| 'COOL'
								| 'COLD') || 'COOL',
						dataDate: new Date(),
						source: 'JetNet',
						rawData: JSON.parse(JSON.stringify(intelligence)),
					},
				});
			}

			return {
				success: true,
				data: intelligence as unknown as Record<string, unknown>,
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'JetNet API',
					make,
					model,
				},
			};
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
}

export const marketDataService = new MarketDataService();
