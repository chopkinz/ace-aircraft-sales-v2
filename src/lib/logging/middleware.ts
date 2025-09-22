/**
 * API Request/Response Logging Middleware
 * Logs all API requests and responses with performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { log } from '../logging/logger';

export function withApiLogging<T extends (...args: any[]) => Promise<NextResponse>>(handler: T): T {
	return (async (...args: any[]) => {
		const request = args[0] as NextRequest;
		const startTime = Date.now();

		// Extract request information
		const method = request.method;
		const url = request.url;
		const userAgent = request.headers.get('user-agent') || 'unknown';
		const ip =
			request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

		// Generate request ID for tracking
		const requestId = crypto.randomUUID();

		// Log incoming request
		log.info(`API Request: ${method} ${url}`, {
			requestId,
			component: 'api',
			action: 'request_start',
			metadata: {
				method,
				url,
				userAgent,
				ip,
			},
		});

		try {
			// Execute the handler
			const response = await handler(...args);

			// Calculate duration
			const duration = Date.now() - startTime;

			// Log successful response
			log.info(`API Response: ${method} ${url} - ${response.status}`, {
				requestId,
				component: 'api',
				action: 'request_complete',
				metadata: {
					statusCode: response.status,
					duration,
				},
			});

			// Create new response with additional headers
			const newResponse = new NextResponse(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: response.headers,
			});
			newResponse.headers.set('x-request-id', requestId);

			return newResponse;
		} catch (error) {
			const duration = Date.now() - startTime;

			// Log error
			log.error(
				`API Error: ${method} ${url}`,
				{
					requestId,
					component: 'api',
					action: 'request_error',
					metadata: {
						duration,
					},
				},
				error as Error
			);

			// Re-throw the error
			throw error;
		}
	}) as T;
}

/**
 * Database Query Logging Wrapper
 */
export function withDatabaseLogging<T extends (...args: any[]) => Promise<any>>(
	queryFn: T,
	queryName: string
): T {
	return (async (...args: any[]) => {
		const startTime = Date.now();

		try {
			const result = await queryFn(...args);
			const duration = Date.now() - startTime;

			// Determine row count based on result type
			let rowCount: number | undefined;
			if (Array.isArray(result)) {
				rowCount = result.length;
			} else if (result && typeof result === 'object' && 'count' in result) {
				rowCount = result.count;
			} else if (result && typeof result === 'object' && 'length' in result) {
				rowCount = result.length;
			}

			log.info(`Database Query: ${queryName} (${duration}ms, ${rowCount || 0} rows)`);

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;

			log.error(`Database Query Error: ${queryName} (${duration}ms)`, undefined, error as Error);

			throw error;
		}
	}) as T;
}

/**
 * Performance Monitoring Wrapper
 */
export function withPerformanceLogging<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	operationName: string
): T {
	return (async (...args: any[]) => {
		const startTime = Date.now();

		log.debug(`Performance Start: ${operationName}`, {
			component: 'performance',
			action: 'operation_start',
			metadata: { operationName },
		});

		try {
			const result = await fn(...args);
			const duration = Date.now() - startTime;

			log.performance(operationName, duration, {
				component: 'performance',
				action: 'operation_complete',
				metadata: { operationName },
			});

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;

			log.error(
				`Performance Error: ${operationName}`,
				{
					component: 'performance',
					action: 'operation_error',
					metadata: { operationName, duration },
				},
				error as Error
			);

			throw error;
		}
	}) as T;
}

/**
 * User Action Logging Wrapper
 */
export function withUserActionLogging<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	actionName: string,
	getUserId?: (...args: any[]) => string
): T {
	return (async (...args: any[]) => {
		const userId = getUserId ? getUserId(...args) : 'anonymous';

		log.userAction(actionName, userId, {
			component: 'user_action',
			action: 'action_start',
			metadata: { actionName },
		});

		try {
			const result = await fn(...args);

			log.userAction(`${actionName}_success`, userId, {
				component: 'user_action',
				action: 'action_complete',
				metadata: { actionName },
			});

			return result;
		} catch (error) {
			log.userAction(`${actionName}_error`, userId, {
				component: 'user_action',
				action: 'action_error',
				metadata: { actionName },
			});

			throw error;
		}
	}) as T;
}

export default {
	withApiLogging,
	withDatabaseLogging,
	withPerformanceLogging,
	withUserActionLogging,
};
