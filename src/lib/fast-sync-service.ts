// Fast, Scalable JetNet Sync Service
// Optimized for speed and scale with proper async handling

import { prisma } from '@/lib/database';
import { jetNetClient } from '@/lib/jetnet-client';

export interface FastSyncStats {
	totalProcessed: number;
	totalInserted: number;
	totalUpdated: number;
	totalErrors: number;
	startTime: Date;
	endTime?: Date;
	duration?: number;
	batchCount: number;
	aircraftPerBatch: number;
}

export interface FastSyncOptions {
	batchSize?: number;
	maxBatches?: number;
	forceUpdate?: boolean;
	includeImages?: boolean;
	includeMarketData?: boolean;
	timeoutMs?: number;
}

class FastSyncService {
	private isRunning = false;
	private currentStats: FastSyncStats | null = null;
	private abortController: AbortController | null = null;

	// Fast sync with timeout and abort capability
	async startFastSync(options: FastSyncOptions = {}): Promise<FastSyncStats> {
		if (this.isRunning) {
			console.log('⚠️ Fast sync already running, rejecting new request');
			throw new Error('Fast sync is already running');
		}

		console.log('🚀 Starting FAST sync with options:', JSON.stringify(options, null, 2));

		this.isRunning = true;
		this.abortController = new AbortController();

		this.currentStats = {
			totalProcessed: 0,
			totalInserted: 0,
			totalUpdated: 0,
			totalErrors: 0,
			startTime: new Date(),
			batchCount: 0,
			aircraftPerBatch: options.batchSize || 20,
		};

		// Set timeout
		const timeoutMs = options.timeoutMs || 30000; // 30 seconds max
		const timeoutId = setTimeout(() => {
			console.log('⏰ Fast sync timeout reached, aborting...');
			this.abortController?.abort();
		}, timeoutMs);

		try {
			console.log('📊 Initial fast sync stats:', JSON.stringify(this.currentStats, null, 2));

			// Fast aircraft sync with limited batches
			await this.fastSyncAircraft(options);

			clearTimeout(timeoutId);

			this.currentStats.endTime = new Date();
			this.currentStats.duration =
				this.currentStats.endTime.getTime() - this.currentStats.startTime.getTime();

			console.log('✅ Fast sync completed successfully');
			console.log('📊 Final fast sync stats:', JSON.stringify(this.currentStats, null, 2));

			return this.currentStats;
		} catch (error) {
			clearTimeout(timeoutId);
			console.error('❌ Fast sync failed:', error);
			throw error;
		} finally {
			this.isRunning = false;
			this.abortController = null;
		}
	}

	// Fast aircraft sync - limited batches for speed
	private async fastSyncAircraft(options: FastSyncOptions): Promise<void> {
		console.log('🛩️ Starting FAST aircraft sync...');

		const batchSize = options.batchSize || 20;
		const maxBatches = options.maxBatches || 3; // Only sync 3 batches for speed
		let page = 1;
		let hasMore = true;

		console.log(`📊 Fast sync config: batchSize=${batchSize}, maxBatches=${maxBatches}`);

		while (hasMore && page <= maxBatches && !this.abortController?.signal.aborted) {
			try {
				console.log(`📄 Processing FAST aircraft batch ${page}/${maxBatches}...`);

				// Use Promise.race to timeout individual API calls
				const searchPromise = jetNetClient.searchAircraft({
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
					includeImages: false, // Skip images for speed
					includeMarketData: options.includeMarketData || false,
				});

				const timeoutPromise = new Promise((_, reject) =>
					setTimeout(() => reject(new Error('API call timeout')), 10000)
				);

				const searchResponse = (await Promise.race([searchPromise, timeoutPromise])) as any;

				if (!searchResponse.success || !searchResponse.data) {
					console.warn(`⚠️ Failed to fetch aircraft batch ${page}:`, searchResponse.error);
					break;
				}

				const aircraft = searchResponse.data;
				console.log(`📊 Processing ${aircraft.length} aircraft from batch ${page}...`);

				// Process aircraft in parallel for speed
				const processPromises = aircraft.map(async (plane: any, index: number) => {
					try {
						console.log(
							`✈️ Processing aircraft ${index + 1}/${aircraft.length}: ${plane.tailNumber || plane.id}`
						);
						await this.fastSyncAircraft(plane, options);
						this.currentStats!.totalProcessed++;
						return { success: true, id: plane.id };
					} catch (error) {
						console.error(`❌ Error syncing aircraft ${plane.id}:`, error);
						this.currentStats!.totalErrors++;
						return { success: false, id: plane.id, error };
					}
				});

				// Wait for all aircraft in this batch to process
				const results = await Promise.allSettled(processPromises);
				const successCount = results.filter(
					r => r.status === 'fulfilled' && r.value.success
				).length;

				console.log(
					`✅ Batch ${page} completed: ${successCount}/${aircraft.length} aircraft processed successfully`
				);

				this.currentStats!.batchCount++;
				hasMore = aircraft.length === batchSize;
				page++;
			} catch (error) {
				console.error(`❌ Error processing batch ${page}:`, error);
				this.currentStats!.totalErrors++;
				break;
			}
		}

		console.log('✅ Fast aircraft sync completed');
	}

