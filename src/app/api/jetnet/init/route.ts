import { NextRequest, NextResponse } from 'next/server';
import { initializeJetNetService } from '@/lib/jetnet-service';

export async function POST() {
	try {
		console.log('🚀 Initializing JetNet Service...');

		// Initialize with environment variables
		const config = {
			credentials: {
				username: process.env.JETNET_EMAIL!,
				password: process.env.JETNET_PASSWORD!,
				baseUrl: process.env.JETNET_BASE_URL!,
			},
			monitoring: {
				enabled: true,
				intervalMs: 300000, // 5 minutes
			},
			scheduler: {
				enabled: true,
			},
		};

		const jetNetService = await initializeJetNetService(config);
		const healthStatus = await jetNetService.getHealthStatus();

		console.log('✅ JetNet service initialized successfully');

		return NextResponse.json({
			success: true,
			message: 'JetNet service initialized successfully',
			status: healthStatus,
		});
	} catch (error) {
		console.error('❌ JetNet service initialization failed:', error);

		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred',
				details: {
					step: 'Service initialization',
					timestamp: new Date().toISOString(),
				},
			},
			{ status: 500 }
		);
	}
}
