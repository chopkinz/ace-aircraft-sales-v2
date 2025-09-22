// Data Sync Service for JetNet API Integration
// This service handles syncing JetNet data to the local database

import { prisma } from '@/lib/database';
import { jetNetClient } from '@/lib/jetnet-client';
import { Aircraft } from '@/types';

export interface SyncStats {
	totalProcessed: number;
	totalInserted: number;
	totalUpdated: number;
	totalErrors: number;
	startTime: Date;
	endTime?: Date;
	duration?: number;
}

export interface SyncOptions {
	batchSize?: number;
	forceUpdate?: boolean;
	includeImages?: boolean;
	includeMarketData?: boolean;
	maxRetries?: number;
}

class DataSyncService {
	private isRunning = false;
	private currentStats: SyncStats | null = null;

	// Main sync method
	async syncAllData(options: SyncOptions = {}): Promise<SyncStats> {
		if (this.isRunning) {
			console.log('⚠️ Sync is already running, rejecting new sync request');
			throw new Error('Sync is already running');
		}

		console.log(
			'🚀 Starting comprehensive data sync with options:',
			JSON.stringify(options, null, 2)
		);
		this.isRunning = true;
		this.currentStats = {
			totalProcessed: 0,
			totalInserted: 0,
			totalUpdated: 0,
			totalErrors: 0,
			startTime: new Date(),
		};

		try {
			console.log('📊 Initial sync stats:', JSON.stringify(this.currentStats, null, 2));

			// Sync aircraft data
			console.log('✈️ Starting aircraft data sync...');
			await this.syncAircraftData(options);

			// Sync market data
			console.log('📈 Starting market data sync...');
			await this.syncMarketData(options);

			// Sync company data
			console.log('🏢 Starting company data sync...');
			await this.syncCompanyData(options);

			// Sync transaction data
			console.log('💰 Starting transaction data sync...');
			await this.syncTransactionData(options);

			console.log('✅ All data sync completed successfully');
			console.log('📊 Final sync stats:', JSON.stringify(this.currentStats, null, 2));

			this.currentStats.endTime = new Date();
			this.currentStats.duration =
				this.currentStats.endTime.getTime() - this.currentStats.startTime.getTime();

			console.log('✅ Data sync completed successfully:', this.currentStats);
			return this.currentStats;
		} catch (error) {
			console.error('❌ Data sync failed:', error);
			this.currentStats.endTime = new Date();
			this.currentStats.duration =
				this.currentStats.endTime.getTime() - this.currentStats.startTime.getTime();
			throw error;
		} finally {
			this.isRunning = false;
		}
	}

