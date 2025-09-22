import { NextRequest, NextResponse } from 'next/server';
import { jetnetAPI } from '@/lib/jetnet-api';
import { jetnetSync } from '@/lib/jetnet-sync';

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const action = searchParams.get('action');

		switch (action) {
			case 'test-auth': {
				// Test JetNet authentication
				const auth = await jetnetAPI.authenticate();
				return NextResponse.json({
					success: true,
					message: 'JetNet authentication successful',
					data: {
						bearerToken: auth.bearerToken.substring(0, 20) + '...',
						apiToken: auth.apiToken.substring(0, 20) + '...',
						authTime: new Date().toISOString(),
					},
				});
			}

			case 'get-aircraft-count': {
				// Get aircraft count from JetNet
				const response = await jetnetAPI.getComprehensiveAircraftData();
				return NextResponse.json({
					success: true,
					data: {
						aircraftCount: response.aircraft?.length || 0,
						responseStatus: response.responsestatus,
						responseId: response.responseid,
					},
				});
			}

			case 'sync-status': {
				// Get sync status
				const stats = await jetnetSync.getSyncStats();
				return NextResponse.json({
					success: true,
					data: stats,
				});
			}

			case 'sample-data': {
				// Get sample aircraft data (first 10 records)
				const response = await jetnetAPI.getComprehensiveAircraftData();
				const sampleData = response.aircraft?.slice(0, 10) || [];

				return NextResponse.json({
					success: true,
					data: {
						sampleCount: sampleData.length,
						totalCount: response.aircraft?.length || 0,
						sampleData: sampleData.map(aircraft => ({
							aircraftId: aircraft.aircraftid,
							make: aircraft.make,
							model: aircraft.model,
							year: aircraft.yearmfr,
							registration: aircraft.regnbr,
							price: aircraft.askingprice,
							location: aircraft.basecity,
							forsale: aircraft.forsale,
						})),
					},
				});
			}

			case 'aircraft-details': {
				// Get comprehensive aircraft details
				const aircraftId = searchParams.get('aircraftId');
				if (!aircraftId) {
					return NextResponse.json(
						{
							success: false,
							error: 'aircraftId parameter is required',
						},
						{ status: 400 }
					);
				}

				const details = await jetnetAPI.getAircraftComprehensiveDetails(aircraftId);
				return NextResponse.json({
					success: true,
					data: details,
				});
			}

			default:
				return NextResponse.json(
					{
						success: false,
						error:
							'Invalid action. Available actions: test-auth, get-aircraft-count, sync-status, sample-data, aircraft-details',
					},
					{ status: 400 }
				);
		}
	} catch (error) {
		console.error('JetNet API error:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'JetNet API error',
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { action, ...params } = body;

		switch (action) {
			case 'trigger-workflow': {
				// Trigger N8N workflow
				const workflowUrl = 'http://localhost:5678/webhook/fbebd708-f17a-4896-91f8-328080362084';

				try {
					const response = await fetch(workflowUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							trigger: 'manual',
							timestamp: new Date().toISOString(),
							...params,
						}),
					});

					if (!response.ok) {
						throw new Error(`Workflow trigger failed: ${response.status} ${response.statusText}`);
					}

					const result = await response.json();

					return NextResponse.json({
						success: true,
						message: 'N8N workflow triggered successfully',
						data: result,
					});
				} catch (error) {
					console.error('Workflow trigger error:', error);
					return NextResponse.json(
						{
							success: false,
							error: `Failed to trigger workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
						},
						{ status: 500 }
					);
				}
			}

			case 'sync-aircraft': {
				// Trigger aircraft sync
				if (jetnetSync.isSyncRunning()) {
					return NextResponse.json(
						{
							success: false,
							error: 'Sync is already running',
							isRunning: true,
						},
						{ status: 409 }
					);
				}

				// Start sync in background
				jetnetSync
					.syncAircraftData(params)
					.then(result => {
						console.log('JetNet sync completed:', result);
					})
					.catch(error => {
						console.error('JetNet sync failed:', error);
					});

				return NextResponse.json({
					success: true,
					message: 'JetNet aircraft sync started',
					isRunning: true,
				});
			}

			case 'get-model-intelligence': {
				// Get model intelligence
				const { make, model, year } = params;

				if (!make || !model) {
					return NextResponse.json(
						{
							success: false,
							error: 'Make and model are required',
						},
						{ status: 400 }
					);
				}

				const intelligence = await jetnetAPI.getModelIntelligence(make, model, year);

				return NextResponse.json({
					success: true,
					data: intelligence,
				});
			}

			case 'get-model-trends': {
				// Get model market trends
				const { make, model, year, startDate, endDate } = params;

				if (!make || !model) {
					return NextResponse.json(
						{
							success: false,
							error: 'Make and model are required',
						},
						{ status: 400 }
					);
				}

				const trends = await jetnetAPI.getModelMarketTrends(make, model, year, startDate, endDate);

				return NextResponse.json({
					success: true,
					data: trends,
				});
			}

			default:
				return NextResponse.json(
					{
						success: false,
						error:
							'Invalid action. Available actions: trigger-workflow, sync-aircraft, get-model-intelligence, get-model-trends',
					},
					{ status: 400 }
				);
		}
	} catch (error) {
		console.error('JetNet API POST error:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'JetNet API error',
			},
			{ status: 500 }
		);
	}
}
