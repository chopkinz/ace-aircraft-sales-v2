import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		console.log('🚀 Triggering n8n workflow to fetch fresh aircraft data...');

		// Trigger the n8n workflow
		const n8nResponse = await fetch(
			'https://autom8god.app.n8n.cloud/webhook/fbebd708-f17a-4896-91f8-328080362084',
			{
				method: 'GET',
			}
		);

		if (!n8nResponse.ok) {
			throw new Error(`n8n workflow trigger failed: ${n8nResponse.statusText}`);
		}

		const n8nResult = await n8nResponse.text();
		console.log('✅ n8n workflow triggered successfully:', n8nResult);

		// Wait for the workflow to complete and data to be stored
		console.log('⏳ Waiting for workflow completion...');
		await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

		// Check if we have fresh data
		const storedAircraftData = (globalThis as Record<string, unknown>).jetnetAircraftData as Record<
			string,
			unknown
		>;

		if (storedAircraftData && storedAircraftData.data && Array.isArray(storedAircraftData.data)) {
			console.log(`📊 Fresh aircraft data received: ${storedAircraftData.count} records`);

			return NextResponse.json({
				success: true,
				message: `n8n workflow completed successfully. ${storedAircraftData.count} aircraft records fetched and stored.`,
				aircraftCount: storedAircraftData.count,
				timestamp: new Date().toISOString(),
				data: {
					count: storedAircraftData.count,
					receivedAt: storedAircraftData.receivedAt,
					source: storedAircraftData.source,
				},
			});
		} else {
			console.log('⚠️ n8n workflow completed but no aircraft data received yet');

			return NextResponse.json({
				success: true,
				message: 'n8n workflow triggered successfully, but aircraft data may still be processing.',
				timestamp: new Date().toISOString(),
				note: 'Check back in a few moments or try the aircraft search endpoint.',
			});
		}
	} catch (error) {
		console.error('❌ Failed to trigger n8n workflow:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { forceRefresh = false } = body;

		console.log('🔄 Manual aircraft data refresh requested...');

		// Clear existing stored data if force refresh
		if (forceRefresh) {
			console.log('🗑️ Clearing existing aircraft data...');
			delete (globalThis as Record<string, unknown>).jetnetAircraftData;
		}

		// Trigger the n8n workflow
		const n8nResponse = await fetch(
			'https://autom8god.app.n8n.cloud/webhook/fbebd708-f17a-4896-91f8-328080362084',
			{
				method: 'GET',
			}
		);

		if (!n8nResponse.ok) {
			throw new Error(`n8n workflow trigger failed: ${n8nResponse.statusText}`);
		}

		const n8nResult = await n8nResponse.text();
		console.log('✅ n8n workflow triggered successfully:', n8nResult);

		return NextResponse.json({
			success: true,
			message: 'n8n workflow triggered successfully. Aircraft data will be updated shortly.',
			timestamp: new Date().toISOString(),
			forceRefresh,
		});
	} catch (error) {
		console.error('❌ Failed to trigger n8n workflow:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
