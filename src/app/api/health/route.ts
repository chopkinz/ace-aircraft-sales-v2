import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/database';
import { cacheManager } from '@/lib/cache-manager';
import { logger } from '@/lib/logger';

export async function GET() {
	const startTime = Date.now();

	try {
		// Check database health
		const dbHealth = await checkDatabaseHealth();

		// Check cache health
		const cacheStats = await cacheManager.getStats();

		// Check external services
		const externalServices = await checkExternalServices();

		const duration = Date.now() - startTime;

		const healthStatus = {
			status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
			timestamp: new Date().toISOString(),
			duration,
			services: {
				database: dbHealth,
				cache: {
					status: cacheStats.type === 'redis' ? 'healthy' : 'degraded',
					type: cacheStats.type,
					size: cacheStats.size,
				},
				...externalServices,
			},
			version: process.env.npm_package_version || '2.0.0',
			environment: process.env.NODE_ENV || 'development',
		};

		// Log health check
		logger.info('Health check performed', {
			status: healthStatus.status,
			duration,
			dbStatus: dbHealth.status,
			cacheType: cacheStats.type,
		});

		const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

		return NextResponse.json(healthStatus, {
			status: statusCode,
			headers: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0',
			},
		});
	} catch (error) {
		const duration = Date.now() - startTime;

		logger.error('Health check failed', error as Error, { duration });

		return NextResponse.json(
			{
				status: 'unhealthy',
				timestamp: new Date().toISOString(),
				duration,
				error: error instanceof Error ? error.message : 'Unknown error',
				services: {
					database: { status: 'unknown', error: 'Health check failed' },
					cache: { status: 'unknown', error: 'Health check failed' },
				},
			},
			{
				status: 503,
				headers: {
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					Pragma: 'no-cache',
					Expires: '0',
				},
			}
		);
	}
}

async function checkExternalServices() {
	const services: Record<string, unknown> = {};

	// Check JetNet API
	try {
		const jetnetUrl = process.env.JETNET_BASE_URL;
		if (jetnetUrl) {
			// Test JetNet authentication instead of health endpoint
			const jetnetResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/jetnet/auth`, {
				method: 'POST',
				timeout: 5000,
			} as RequestInit);
			const jetnetData = await jetnetResponse.json();
			services.jetnet = {
				status: jetnetData.success ? 'healthy' : 'unhealthy',
				responseTime: Date.now(),
			};
		} else {
			services.jetnet = { status: 'not_configured' };
		}
	} catch (error) {
		services.jetnet = {
			status: 'unhealthy',
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}

	// Check GoHighLevel API
	try {
		const ghlUrl = process.env.GHL_BASE_URL;
		if (ghlUrl) {
			const response = await fetch(`${ghlUrl}/health`, {
				method: 'GET',
				timeout: 5000,
			} as RequestInit);
			services.ghl = {
				status: response.ok ? 'healthy' : 'unhealthy',
				responseTime: Date.now(),
			};
		} else {
			services.ghl = { status: 'not_configured' };
		}
	} catch (error) {
		services.ghl = {
			status: 'unhealthy',
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}

	return services;
}
