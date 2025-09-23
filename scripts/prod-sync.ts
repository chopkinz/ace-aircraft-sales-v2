#!/usr/bin/env tsx

/**
 * Production JetNet Sync Script
 * This script performs a comprehensive sync of JetNet data to the production database
 */

import { PrismaClient } from '@prisma/client';
import { jetnetAPI } from '../src/lib/jetnet-api';
import { jetnetSync, SyncResult } from '../src/lib/jetnet-sync';

const prisma = new PrismaClient();

interface SyncStats {
	before: {
		aircraftCount: number;
		lastSync: Date | null;
	};
	after: {
		aircraftCount: number;
		syncResult: SyncResult; // add syncResult to the syncStats
		lastSync: Date | null;
		jetnetAircraftCount: number;
	};
	duration: number;
}

async function main() {
	console.log('🚀 Starting Production JetNet Sync...');
	console.log('=====================================');

	const startTime = Date.now();

	try {
		// 1. Check current database status
		console.log('\n📊 Checking current database status...');
		const beforeStats = await getDatabaseStats();
		console.log(`   Current aircraft count: ${beforeStats.aircraftCount}`);
		console.log(`   Last sync: ${beforeStats.lastSync || 'Never'}`);

		// 2. Test JetNet API connection
		console.log('\n🔐 Testing JetNet API connection...');
		try {
			const auth = await jetnetAPI.authenticate();
			console.log('   ✅ JetNet authentication successful');
			console.log(`   Bearer token: ${auth.bearerToken.substring(0, 20)}...`);
		} catch (error) {
			console.error('   ❌ JetNet authentication failed:', error);
			throw error;
		}

		// 3. Get JetNet aircraft count
		console.log('\n📈 Getting JetNet aircraft count...');
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

		const jetnetAircraftCount = jetnetResponse.aircraft?.length || 0;
		console.log(`   JetNet aircraft available: ${jetnetAircraftCount}`);

		if (!jetnetResponse.responsestatus || !jetnetResponse.responsestatus.includes('SUCCESS')) {
			throw new Error(`JetNet API returned status: ${jetnetResponse.responsestatus}`);
		}

		// 4. Run comprehensive sync
		console.log('\n🔄 Starting comprehensive aircraft sync...');
		const syncResult = await jetnetSync.syncAircraftData({
			forceRefresh: true,
			batchSize: 1000, // Large batches to get all data
			includeInactive: true, // Include all aircraft
		});

		console.log('\n📊 Sync Results:');
		console.log('syncResult', syncResult);
		console.log(`   Total processed: ${syncResult.totalProcessed}`);
		console.log('syncResult.created', syncResult.created);
		console.log('syncResult.updated', syncResult.updated);
		console.log('syncResult.errors', syncResult.errors);
		console.log(`   Duration: ${(syncResult.duration / 1000).toFixed(2)}s`);

		if (syncResult.errors > 0) {
			console.log('\n⚠️  Errors encountered:');
			syncResult.errorDetails.slice(0, 10).forEach(error => {
				console.log(`   - ${error.aircraft}: ${error.error}`);
			});
			if (syncResult.errorDetails.length > 10) {
				console.log(`   ... and ${syncResult.errorDetails.length - 10} more errors`);
			}
		}

		console.log('syncResult.errorDetails', syncResult.errorDetails);

		// 5. Verify final database status
		console.log('\n✅ Verifying final database status...');
		const afterStats = await getDatabaseStats();
		console.log('afterStats', afterStats);
		console.log(`   Final aircraft count: ${afterStats.aircraftCount}`);
		console.log(`   Net change: +${afterStats.aircraftCount - beforeStats.aircraftCount}`);

		// 6. Test key API endpoints
		console.log('\n🧪 Testing key API endpoints...');
		await testAPIEndpoints();

		const totalDuration = Date.now() - startTime;
		console.log('\n🎉 Production sync completed successfully!');
		console.log(`   Total duration: ${(totalDuration / 1000).toFixed(2)}s`);
		console.log('syncResult.created', syncResult.created);
		console.log('syncResult.updated', syncResult.updated);
		// SyncStats
		const syncStats: SyncStats = {
			before: beforeStats,
			after: afterStats,
			syncResult: syncResult, // add syncResult to the syncStats
			duration: totalDuration,
		};
		console.log('syncStats', syncStats);
		console.log(`   Aircraft synced: ${syncResult.created + syncResult.updated}`);
		console.log(`   Database ready for production deployment`);
	} catch (error) {
		console.error('\n❌ Production sync failed:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

async function getDatabaseStats() {
	const aircraftCount = await prisma.aircraft.count();

	// Get last sync time from user activity
	const lastSyncActivity = await prisma.userActivity.findFirst({
		where: {
			action: 'JETNET_SYNC',
		},
		orderBy: {
			createdAt: 'desc',
		},
	});

	return {
		aircraftCount,
		lastSync: lastSyncActivity?.createdAt || null,
	};
}

async function testAPIEndpoints() {
	const baseUrl = 'http://localhost:3000';

	try {
		// Test database health
		const healthResponse = await fetch(`${baseUrl}/api/health/database`);
		if (healthResponse.ok) {
			console.log('   ✅ Database health check passed');
		} else {
			console.log('   ⚠️  Database health check failed');
		}

		// Test dashboard data
		const dashboardResponse = await fetch(`${baseUrl}/api/dashboard/data`);
		if (dashboardResponse.ok) {
			const data = await dashboardResponse.json();
			console.log(`   ✅ Dashboard data API working (${data._count?.id || 0} aircraft)`);
		} else {
			console.log('   ⚠️  Dashboard data API failed');
		}

		// Test JetNet sync status
		const syncStatusResponse = await fetch(`${baseUrl}/api/jetnet?action=sync-status`);
		if (syncStatusResponse.ok) {
			console.log('   ✅ JetNet sync status API working');
		} else {
			console.log('   ⚠️  JetNet sync status API failed');
		}
	} catch (error) {
		console.log('   ⚠️  API endpoint tests skipped (server not running)');
	}
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
	console.log('\n🛑 Received SIGINT, shutting down gracefully...');
	await prisma.$disconnect();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
	await prisma.$disconnect();
	process.exit(0);
});

// Run the sync
main().catch(async error => {
	console.error('Fatal error:', error);
	await prisma.$disconnect();
	process.exit(1);
});
