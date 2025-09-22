// Initialize Sync Scheduler
// This script starts the automatic sync scheduler when the application starts

import { syncScheduler } from '@/lib/sync-scheduler';

let isInitialized = false;

export async function initializeSyncScheduler(): Promise<void> {
	if (isInitialized) {
		console.log('⏭️ Sync scheduler already initialized, skipping...');
		return;
	}

	try {
		console.log('🚀 Initializing sync scheduler...');
		await syncScheduler.initialize();
		isInitialized = true;
		console.log('✅ Sync scheduler initialized successfully');
	} catch (error) {
		console.error('❌ Failed to initialize sync scheduler:', error);
		// Don't throw error to prevent app from crashing
	}
}

// Auto-initialize when this module is imported (only once)
if (typeof window === 'undefined' && !isInitialized) {
	// Only run on server side and only once
	initializeSyncScheduler().catch(console.error);
}
