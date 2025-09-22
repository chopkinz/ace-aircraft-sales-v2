import { NextRequest, NextResponse } from 'next/server';
import { ensureJetNetService } from '@/lib/jetnet-service';

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const country = searchParams.get('country');

		console.log('🗺️ Getting states from JetNet API', country ? `for country: ${country}` : '');

		// Ensure JetNet service is initialized
		const jetnetService = await ensureJetNetService();

		// Get states using the JetNet API client
		const response = country
			? await jetnetService.getAPIClient().getStates(country)
			: await jetnetService.getAPIClient().getStates('United States'); // Default to US

		if (!response.success) {
			console.error('❌ Failed to get states:', response.error);
			return NextResponse.json(
				{
					success: false,
					error: {
						code: 'JETNET_STATES_FAILED',
						message: response.error || 'Failed to get states from JetNet API',
					},
					metadata: {
						timestamp: new Date().toISOString(),
						source: 'JetNet API',
						country: country || 'United States',
					},
				},
				{ status: 503 }
			);
		}

		console.log(`✅ Successfully retrieved states:`, response.data?.length || 0);

		return NextResponse.json({
			success: true,
			data: response.data || [],
			metadata: {
				timestamp: new Date().toISOString(),
				source: 'JetNet API',
				country: country || 'United States',
				count: response.data?.length || 0,
			},
		});
	} catch (error) {
		console.error('❌ Error getting states:', error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: 'JETNET_STATES_ERROR',
					message: error instanceof Error ? error.message : 'Unknown error occurred',
				},
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'JetNet API',
				},
			},
			{ status: 500 }
		);
	}
}
