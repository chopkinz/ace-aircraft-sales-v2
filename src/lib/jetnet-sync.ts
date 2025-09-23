/**
 * JetNet Sync Service
 * Handles synchronization of JetNet data with local database
 */

import { PrismaClient } from '@prisma/client';
import { jetnetAPI, JetNetAircraftData } from './jetnet-api';

const prisma = new PrismaClient();

export interface SyncResult {
	totalProcessed: number;
	created: number;
	updated: number;
	errors: number;
	errorDetails: Array<{
		aircraft: string;
		error: string;
	}>;
	duration: number;
	aircraftCount: number;
}

export interface SyncOptions {
	forceRefresh?: boolean;
	batchSize?: number;
	includeInactive?: boolean;
	filters?: {
		make?: string[];
		yearMin?: number;
		yearMax?: number;
		priceMin?: number;
		priceMax?: number;
		states?: string[];
		countries?: string[];
	};
}

class JetNetSyncService {
	private isRunning = false;
	private lastSyncTime: Date | null = null;

	/**
	 * Check if sync is currently running
	 */
	isSyncRunning(): boolean {
		return this.isRunning;
	}

	/**
	 * Get last sync time
	 */
	getLastSyncTime(): Date | null {
		return this.lastSyncTime;
	}

	/**
	 * Sync aircraft data from JetNet
	 */
	async syncAircraftData(options: SyncOptions = {}): Promise<SyncResult> {
		if (this.isRunning) {
			throw new Error('Sync is already running');
		}

		this.isRunning = true;
		const startTime = Date.now();

		const result: SyncResult = {
			totalProcessed: 0,
			created: 0,
			updated: 0,
			errors: 0,
			errorDetails: [],
			duration: 0,
			aircraftCount: 0,
		};

		try {
			console.log('🚀 Starting JetNet aircraft sync...');

			// Fetch bulk aircraft data from JetNet - ALL aircraft
			const jetnetResponse = await jetnetAPI.getBulkAircraftExport({
				forsale: 'All', // Get all aircraft, not just for sale
				aircraftchanges: 'true',
				showHistoricalAcRefs: true,
				exactMatchReg: false,
				exactMatchSer: false,
				exactMatchMake: false,
				exactMatchModel: false,
				caseSensitive: false,
				includeInactive: true, // Include inactive aircraft
				includeDeleted: false,
			});

			// Check if response is successful (JetNet returns "SUCCESS: ..." format)
			if (!jetnetResponse.responsestatus || !jetnetResponse.responsestatus.includes('SUCCESS')) {
				throw new Error(`JetNet API returned status: ${jetnetResponse.responsestatus}`);
			}

			const aircraftData = jetnetResponse.aircraft || [];
			result.aircraftCount = aircraftData.length;

			console.log(`📊 Found ${aircraftData.length} aircraft records from JetNet`);

			// Transform JetNet data to our format
			const transformedAircraft = jetnetAPI.transformAircraftData(aircraftData);

			// Apply filters if provided
			let filteredAircraft = transformedAircraft;
			if (options.filters) {
				filteredAircraft = this.applyFilters(transformedAircraft, options.filters);
				console.log(`🔍 Filtered to ${filteredAircraft.length} aircraft records`);
			}

			// Process in batches
			const batchSize = options.batchSize || 100;
			const batches = this.chunkArray(filteredAircraft, batchSize);

			console.log(`📦 Processing ${batches.length} batches of ${batchSize} records each`);

			for (let i = 0; i < batches.length; i++) {
				const batch = batches[i];
				console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} records)`);

				const batchResult = await this.processBatch(batch, options.forceRefresh || false);

				result.totalProcessed += batchResult.totalProcessed;
				result.created += batchResult.created;
				result.updated += batchResult.updated;
				result.errors += batchResult.errors;
				result.errorDetails.push(...batchResult.errorDetails);

				// Small delay between batches to avoid overwhelming the database
				if (i < batches.length - 1) {
					await new Promise(resolve => setTimeout(resolve, 100));
				}
			}

			// Update last sync time
			this.lastSyncTime = new Date();

			// Log sync completion
			await this.logSyncCompletion(result);

			console.log('✅ JetNet sync completed successfully');
			console.log(
				`📊 Results: ${result.created} created, ${result.updated} updated, ${result.errors} errors`
			);
		} catch (error) {
			console.error('❌ JetNet sync failed:', error);
			result.errorDetails.push({
				aircraft: 'SYSTEM',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			result.errors++;
		} finally {
			this.isRunning = false;
			result.duration = Date.now() - startTime;
		}

		return result;
	}

	/**
	 * Process a batch of aircraft records
	 */
	private async processBatch(
		aircraftBatch: any[],
		forceRefresh: boolean
	): Promise<Omit<SyncResult, 'duration' | 'aircraftCount'>> {
		const batchResult = {
			totalProcessed: 0,
			created: 0,
			updated: 0,
			errors: 0,
			errorDetails: [] as Array<{ aircraft: string; error: string }>,
		};

		for (const aircraft of aircraftBatch) {
			try {
				batchResult.totalProcessed++;

				// Check if aircraft already exists
				const existingAircraft = await prisma.aircraft.findFirst({
					where: {
						OR: [
							{ aircraftId: aircraft.aircraftId },
							{ registration: aircraft.registration },
							{ serialNumber: aircraft.serialNumber },
						],
					},
				});

				if (existingAircraft) {
					// Update existing aircraft
					await prisma.aircraft.update({
						where: { id: existingAircraft.id },
						data: {
							...aircraft,
							updatedAt: new Date(),
							// Preserve some local data
							createdAt: existingAircraft.createdAt,
							// Update market data
							marketData: JSON.stringify({
								...existingAircraft.marketData,
								lastJetNetSync: new Date().toISOString(),
								jetNetData: aircraft,
							}),
						},
					});
					batchResult.updated++;
				} else {
					// Create new aircraft
					await prisma.aircraft.create({
						data: {
							...aircraft,
							createdAt: new Date(),
							updatedAt: new Date(),
							// Add market data
							marketData: JSON.stringify({
								lastJetNetSync: new Date().toISOString(),
								jetNetData: aircraft,
								dataSource: 'JetNet-BulkExport',
							}),
						},
					});
					batchResult.created++;
				}
			} catch (error) {
				batchResult.errors++;
				batchResult.errorDetails.push({
					aircraft:
						aircraft.registration || aircraft.serialNumber || aircraft.aircraftId || 'Unknown',
					error: error instanceof Error ? error.message : 'Unknown error',
				});
				console.error(
					`Error processing aircraft ${aircraft.registration || aircraft.serialNumber}:`,
					error
				);
			}
		}

		return batchResult;
	}

	/**
	 * Apply filters to aircraft data
	 */
	private applyFilters(aircraft: any[], filters: NonNullable<SyncOptions['filters']>): any[] {
		return aircraft.filter(aircraft => {
			// Make filter
			if (filters.make && filters.make.length > 0) {
				if (!filters.make.some(make => aircraft.make?.toLowerCase().includes(make.toLowerCase()))) {
					return false;
				}
			}

			// Year filter
			if (filters.yearMin && aircraft.year && aircraft.year < filters.yearMin) {
				return false;
			}
			if (filters.yearMax && aircraft.year && aircraft.year > filters.yearMax) {
				return false;
			}

			// Price filter
			if (filters.priceMin && aircraft.price && aircraft.price < filters.priceMin) {
				return false;
			}
			if (filters.priceMax && aircraft.price && aircraft.price > filters.priceMax) {
				return false;
			}

			// State filter
			if (filters.states && filters.states.length > 0) {
				if (!filters.states.includes(aircraft.baseState)) {
					return false;
				}
			}

			// Country filter
			if (filters.countries && filters.countries.length > 0) {
				if (!filters.countries.includes(aircraft.baseCountry)) {
					return false;
				}
			}

			return true;
		});
	}

	/**
	 * Chunk array into smaller arrays
	 */
	private chunkArray<T>(array: T[], size: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += size) {
			chunks.push(array.slice(i, i + size));
		}
		return chunks;
	}

	/**
	 * Log sync completion
	 */
	private async logSyncCompletion(result: SyncResult): Promise<void> {
		try {
			await prisma.userActivity.create({
				data: {
					userId: 'system',
					action: 'JETNET_SYNC',
					resource: 'aircraft',
					resourceId: 'bulk-sync',
					details: `JetNet sync completed: ${result.created} created, ${result.updated} updated, ${result.errors} errors in ${result.duration}ms`,
				},
			});
		} catch (error) {
			console.error('Failed to log sync completion:', error);
		}
	}

	/**
	 * Get sync statistics
	 */
	async getSyncStats(): Promise<{
		totalAircraft: number;
		lastSync: Date | null;
		isRunning: boolean;
		jetnetAircraftCount: number;
	}> {
		const totalAircraft = await prisma.aircraft.count();

		// Get JetNet aircraft count
		let jetnetAircraftCount = 0;
		try {
			const jetnetResponse = await jetnetAPI.getBulkAircraftExport({
				forsale: 'True',
				aircraftchanges: 'true',
				showHistoricalAcRefs: true,
				exactMatchReg: false,
				exactMatchSer: false,
				exactMatchMake: false,
				exactMatchModel: false,
				caseSensitive: false,
				includeInactive: false,
				includeDeleted: false,
			});
			jetnetAircraftCount = jetnetResponse.aircraft?.length || 0;
		} catch (error) {
			console.error('Failed to get JetNet aircraft count:', error);
		}

		return {
			totalAircraft,
			lastSync: this.lastSyncTime,
			isRunning: this.isRunning,
			jetnetAircraftCount,
		};
	}

	/**
	 * Clear all aircraft data (for testing)
	 */
	async clearAllAircraft(): Promise<void> {
		if (this.isRunning) {
			throw new Error('Cannot clear data while sync is running');
		}

		await prisma.aircraft.deleteMany({});
		console.log('🗑️ All aircraft data cleared');
	}
}

export const jetnetSync = new JetNetSyncService();
