import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { log } from '@/lib/logging/logger';

// Daily sync configuration for 8am CST
const DAILY_SYNC_CONFIG = {
	frequency: 'DAILY',
	syncTime: '08:00', // 8:00 AM
	timezone: 'America/Chicago', // CST
	batchSize: 1000,
	forceUpdate: false,
	includeImages: true,
	includeMarketData: true,
	maxRetries: 3,
};

export async function GET() {
	try {
		const requestId = crypto.randomUUID();

		log.info('Sync scheduler status request', {
			requestId,
			component: 'api',
			action: 'sync_scheduler_status',
		});

		// Get current sync configuration
		const syncConfig = await prisma.systemConfig.findUnique({
			where: { key: 'daily_sync_config' },
		});

		// Get recent sync logs
		const recentSyncs = await prisma.apiSyncLog.findMany({
			orderBy: { startedAt: 'desc' },
			take: 10,
		});

		// Get next scheduled sync time
		const nextSyncTime = calculateNextSyncTime();

		const response = {
			success: true,
			data: {
				isEnabled: syncConfig?.value === 'true',
				config: syncConfig ? JSON.parse(syncConfig.value) : DAILY_SYNC_CONFIG,
				nextSyncTime,
				recentSyncs,
				status: 'active',
			},
			metadata: {
				requestId,
				timestamp: new Date().toISOString(),
			},
		};

		return NextResponse.json(response, {
			headers: {
				'X-Request-ID': requestId,
			},
		});
	} catch (error) {
		log.error('Sync scheduler status request failed', {
			component: 'api',
			action: 'sync_scheduler_status',
			error: error instanceof Error ? error.message : 'Unknown error',
		});

		return NextResponse.json(
			{
				success: false,
				error: 'Failed to get sync scheduler status',
				message: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const requestId = crypto.randomUUID();
		const body = await request.json();

		log.info('Sync scheduler configuration request', {
			requestId,
			component: 'api',
			action: 'sync_scheduler_config',
			metadata: { body },
		});

		const { action, config } = body;

		switch (action) {
			case 'enable':
				await enableDailySync();
				break;
			case 'disable':
				await disableDailySync();
				break;
			case 'update':
				await updateSyncConfig(config);
				break;
			case 'trigger':
				await triggerManualSync();
				break;
			default:
				return NextResponse.json(
					{
						success: false,
						error: 'Invalid action',
						message: 'Action must be one of: enable, disable, update, trigger',
					},
					{ status: 400 }
				);
		}

		const response = {
			success: true,
			message: `Sync scheduler ${action} completed successfully`,
			metadata: {
				requestId,
				timestamp: new Date().toISOString(),
			},
		};

		return NextResponse.json(response, {
			headers: {
				'X-Request-ID': requestId,
			},
		});
	} catch (error) {
		log.error('Sync scheduler configuration request failed', {
			component: 'api',
			action: 'sync_scheduler_config',
			error: error instanceof Error ? error.message : 'Unknown error',
		});

		return NextResponse.json(
			{
				success: false,
				error: 'Failed to configure sync scheduler',
				message: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

async function enableDailySync() {
	const config = {
		...DAILY_SYNC_CONFIG,
		enabled: true,
		nextSyncTime: calculateNextSyncTime().toISOString(),
	};

	await prisma.systemConfig.upsert({
		where: { key: 'daily_sync_config' },
		update: { value: JSON.stringify(config) },
		create: {
			key: 'daily_sync_config',
			value: JSON.stringify(config),
			description: 'Daily sync configuration for 8am CST',
		},
	});

	log.info('Daily sync enabled', {
		component: 'sync_scheduler',
		action: 'enable_daily_sync',
		metadata: { config },
	});
}

async function disableDailySync() {
	await prisma.systemConfig.upsert({
		where: { key: 'daily_sync_config' },
		update: { value: 'false' },
		create: {
			key: 'daily_sync_config',
			value: 'false',
			description: 'Daily sync configuration disabled',
		},
	});

	log.info('Daily sync disabled', {
		component: 'sync_scheduler',
		action: 'disable_daily_sync',
	});
}

async function updateSyncConfig(newConfig: Record<string, unknown>) {
	const config = {
		...DAILY_SYNC_CONFIG,
		...newConfig,
		nextSyncTime: calculateNextSyncTime().toISOString(),
	};

	await prisma.systemConfig.upsert({
		where: { key: 'daily_sync_config' },
		update: { value: JSON.stringify(config) },
		create: {
			key: 'daily_sync_config',
			value: JSON.stringify(config),
			description: 'Daily sync configuration',
		},
	});

	log.info('Sync config updated', {
		component: 'sync_scheduler',
		action: 'update_sync_config',
		metadata: { config },
	});
}

async function triggerManualSync() {
	// Create a manual sync log entry
	const syncLog = await prisma.apiSyncLog.create({
		data: {
			syncType: 'manual_sync',
			status: 'started',
			recordsProcessed: 0,
			recordsCreated: 0,
			recordsUpdated: 0,
			startedAt: new Date(),
		},
	});

	// Trigger the actual sync (this would typically call your sync service)
	// For now, we'll just log it
	log.info('Manual sync triggered', {
		component: 'sync_scheduler',
		action: 'trigger_manual_sync',
		metadata: { syncLogId: syncLog.id },
	});

	// In a real implementation, you would trigger the actual sync process here
	// For example: await syncService.syncAllData();
}

function calculateNextSyncTime(): Date {
	const now = new Date();
	const cstOffset = -6; // CST is UTC-6
	const nowCST = new Date(now.getTime() + cstOffset * 60 * 60 * 1000);

	// Set to 8:00 AM CST
	const nextSync = new Date(nowCST);
	nextSync.setHours(8, 0, 0, 0);

	// If it's already past 8 AM today, schedule for tomorrow
	if (nextSync <= nowCST) {
		nextSync.setDate(nextSync.getDate() + 1);
	}

	// Convert back to UTC
	return new Date(nextSync.getTime() - cstOffset * 60 * 60 * 1000);
}
