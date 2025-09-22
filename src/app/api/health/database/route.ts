import { NextRequest } from 'next/server';
import {
	withErrorHandling,
	createSuccessResponse,
	logRequest,
	ApiError,
	ApiErrorType,
} from '@/lib/api/error-handling';
import { queryMonitor, dbConnectionManager } from '@/lib/db/optimized-queries';
import { checkDatabaseHealth } from '@/lib/database';

export const GET = withErrorHandling(async (request: NextRequest) => {
	const requestId = Math.random().toString(36).substring(2, 15);
	logRequest(request, requestId);

	try {
		// Check database health
		const dbHealth = await checkDatabaseHealth();

		// Get query performance metrics
		const queryMetrics = queryMonitor.getMetrics();
		const averageQueryTime = queryMonitor.getAverageQueryTime();
		const slowQueries = queryMonitor.getSlowQueries(1000);

		// Get connection stats
		const connectionStats = dbConnectionManager.getConnectionStats();

		const healthData = {
			database: dbHealth,
			performance: {
				totalQueries: queryMetrics.length,
				averageQueryTime: Math.round(averageQueryTime),
				slowQueries: slowQueries.length,
				recentSlowQueries: slowQueries.slice(-5).map(q => ({
					query: q.query,
					duration: q.duration,
					timestamp: q.timestamp,
					error: q.error,
				})),
			},
			connections: connectionStats,
			timestamp: new Date().toISOString(),
		};

		return createSuccessResponse(healthData, 'Database health check completed', requestId);
	} catch (error) {
		console.error(`[${requestId}] Database health check failed:`, error);

		const errorHealthData = {
			database: {
				status: 'unhealthy',
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
			},
			performance: {
				totalQueries: 0,
				averageQueryTime: 0,
				slowQueries: 0,
				recentSlowQueries: [],
			},
			connections: {
				activeConnections: 0,
				maxConnections: 10,
				availableConnections: 10,
			},
			timestamp: new Date().toISOString(),
		};

		return createSuccessResponse(
			errorHealthData,
			'Database health check completed with errors',
			requestId
		);
	}
});
