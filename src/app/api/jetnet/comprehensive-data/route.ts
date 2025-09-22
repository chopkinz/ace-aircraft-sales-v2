import { NextResponse } from 'next/server';

interface JetNetAuthData {
	bearerToken: string;
	securityToken: string;
	expiresAt: number;
}

interface AircraftData {
	id: string;
	registration?: string;
	make?: string;
	model?: string;
	year?: number;
	price?: number;
	location?: string;
	forsale?: string;
	[key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface ComprehensiveDataResult {
	aircraft: AircraftData[];
	events: unknown[];
	history: unknown[];
	relationships: unknown[];
	flightData: unknown[];
	ownerOperators: unknown[];
	snapshot: unknown[];
	totalRecords: number;
	metadata: {
		endpointsUsed: string[];
		timestamp: string;
		duration: number;
		successCount: number;
		errorCount: number;
	};
}

export async function POST() {
	const startTime = Date.now();
	const results: ComprehensiveDataResult = {
		aircraft: [],
		events: [],
		history: [],
		relationships: [],
		flightData: [],
		ownerOperators: [],
		snapshot: [],
		totalRecords: 0,
		metadata: {
			endpointsUsed: [],
			timestamp: new Date().toISOString(),
			duration: 0,
			successCount: 0,
			errorCount: 0,
		},
	};

	try {
		console.log('🚀 Starting comprehensive JetNet data collection...');

		// Get authentication data
		const authData = (globalThis as Record<string, unknown>).jetnetAuthData as JetNetAuthData;

		if (!authData || !authData.bearerToken || !authData.securityToken) {
			console.log('❌ No authentication data available');
			return NextResponse.json(
				{
					success: false,
					error: 'No authentication data available. Please authenticate first.',
					timestamp: new Date().toISOString(),
				},
				{ status: 401 }
			);
		}

		// Check if auth is still valid
		if (Date.now() > authData.expiresAt) {
			console.log('❌ Authentication expired');
			return NextResponse.json(
				{
					success: false,
					error: 'Authentication expired. Please re-authenticate.',
					timestamp: new Date().toISOString(),
				},
				{ status: 401 }
			);
		}

		const baseUrl = 'https://api.jetnet.com';
		const headers = {
			Authorization: `Bearer ${authData.bearerToken}`,
			'Content-Type': 'application/json',
		};

		// Define all JetNet endpoints to collect data from
		const endpoints = [
			{
				name: 'aircraft-list',
				url: `${baseUrl}/api/Aircraft/getAircraftList/${authData.securityToken}`,
				method: 'POST',
				dataKey: 'aircraft',
			},
			{
				name: 'bulk-aircraft-export',
				url: `${baseUrl}/api/Aircraft/getBulkAircraftExport/${authData.securityToken}`,
				method: 'POST',
				dataKey: 'aircraft',
			},
			{
				name: 'events-list',
				url: `${baseUrl}/api/Aircraft/getEventList/${authData.securityToken}`,
				method: 'POST',
				dataKey: 'events',
			},
			{
				name: 'history-list',
				url: `${baseUrl}/api/Aircraft/getHistoryList/${authData.securityToken}`,
				method: 'POST',
				dataKey: 'history',
			},
			{
				name: 'relationships',
				url: `${baseUrl}/api/Aircraft/getRelationships/${authData.securityToken}`,
				method: 'POST',
				dataKey: 'relationships',
			},
			{
				name: 'flight-data',
				url: `${baseUrl}/api/Aircraft/getFlightData/${authData.securityToken}`,
				method: 'POST',
				dataKey: 'flightData',
			},
			{
				name: 'owner-operators',
				url: `${baseUrl}/api/Aircraft/getCondensedOwnerOperators/${authData.securityToken}`,
				method: 'POST',
				dataKey: 'ownerOperators',
			},
			{
				name: 'snapshot',
				url: `${baseUrl}/api/Aircraft/getCondensedSnapshot/${authData.securityToken}`,
				method: 'POST',
				dataKey: 'snapshot',
			},
		];

		// Collect data from all endpoints
		for (const endpoint of endpoints) {
			try {
				console.log(`📡 Fetching data from ${endpoint.name}...`);

				const response = await fetch(endpoint.url, {
					method: endpoint.method,
					headers,
					timeout: 30000,
				});

				if (response.ok) {
					const data = await response.json();
					console.log(`✅ ${endpoint.name}: ${data.length || 0} records`);

					// Store data in appropriate array
					if (endpoint.dataKey === 'aircraft' && Array.isArray(data)) {
						results.aircraft.push(...data);
					} else if (endpoint.dataKey === 'events' && Array.isArray(data)) {
						results.events.push(...data);
					} else if (endpoint.dataKey === 'history' && Array.isArray(data)) {
						results.history.push(...data);
					} else if (endpoint.dataKey === 'relationships' && Array.isArray(data)) {
						results.relationships.push(...data);
					} else if (endpoint.dataKey === 'flightData' && Array.isArray(data)) {
						results.flightData.push(...data);
					} else if (endpoint.dataKey === 'ownerOperators' && Array.isArray(data)) {
						results.ownerOperators.push(...data);
					} else if (endpoint.dataKey === 'snapshot' && Array.isArray(data)) {
						results.snapshot.push(...data);
					}

					results.metadata.endpointsUsed.push(endpoint.name);
					results.metadata.successCount++;
				} else {
					console.log(`❌ ${endpoint.name}: ${response.status} ${response.statusText}`);
					results.metadata.errorCount++;
				}
			} catch (error) {
				console.error(`❌ Error fetching ${endpoint.name}:`, error);
				results.metadata.errorCount++;
			}
		}

		// Calculate total records
		results.totalRecords =
			results.aircraft.length +
			results.events.length +
			results.history.length +
			results.relationships.length +
			results.flightData.length +
			results.ownerOperators.length +
			results.snapshot.length;

		results.metadata.duration = Date.now() - startTime;

		console.log(`🎉 Comprehensive data collection complete: ${results.totalRecords} total records`);

		// Store comprehensive data globally for other endpoints to use
		(globalThis as Record<string, unknown>).comprehensiveJetNetData = {
			...results,
			collectedAt: new Date().toISOString(),
			authData: {
				bearerToken: authData.bearerToken.substring(0, 10) + '...',
				securityToken: authData.securityToken.substring(0, 10) + '...',
			},
		};

		return NextResponse.json({
			success: true,
			data: results,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('❌ Comprehensive data collection error:', error);
		results.metadata.duration = Date.now() - startTime;

		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				partialData: results,
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

export async function GET() {
	// Return stored comprehensive data if available
	const storedData = (globalThis as Record<string, unknown>).comprehensiveJetNetData;

	if (storedData) {
		return NextResponse.json({
			success: true,
			data: storedData,
			timestamp: new Date().toISOString(),
		});
	}

	return NextResponse.json(
		{
			success: false,
			error: 'No comprehensive data available. Please run POST to collect data.',
			timestamp: new Date().toISOString(),
		},
		{ status: 404 }
	);
}