	// Sync aircraft data from JetNet
	private async syncAircraftData(options: SyncOptions): Promise<void> {
		console.log('🛩️ Starting aircraft data sync...');

		const batchSize = options.batchSize || 50;
		let page = 1;
		let hasMore = true;
		const totalProcessed = 0;

		console.log(
			`📊 Aircraft sync config: batchSize=${batchSize}, forceUpdate=${options.forceUpdate}`
		);

		while (hasMore) {
			try {
				console.log(`📄 Processing aircraft batch ${page} (batch size: ${batchSize})...`);

				const searchResponse = await jetNetClient.searchAircraft({
					query: '',
					filters: {
						marketStatus: 'For Sale',
					},
					sort: {
						field: 'createdAt',
						direction: 'desc',
					},
					page,
					limit: batchSize,
				});

				if (!searchResponse.success || !searchResponse.data) {
					console.warn(`⚠️  Failed to fetch aircraft batch ${page}:`, searchResponse.error);
					break;
				}

				const aircraft = searchResponse.data;
				console.log(`📊 Processing ${aircraft.length} aircraft from batch ${page}...`);

				// Process each aircraft
				for (let i = 0; i < aircraft.length; i++) {
					const plane = aircraft[i];
					try {
						console.log(
							`✈️ Processing aircraft ${i + 1}/${aircraft.length}: ${plane.model || plane.id}`
						);
						await this.syncAircraft(plane, options);
						this.currentStats!.totalProcessed++;
					} catch (error) {
						console.error(`❌ Error syncing aircraft ${plane.id}:`, error);
						this.currentStats!.totalErrors++;
					}
				}

				// Check if there are more pages
				hasMore = aircraft.length === batchSize;
				page++;

				// Add delay between batches to avoid rate limiting
				if (hasMore) {
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			} catch (error) {
				console.error(`❌ Error processing aircraft batch ${page}:`, error);
				this.currentStats!.totalErrors++;
				break;
			}
		}

		console.log('✅ Aircraft data sync completed');
	}

	// Sync individual aircraft
	private async syncAircraft(aircraft: Aircraft, options: SyncOptions): Promise<void> {
		try {
			console.log(`🔍 Checking if aircraft ${aircraft.id} exists in database...`);

			// Check if aircraft already exists
			const existing = await prisma.aircraft.findUnique({
				where: { id: aircraft.id },
			});

			if (existing && !options.forceUpdate) {
				console.log(`⏭️ Aircraft ${aircraft.id} already exists, skipping (forceUpdate=false)`);
				return;
			}

			console.log(
				existing ? `🔄 Updating aircraft ${aircraft.id}` : `➕ Creating new aircraft ${aircraft.id}`
			);

			const aircraftData = {
				id: aircraft.id,
				manufacturer: aircraft.make || 'Unknown',
				model: aircraft.model || 'Unknown',
				variant: aircraft.variant || '',
				year: aircraft.year || new Date().getFullYear(),
				price: aircraft.status?.askingPrice || 0,
				currency: aircraft.status?.currency || 'USD',
				location: this.formatLocation(aircraft.location),
				status: this.mapStatus(aircraft.status?.marketStatus),
				image: aircraft.images?.[0]?.url || '/images/aircraft-placeholder.jpg',
				description: this.buildDescription(aircraft),
				specifications: JSON.stringify(aircraft.specifications || {}),
				// features: JSON.stringify(aircraft.features || []),
				// contactInfo: JSON.stringify(aircraft.ownership || {}),
				marketData: JSON.stringify(aircraft.market || {}),
				maintenanceData: JSON.stringify(aircraft.maintenance || {}),
				ownershipData: JSON.stringify(aircraft.ownership || {}),
				lastUpdated: new Date(aircraft.updatedAt || Date.now()),
				createdAt: new Date(aircraft.createdAt || Date.now()),
				updatedAt: new Date(),
			};

			if (existing) {
				// Update existing aircraft
				if (options.forceUpdate || this.shouldUpdate(existing, aircraftData)) {
					await prisma.aircraft.update({
						where: { id: aircraft.id },
						data: aircraftData,
					});
					this.currentStats!.totalUpdated++;
					console.log(`🔄 Updated aircraft: ${aircraft.id}`);
				}
			} else {
				// Insert new aircraft
				await prisma.aircraft.create({
					data: aircraftData,
				});
				this.currentStats!.totalInserted++;
				console.log(`➕ Inserted aircraft: ${aircraft.id}`);
			}

			// Sync aircraft images if requested
			if (options.includeImages && aircraft.images) {
				await this.syncAircraftImages(aircraft.id, aircraft.images);
			}
		} catch (error) {
			console.error(`❌ Error syncing aircraft ${aircraft.id}:`, error);
			throw error;
		}
	}

	// Sync aircraft images
	private async syncAircraftImages(aircraftId: string, images: any[]): Promise<void> {
		try {
			// Delete existing images
			await prisma.aircraftImage.deleteMany({
				where: { aircraftId },
			});

			// Insert new images
			for (const image of images) {
				await prisma.aircraftImage.create({
					data: {
						id: image.id || `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
						aircraftId,
						url: image.url,
						thumbnailUrl: image.thumbnailUrl || image.url,
						type: image.type || 'Exterior',
						caption: image.caption || '',
						isHero: image.isHero || false,
						order: image.order || 0,
						createdAt: new Date(image.createdAt || Date.now()),
					},
				});
			}
		} catch (error) {
			console.error(`❌ Error syncing images for aircraft ${aircraftId}:`, error);
		}
	}

	// Sync market data
	private async syncMarketData(options: SyncOptions): Promise<void> {
		console.log('📊 Syncing market data...');

		try {
			const marketStats = await jetNetClient.getMarketStats();
			const marketTrends = await jetNetClient.getMarketTrends('all', '30d');

			// Store market stats
			await prisma.marketStats.upsert({
				where: { id: 'current' },
				update: {
					totalAircraft: marketStats.totalAircraft,
					monthlyGrowth: marketStats.monthlyGrowth,
					activeListings: marketStats.activeListings,
					avgPrice: marketStats.avgPrice,
					lastUpdated: new Date(),
				},
				create: {
					id: 'current',
					totalAircraft: marketStats.totalAircraft,
					monthlyGrowth: marketStats.monthlyGrowth,
					activeListings: marketStats.activeListings,
					avgPrice: marketStats.avgPrice,
					lastUpdated: new Date(),
				},
			});

			// Store market trends
			for (const trend of marketTrends) {
				await prisma.marketTrend.upsert({
					where: {
						period_category: {
							period: trend.period,
							category: trend.category || 'all',
						},
					},
					update: {
						aircraftCount: (trend as any).aircraftCount || 0,
						avgPrice: (trend as any).avgPrice || 0,
						transactions: (trend as any).transactions || 0,
						marketValue: (trend as any).marketValue || 0,
						lastUpdated: new Date(),
					},
					create: {
						period: trend.period,
						category: trend.category || 'all',
						aircraftCount: (trend as any).aircraftCount || 0,
						avgPrice: (trend as any).avgPrice || 0,
						transactions: (trend as any).transactions || 0,
						marketValue: (trend as any).marketValue || 0,
						lastUpdated: new Date(),
					},
				});
			}

			console.log('✅ Market data sync completed');
		} catch (error) {
			console.error('❌ Error syncing market data:', error);
			throw error;
		}
	}

	// Sync company data
	private async syncCompanyData(options: SyncOptions): Promise<void> {
		console.log('🏢 Syncing company data...');

		try {
			// This would sync company data from JetNet
			// For now, we'll create a placeholder
			console.log('✅ Company data sync completed (placeholder)');
		} catch (error) {
			console.error('❌ Error syncing company data:', error);
			throw error;
		}
	}

	// Sync transaction data
	private async syncTransactionData(options: SyncOptions): Promise<void> {
		console.log('💰 Syncing transaction data...');

		try {
			// This would sync transaction data from JetNet
			// For now, we'll create a placeholder
			console.log('✅ Transaction data sync completed (placeholder)');
		} catch (error) {
			console.error('❌ Error syncing transaction data:', error);
			throw error;
		}
	}

	// Helper methods
	private formatLocation(location: any): string {
		if (!location) return 'Unknown';

		const parts = [];
		if (location.city) parts.push(location.city);
		if (location.state) parts.push(location.state);
		if (location.country) parts.push(location.country);

		return parts.join(', ') || 'Unknown';
	}

	private mapStatus(status?: string): 'AVAILABLE' | 'UNDER_CONTRACT' | 'SOLD' | 'MAINTENANCE' {
		switch (status?.toLowerCase()) {
			case 'for sale':
			case 'available':
				return 'AVAILABLE';
			case 'pending':
			case 'under contract':
				return 'UNDER_CONTRACT';
			case 'sold':
			case 'sale pending':
				return 'SOLD';
			case 'maintenance':
			case 'in maintenance':
				return 'MAINTENANCE';
			default:
				return 'AVAILABLE';
		}
	}

	private buildDescription(aircraft: Aircraft): string {
		const parts = [];

		if (aircraft.make && aircraft.model) {
			parts.push(`${aircraft.make} ${aircraft.model}`);
		}

		if (aircraft.year) {
			parts.push(`Year: ${aircraft.year}`);
		}

		if (aircraft.specifications?.passengerCapacity) {
			parts.push(`Seats: ${aircraft.specifications.passengerCapacity}`);
		}

		if (aircraft.specifications?.range) {
			parts.push(`Range: ${aircraft.specifications.range} nm`);
		}

		return parts.join(' • ') || 'Aircraft for sale';
	}

	private shouldUpdate(existing: any, newData: any): boolean {
		// Update if price changed significantly
		if (Math.abs(existing.price - newData.price) > 10000) {
			return true;
		}

		// Update if status changed
		if (existing.status !== newData.status) {
			return true;
		}

		// Update if last updated is more than 24 hours ago
		const lastUpdate = new Date(existing.lastUpdated);
		const now = new Date();
		const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

		return hoursDiff > 24;
	}

	// Get current sync status
	getSyncStatus(): { isRunning: boolean; stats: SyncStats | null } {
		return {
			isRunning: this.isRunning,
			stats: this.currentStats,
		};
	}

	// Start full sync (alias for syncAllData)
	async startFullSync(userId: string, options: SyncOptions = {}): Promise<SyncStats> {
		console.log(`🚀 Starting full sync for user ${userId}...`);
		return this.syncAllData(options);
	}

	// Cancel running sync
	async cancelSync(): Promise<void> {
		if (this.isRunning) {
			this.isRunning = false;
			console.log('🛑 Sync cancelled by user');
		}
	}

	// Get sync history
	async getSyncHistory(limit: number = 10): Promise<any[]> {
		try {
			return await prisma.apiSyncLog.findMany({
				orderBy: { startedAt: 'desc' },
				take: limit,
			});
		} catch (error) {
			console.error('Error fetching sync history:', error);
			return [];
		}
	}

	// Log sync operation
	private async logSync(stats: SyncStats): Promise<void> {
		try {
			await prisma.apiSyncLog.create({
				data: {
					syncType: 'full_sync',
					status: stats.totalErrors === 0 ? 'SUCCESS' : 'PARTIAL',
					recordsProcessed: stats.totalProcessed,
					recordsCreated: stats.totalInserted,
					recordsUpdated: stats.totalUpdated,
					errorMessage: stats.totalErrors > 0 ? `${stats.totalErrors} errors occurred` : null,
					syncDurationMs: stats.duration || 0,
					startedAt: stats.startTime,
					completedAt: stats.endTime,
				},
			});
		} catch (error) {
			console.error('Error logging sync:', error);
		}
	}
}

export const dataSyncService = new DataSyncService();
