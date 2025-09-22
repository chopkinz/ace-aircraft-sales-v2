// Automatic Data Sync Scheduler
// Handles scheduled data synchronization based on user configurations

import { prisma } from '@/lib/database';
import { dataSyncService } from '@/lib/data-sync-service';

export interface SyncSchedule {
	id: string;
	userId?: string;
	frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MANUAL';
	syncTime: string; // HH:MM format
	timezone: string;
	nextRun: Date;
	config: any;
}

class SyncScheduler {
	private schedules: Map<string, NodeJS.Timeout> = new Map();
	private isRunning = false;

	// Initialize the scheduler
	async initialize(): Promise<void> {
		if (this.isRunning) {
			console.log('⚠️ Sync scheduler is already running');
			return;
		}

		this.isRunning = true;
		console.log('🚀 Initializing sync scheduler...');

		try {
			// Load all sync configurations
			const configs = await this.loadSyncConfigs();

			// Schedule each configuration
			for (const config of configs) {
				await this.scheduleSync(config);
			}

			// Start the main scheduler loop
			this.startSchedulerLoop();

			console.log('✅ Sync scheduler initialized successfully');
		} catch (error) {
			console.error('❌ Failed to initialize sync scheduler:', error);
			this.isRunning = false;
			throw error;
		}
	}

	// Load sync configurations from database
	private async loadSyncConfigs(): Promise<any[]> {
		try {
			const configs = await prisma.syncConfig.findMany({
				where: {
					isEnabled: true,
					syncFrequency: {
						not: 'MANUAL',
					},
				},
				include: {
					user: {
						select: {
							id: true,
							email: true,
							name: true,
						},
					},
				},
			});

			console.log(`📋 Loaded ${configs.length} sync configurations`);
			return configs;
		} catch (error) {
			console.error('❌ Error loading sync configurations:', error);
			return [];
		}
	}

	// Schedule a sync configuration
	private async scheduleSync(config: any): Promise<void> {
		try {
			const scheduleId = config.id;
			const nextRun = this.calculateNextRun(config);

			// Cancel existing schedule if any
			if (this.schedules.has(scheduleId)) {
				clearTimeout(this.schedules.get(scheduleId)!);
			}

			// Update next sync time in database
			await prisma.syncConfig.update({
				where: { id: scheduleId },
				data: { nextSyncAt: nextRun },
			});

			// Calculate delay until next run
			const delay = nextRun.getTime() - Date.now();

			if (delay > 0) {
				// Schedule the sync
				const timeout = setTimeout(async () => {
					await this.executeScheduledSync(config);
					// Reschedule for next run
					await this.scheduleSync(config);
				}, delay);

				this.schedules.set(scheduleId, timeout);

				console.log(`⏰ Scheduled sync for config ${scheduleId} at ${nextRun.toISOString()}`);
			} else {
				console.log(`⚠️ Sync time has passed for config ${scheduleId}, scheduling immediately`);
				// Execute immediately and reschedule
				await this.executeScheduledSync(config);
				await this.scheduleSync(config);
			}
		} catch (error) {
			console.error(`❌ Error scheduling sync for config ${config.id}:`, error);
		}
	}

	// Calculate next run time based on frequency and sync time
	private calculateNextRun(config: any): Date {
		const now = new Date();
		const [hours, minutes] = config.syncTime.split(':').map(Number);

		// Create a date for today at the specified time
		const today = new Date(now);
		today.setHours(hours, minutes, 0, 0);

		switch (config.syncFrequency) {
			case 'HOURLY':
				// Run every hour at the specified minute
				const nextHour = new Date(now);
				nextHour.setMinutes(minutes, 0, 0);
				if (nextHour <= now) {
					nextHour.setHours(nextHour.getHours() + 1);
				}
				return nextHour;

			case 'DAILY':
				// Run daily at the specified time
				if (today <= now) {
					today.setDate(today.getDate() + 1);
				}
				return today;

			case 'WEEKLY':
				// Run weekly on the same day of the week
				const nextWeek = new Date(today);
				if (nextWeek <= now) {
					nextWeek.setDate(nextWeek.getDate() + 7);
				}
				return nextWeek;

			case 'MONTHLY':
				// Run monthly on the same day
				const nextMonth = new Date(today);
				if (nextMonth <= now) {
					nextMonth.setMonth(nextMonth.getMonth() + 1);
				}
				return nextMonth;

			default:
				// Default to daily
				if (today <= now) {
					today.setDate(today.getDate() + 1);
				}
				return today;
		}
	}

