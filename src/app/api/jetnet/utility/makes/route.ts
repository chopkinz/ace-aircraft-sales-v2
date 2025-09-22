import { NextResponse } from 'next/server';
import { ensureJetNetService } from '@/lib/jetnet-service';

export async function GET() {
	try {
		console.log('🏭 Getting aircraft makes from JetNet API');

		// Ensure JetNet service is initialized
		const jetnetService = await ensureJetNetService();

		// Get aircraft makes using the JetNet API client
		const response = await jetnetService.getAPIClient().getAircraftMakes();

		if (!response.success) {
			console.error('❌ Failed to get aircraft makes:', response.error);
			return NextResponse.json(
				{
					success: false,
					error: {
						code: 'JETNET_MAKES_FAILED',
						message: response.error || 'Failed to get aircraft makes from JetNet API',
					},
					metadata: {
						timestamp: new Date().toISOString(),
						source: 'JetNet API',
					},
				},
				{ status: 503 }
			);
		}

		console.log('✅ Successfully retrieved aircraft makes:', response.data?.length || 0);

		return NextResponse.json({
			success: true,
			data: response.data || [],
			metadata: {
				timestamp: new Date().toISOString(),
				source: 'JetNet API',
				count: response.data?.length || 0,
			},
		});
	} catch (error) {
		console.error('❌ Error getting aircraft makes:', error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: 'JETNET_MAKES_ERROR',
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