	// Fast individual aircraft sync
	private async fastSyncAircraft(aircraft: any, options: FastSyncOptions): Promise<void> {
		try {
			// Check if aircraft already exists
			const existing = await prisma.aircraft.findUnique({
				where: { id: aircraft.id },
			});

			if (existing && !options.forceUpdate) {
				console.log(`⏭️ Aircraft ${aircraft.id} already exists, skipping`);
				return;
			}

			const aircraftData = {
				id: aircraft.id,
				name: aircraft.name || `${aircraft.make} ${aircraft.model}`,
				manufacturer: aircraft.make || 'Unknown',
				model: aircraft.model || 'Unknown',
				variant: aircraft.variant || '',
				year: aircraft.year || new Date().getFullYear(),
				price: aircraft.status?.askingPrice || 0,
				currency: aircraft.status?.currency || 'USD',
				location: aircraft.location?.city || 'Unknown',
				status: aircraft.status?.marketStatus || 'AVAILABLE', // Use valid enum value
				description: aircraft.description || '',
				specifications: aircraft.specifications || {},
				features: aircraft.features || [],
				contactInfo: aircraft.contactInfo || {},
				marketData: aircraft.marketData || {},
				maintenanceData: aircraft.maintenanceData || {},
				ownershipData: aircraft.ownershipData || {},
				updatedAt: new Date(),
				createdAt: existing?.createdAt || new Date(),
			};

			if (existing) {
				await prisma.aircraft.update({
					where: { id: aircraft.id },
					data: aircraftData,
				});
				this.currentStats!.totalUpdated++;
				console.log(`🔄 Updated aircraft ${aircraft.id}`);
			} else {
				await prisma.aircraft.create({
					data: aircraftData,
				});
				this.currentStats!.totalInserted++;
				console.log(`➕ Created aircraft ${aircraft.id}`);
			}
		} catch (error) {
			console.error(`❌ Error syncing aircraft ${aircraft.id}:`, error);
			throw error;
		}
	}

	// Get current sync status
	getSyncStatus(): { isRunning: boolean; stats: FastSyncStats | null } {
		return {
			isRunning: this.isRunning,
			stats: this.currentStats,
		};
	}

	// Cancel running sync
	async cancelSync(): Promise<void> {
		if (this.isRunning) {
			console.log('🛑 Cancelling fast sync...');
			this.abortController?.abort();
			this.isRunning = false;
			console.log('✅ Fast sync cancelled');
		}
	}

	// Get sync history
	async getSyncHistory(limit = 10): Promise<any[]> {
		try {
			const logs = await prisma.apiSyncLog.findMany({
				orderBy: { createdAt: 'desc' },
				take: limit,
			});
			return logs;
		} catch (error) {
			console.error('Error fetching sync history:', error);
			return [];
		}
	}
}

export const fastSyncService = new FastSyncService();