	// Execute a scheduled sync
	private async executeScheduledSync(config: any): Promise<void> {
		console.log(`🔄 Executing scheduled sync for config ${config.id}`);

		try {
			// Update last sync time
			await prisma.syncConfig.update({
				where: { id: config.id },
				data: { lastSyncAt: new Date() },
			});

			// Prepare sync options
			const syncOptions = {
				batchSize: config.batchSize,
				forceUpdate: config.forceUpdate,
				includeImages: config.includeImages,
				includeMarketData: config.includeMarketData,
				maxRetries: config.maxRetries,
			};

			// Execute the sync
			const stats = await dataSyncService.syncAllData(syncOptions);

			// Update sync status
			const status = stats.totalErrors === 0 ? 'success' : 'partial';
			await prisma.syncConfig.update({
				where: { id: config.id },
				data: { lastSyncStatus: status },
			});

			// Log the sync
			await prisma.syncLog.create({
				data: {
					type: 'scheduled_sync',
					status,
					totalProcessed: stats.totalProcessed,
					totalInserted: stats.totalInserted,
					totalUpdated: stats.totalUpdated,
					totalErrors: stats.totalErrors,
					duration: stats.duration || 0,
					details: JSON.stringify({
						configId: config.id,
						userId: config.userId,
						frequency: config.syncFrequency,
						syncTime: config.syncTime,
					}),
				},
			});

			console.log(`✅ Scheduled sync completed for config ${config.id}`);
		} catch (error) {
			console.error(`❌ Scheduled sync failed for config ${config.id}:`, error);

			// Update sync status to failed
			await prisma.syncConfig.update({
				where: { id: config.id },
				data: { lastSyncStatus: 'failed' },
			});

			// Log the failed sync
			await prisma.syncLog.create({
				data: {
					type: 'scheduled_sync',
					status: 'failed',
					totalProcessed: 0,
					totalInserted: 0,
					totalUpdated: 0,
					totalErrors: 1,
					duration: 0,
					details: JSON.stringify({
						configId: config.id,
						userId: config.userId,
						error: error instanceof Error ? error.message : 'Unknown error',
					}),
				},
			});
		}
	}

	// Start the main scheduler loop (checks for new configs every hour)
	private startSchedulerLoop(): void {
		const checkInterval = 60 * 60 * 1000; // 1 hour

		setInterval(async () => {
			try {
				console.log('🔄 Checking for new sync configurations...');
				const configs = await this.loadSyncConfigs();

				// Check if any new configs need to be scheduled
				for (const config of configs) {
					if (!this.schedules.has(config.id)) {
						await this.scheduleSync(config);
					}
				}
			} catch (error) {
				console.error('❌ Error in scheduler loop:', error);
			}
		}, checkInterval);
	}

	// Add or update a sync configuration
	async addSyncConfig(config: any): Promise<void> {
		try {
			const savedConfig = await prisma.syncConfig.upsert({
				where: {
					userId: config.userId || null,
				},
				update: config,
				create: config,
			});

			// Schedule the new/updated config
			await this.scheduleSync(savedConfig);

			console.log(`✅ Sync configuration added/updated: ${savedConfig.id}`);
		} catch (error) {
			console.error('❌ Error adding sync configuration:', error);
			throw error;
		}
	}

	// Remove a sync configuration
	async removeSyncConfig(configId: string): Promise<void> {
		try {
			// Cancel the schedule
			if (this.schedules.has(configId)) {
				clearTimeout(this.schedules.get(configId)!);
				this.schedules.delete(configId);
			}

			// Remove from database
			await prisma.syncConfig.delete({
				where: { id: configId },
			});

			console.log(`✅ Sync configuration removed: ${configId}`);
		} catch (error) {
			console.error('❌ Error removing sync configuration:', error);
			throw error;
		}
	}

	// Get scheduler status
	getStatus(): { isRunning: boolean; activeSchedules: number } {
		return {
			isRunning: this.isRunning,
			activeSchedules: this.schedules.size,
		};
	}

	// Stop the scheduler
	stop(): void {
		console.log('🛑 Stopping sync scheduler...');

		// Clear all schedules
		for (const [id, timeout] of this.schedules) {
			clearTimeout(timeout);
		}
		this.schedules.clear();

		this.isRunning = false;
		console.log('✅ Sync scheduler stopped');
	}
}

export const syncScheduler = new SyncScheduler();
