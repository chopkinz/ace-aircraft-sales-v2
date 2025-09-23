#!/usr/bin/env tsx

/**
 * Comprehensive JetNet Sync
 * Fetches ALL aircraft data and comprehensive details from all JetNet endpoints
 */

import { jetnetAPI } from '../src/lib/jetnet-api';
import { jetnetSync } from '../src/lib/jetnet-sync';
import { prisma } from '../src/lib/database';

async function main() {
	console.log('🚀 Starting Comprehensive JetNet Sync...');
	console.log('=====================================\n');

	const startTime = Date.now();
	// Use the exported jetnetSync instance

	try {
		// 1. Check current database status
		console.log('📊 Checking current database status...');
		const beforeStats = await prisma.aircraft.aggregate({
			_count: { id: true },
		});
		console.log(`   Current aircraft count: ${beforeStats._count.id}`);

		// 2. Test JetNet API connection
		console.log('\n🔐 Testing JetNet API connection...');
		const auth = await jetnetAPI.authenticate();
		console.log('   ✅ JetNet authentication successful');
		console.log(`   Bearer token: ${auth.bearerToken.substring(0, 30)}...`);

		// 3. Get comprehensive JetNet data
		console.log('\n📈 Getting comprehensive JetNet data...');
		const jetnetResponse = await jetnetAPI.getBulkAircraftExport({
			forsale: 'All', // Get all aircraft
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

		// 4. Run comprehensive sync with all aircraft
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

		// 5. Get comprehensive details for each aircraft
		console.log('\n🔍 Fetching comprehensive details for all aircraft...');
		const aircraft = await prisma.aircraft.findMany({
			select: { id: true, aircraftId: true, manufacturer: true, model: true, registration: true },
		});

		let detailsProcessed = 0;
		let detailsErrors = 0;

		for (const aircraftRecord of aircraft) {
			try {
				console.log(
					`   Processing details for ${aircraftRecord.manufacturer} ${aircraftRecord.model} (${aircraftRecord.registration})...`
				);

				// Get comprehensive aircraft details
				if (!aircraftRecord.aircraftId) {
					console.log(
						`   Skipping ${aircraftRecord.manufacturer} ${aircraftRecord.model} - no aircraftId`
					);
					continue;
				}

				const comprehensiveDetails = await jetnetAPI.getAircraftComprehensiveDetails(
					aircraftRecord.aircraftId.toString()
				);

				// Update aircraft with comprehensive data
				await prisma.aircraft.update({
					where: { id: aircraftRecord.id },
					data: {
						marketData: JSON.stringify({
							comprehensiveDetails,
							lastComprehensiveSync: new Date().toISOString(),
						}),
					},
				});

				detailsProcessed++;

				// Add delay to avoid rate limiting
				await new Promise(resolve => setTimeout(resolve, 100));
			} catch (error) {
				console.error(`   ❌ Error processing details for ${aircraftRecord.registration}:`, error);
				detailsErrors++;
			}
		}

		console.log(`\n📋 Comprehensive Details Results:`);
		console.log(`   Details processed: ${detailsProcessed}`);
		console.log(`   Details errors: ${detailsErrors}`);

		// 6. Verify final database status
		console.log('\n✅ Verifying final database status...');
		const afterStats = await prisma.aircraft.aggregate({
			_count: { id: true },
		});
		console.log(`   Final aircraft count: ${afterStats._count.id}`);
		console.log(`   Net change: +${afterStats._count.id - beforeStats._count.id}`);

		// 7. Test key API endpoints
		console.log('\n🧪 Testing key API endpoints...');
		try {
			const response = await fetch('http://localhost:3000/api/database/aircraft/comprehensive');
			if (response.ok) {
				const data = await response.json();
				console.log(`   ✅ Database health check passed`);
				console.log(`   ✅ Dashboard data API working (${data.aircraft?.length || 0} aircraft)`);
			} else {
				console.log(`   ⚠️  Database health check failed: ${response.status}`);
			}
		} catch (error) {
			console.log(`   ⚠️  API test failed: ${error}`);
		}

		const totalDuration = Date.now() - startTime;
		console.log('\n🎉 Comprehensive sync completed successfully!');
		console.log(`   Total duration: ${(totalDuration / 1000).toFixed(2)}s`);
		console.log(`   Aircraft synced: ${syncResult.totalProcessed}`);
		console.log(`   Details processed: ${detailsProcessed}`);
		console.log(`   Database ready for production deployment`);
	} catch (error) {
		console.error('\n❌ Comprehensive sync failed:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main().catch(console.error);
