import { NextRequest, NextResponse } from 'next/server';
import {
	getGlobalJetNetService,
	isGlobalJetNetServiceInitialized,
} from '@/lib/global-jetnet-service';

export async function GET(request: NextRequest) {
	try {
		if (!isGlobalJetNetServiceInitialized()) {
			return NextResponse.json(
				{
					success: false,
					error: 'JetNet service not initialized',
					data: {
						status: {
							service: 'not_initialized',
							auth: { isAuthenticated: false },
							scheduler: { isRunning: false },
							monitoring: null,
							overall: null,
						},
						metrics: null,
						timestamp: new Date().toISOString(),
					},
				},
				{ status: 503 }
			);
		}

		const jetNetService = await getGlobalJetNetService();
		const healthStatus = await jetNetService.getHealthStatus();
		const metrics = jetNetService.getMetrics();

		return NextResponse.json({
			success: true,
			data: {
				status: healthStatus,
				metrics,
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error('❌ JetNet health check failed:', error);

		return NextResponse.json(
			{
				success: false,
				error: 'JetNet service not available',
				data: {
					status: {
						service: 'not_initialized',
						auth: { isAuthenticated: false },
						scheduler: { isRunning: false },
						monitoring: null,
						overall: null,
					},
					metrics: null,
					timestamp: new Date().toISOString(),
				},
			},
			{ status: 503 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { action } = await request.json();
		const jetNetService = await getGlobalJetNetService();

		switch (action) {
			case 'refresh_token':
				const refreshSuccess = await jetNetService.refreshToken();
				return NextResponse.json({
					success: refreshSuccess,
					message: refreshSuccess ? 'Token refreshed successfully' : 'Token refresh failed',
				});

			case 'force_health_check':
				const healthStatus = await jetNetService.forceHealthCheck();
				return NextResponse.json({
					success: true,
					data: healthStatus,
				});

			case 'get_metrics':
				const metrics = jetNetService.getMetrics();
				return NextResponse.json({
					success: true,
					data: metrics,
				});

			default:
				return NextResponse.json(
					{
						success: false,
						error:
							'Invalid action. Supported actions: refresh_token, force_health_check, get_metrics',
					},
					{ status: 400 }
				);
		}
	} catch (error) {
		console.error('❌ JetNet action failed:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}
