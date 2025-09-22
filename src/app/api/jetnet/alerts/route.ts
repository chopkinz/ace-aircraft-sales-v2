import { NextRequest, NextResponse } from 'next/server';
import { jetNetClient } from '@/lib/jetnet-client';
import { storageManager } from '@/lib/file-storage';

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const fresh = searchParams.get('fresh') === 'true';

		// Check cache first unless fresh data is requested
		if (!fresh) {
			const cacheKey = 'jetnet_alerts';
			const cachedAlerts = await storageManager.cache.getCache(cacheKey);

			if (cachedAlerts) {
				return NextResponse.json({
					success: true,
					data: cachedAlerts,
					metadata: {
						timestamp: new Date().toISOString(),
						source: 'Cache',
						cached: true,
					},
				});
			}
		}

		// Fetch alerts from JetNet
		const alerts = await jetNetClient.getAlerts();

		if (!alerts || alerts.length === 0) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: 'NO_ALERTS_AVAILABLE',
						message: 'No alerts available at this time.',
					},
					metadata: {
						timestamp: new Date().toISOString(),
						source: 'JetNet API',
					},
				},
				{ status: 404 }
			);
		}

		// Process and format alerts
		const formattedAlerts = alerts.map((alert: Record<string, unknown>) => ({
			id: alert.id || alert.alertId,
			type: alert.type || 'market',
			title: alert.title || alert.subject,
			message: alert.message || alert.description,
			timestamp: alert.timestamp || alert.createdAt || new Date().toISOString(),
			priority: alert.priority || 'medium',
		}));

		// Cache the results
		const cacheKey = 'jetnet_alerts';
		await storageManager.cache.setCache(cacheKey, formattedAlerts, 5 * 60 * 1000); // 5 minutes

		return NextResponse.json({
			success: true,
			data: formattedAlerts,
			metadata: {
				timestamp: new Date().toISOString(),
				source: 'JetNet API',
				cached: false,
				count: formattedAlerts.length,
			},
		});
	} catch (error) {
		console.error('JetNet alerts error:', error);

		return NextResponse.json(
			{
				success: false,
				error: {
					code: 'ALERTS_FETCH_FAILED',
					message: error instanceof Error ? error.message : 'Failed to fetch alerts',
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

// Mark alert as read
export async function PATCH(request: NextRequest) {
	try {
		const body = await request.json();
		const { alertId } = body;

		if (!alertId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: 'MISSING_ALERT_ID',
						message: 'Alert ID is required',
					},
				},
				{ status: 400 }
			);
		}

		// Mark alert as read in JetNet
		await jetNetClient.markAlertAsRead(alertId);

		return NextResponse.json({
			success: true,
			message: 'Alert marked as read',
			metadata: {
				timestamp: new Date().toISOString(),
				alertId,
			},
		});
	} catch (error) {
		console.error('Mark alert as read error:', error);

		return NextResponse.json(
			{
				success: false,
				error: {
					code: 'MARK_READ_FAILED',
					message: error instanceof Error ? error.message : 'Failed to mark alert as read',
				},
			},
			{ status: 500 }
		);
	}
}

// Support preflight requests
export async function OPTIONS(request: NextRequest) {
	return new NextResponse(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		},
	});
}
