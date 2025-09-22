import { NextRequest, NextResponse } from 'next/server';
import { ensureJetNetService } from '@/lib/jetnet-service';

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const make = searchParams.get('make');

		if (!make) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: 'MISSING_MAKE_PARAMETER',
						message: 'Make parameter is required',
					},
				},
				{ status: 400 }
			);
		}

		console.log(`📋 Getting aircraft models for make: ${make}`);

		// Ensure JetNet service is initialized
		const jetnetService = await ensureJetNetService();

		// Get aircraft models using the JetNet API client
		const response = await jetnetService.getAPIClient().getAircraftModels(make);

		if (!response.success) {
			console.error('❌ Failed to get aircraft models:', response.error);
			return NextResponse.json(
				{
					success: false,
					error: {
						code: 'JETNET_MODELS_FAILED',
						message: response.error || 'Failed to get aircraft models from JetNet API',
					},
					metadata: {
						timestamp: new Date().toISOString(),
						source: 'JetNet API',
						make,
					},
				},
				{ status: 503 }
			);
		}

		console.log(
			`✅ Successfully retrieved aircraft models for ${make}:`,
			response.data?.length || 0
		);

		return NextResponse.json({
			success: true,
			data: response.data || [],
			metadata: {
				timestamp: new Date().toISOString(),
				source: 'JetNet API',
				make,
				count: response.data?.length || 0,
			},
		});
	} catch (error) {
		console.error('❌ Error getting aircraft models:', error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: 'JETNET_MODELS_ERROR',
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
