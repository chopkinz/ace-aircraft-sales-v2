#!/usr/bin/env tsx

/**
 * Test JetNet API Response
 */

import { jetnetAPI } from '../src/lib/jetnet-api';

async function main() {
	console.log('🔍 Testing JetNet API Response...');

	try {
		// Test authentication
		console.log('\n1. Testing authentication...');
		const auth = await jetnetAPI.authenticate();
		console.log('✅ Authentication successful');
		console.log(`Bearer token: ${auth.bearerToken.substring(0, 30)}...`);

		// Test bulk export with all aircraft
		console.log('\n2. Testing bulk export with ALL aircraft...');
		const response = await jetnetAPI.getBulkAircraftExport({
			forsale: 'All', // Get all aircraft
			aircraftchanges: 'true',
			showHistoricalAcRefs: true,
			exactMatchReg: false,
			exactMatchSer: false,
			exactMatchMake: false,
			exactMatchModel: false,
			caseSensitive: false,
			includeInactive: true, // Include inactive
			includeDeleted: false,
		});

		console.log('📊 Response structure:');
		console.log(`   responsestatus: ${response.responsestatus}`);
		console.log(`   aircraftcount: ${response.aircraftcount}`);
		console.log(`   aircraft array length: ${response.aircraft?.length || 0}`);
		console.log(`   responseid: ${response.responseid}`);

		if (response.aircraft && response.aircraft.length > 0) {
			console.log('\n📋 Sample aircraft data:');
			const sample = response.aircraft[0];
			console.log(`   Aircraft ID: ${sample.aircraftid}`);
			console.log(`   Make: ${sample.make}`);
			console.log(`   Model: ${sample.model}`);
			console.log(`   Year: ${sample.yearmfr}`);
			console.log(`   Registration: ${sample.regnbr}`);
			console.log(`   Price: ${sample.askingprice}`);
			console.log(`   For Sale: ${sample.forsale}`);
		}

		// Test aircraft list
		console.log('\n3. Testing aircraft list...');
		const listResponse = await jetnetAPI.getAircraftList({
			forsale: 'True',
		});

		console.log('📊 List response structure:');
		console.log(`   responsestatus: ${listResponse.responsestatus}`);
		console.log(`   aircraftcount: ${listResponse.aircraftcount}`);
		console.log(`   aircraft array length: ${listResponse.aircraft?.length || 0}`);
	} catch (error) {
		console.error('❌ Test failed:', error);
	}
}

main().catch(console.error);
