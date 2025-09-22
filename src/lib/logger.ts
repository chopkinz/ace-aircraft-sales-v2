import { NextRequest } from 'next/server';

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

export interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: string;
	service: string;
	requestId?: string;
	userId?: string;
	ip?: string;
	userAgent?: string;
	metadata?: Record<string, any>;
	error?: Error;
}

class Logger {
	private logLevel: LogLevel;
	private service: string;

	constructor(service: string = 'ace-aircraft') {
		this.service = service;
		this.logLevel = this.getLogLevel();
	}

	private getLogLevel(): LogLevel {
		const level = process.env.LOG_LEVEL?.toUpperCase();
		switch (level) {
			case 'DEBUG':
				return LogLevel.DEBUG;
			case 'INFO':
				return LogLevel.INFO;
			case 'WARN':
				return LogLevel.WARN;
			case 'ERROR':
				return LogLevel.ERROR;
			default:
				return process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
		}
	}

	private shouldLog(level: LogLevel): boolean {
		return level >= this.logLevel;
	}

	private formatLog(entry: LogEntry): string {
		const { level, message, timestamp, service, requestId, userId, ip, metadata, error } = entry;

		const levelStr = LogLevel[level];
		const baseLog = `[${timestamp}] ${levelStr} ${service}: ${message}`;

		const extras = [];
		if (requestId) extras.push(`reqId=${requestId}`);
		if (userId) extras.push(`userId=${userId}`);
		if (ip) extras.push(`ip=${ip}`);
		if (metadata && Object.keys(metadata).length > 0) {
			extras.push(`metadata=${JSON.stringify(metadata)}`);
		}
		if (error) {
			extras.push(`error=${error.message}`);
			if (error.stack) extras.push(`stack=${error.stack}`);
		}

		return extras.length > 0 ? `${baseLog} ${extras.join(' ')}` : baseLog;
	}

	private async writeLog(entry: LogEntry): Promise<void> {
		if (!this.shouldLog(entry.level)) return;

		const formattedLog = this.formatLog(entry);

		// Console output
		switch (entry.level) {
			case LogLevel.DEBUG:
				console.debug(formattedLog);
				break;
			case LogLevel.INFO:
				console.info(formattedLog);
				break;
			case LogLevel.WARN:
				console.warn(formattedLog);
				break;
			case LogLevel.ERROR:
				console.error(formattedLog);
				break;
		}

		// In production, you might want to send logs to external services
		if (process.env.NODE_ENV === 'production') {
			await this.sendToExternalService(entry);
		}
	}

	private async sendToExternalService(entry: LogEntry): Promise<void> {
		try {
			// Example: Send to Sentry for errors
			if (entry.level === LogLevel.ERROR && process.env.SENTRY_DSN) {
				// Sentry integration would go here
			}

			// Example: Send to external logging service
			if (process.env.LOG_ENDPOINT) {
				await fetch(process.env.LOG_ENDPOINT, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(entry),
				});
			}
		} catch (error) {
			// Don't let logging errors break the application
			console.error('Failed to send log to external service:', error);
		}
	}

	debug(message: string, metadata?: Record<string, any>): void {
		this.writeLog({
			level: LogLevel.DEBUG,
			message,
			timestamp: new Date().toISOString(),
			service: this.service,
			metadata,
		});
	}

	info(message: string, metadata?: Record<string, any>): void {
		this.writeLog({
			level: LogLevel.INFO,
			message,
			timestamp: new Date().toISOString(),
			service: this.service,
			metadata,
		});
	}

	warn(message: string, metadata?: Record<string, any>): void {
		this.writeLog({
			level: LogLevel.WARN,
			message,
			timestamp: new Date().toISOString(),
			service: this.service,
			metadata,
		});
	}

	error(message: string, error?: Error, metadata?: Record<string, any>): void {
		this.writeLog({
			level: LogLevel.ERROR,
			message,
			timestamp: new Date().toISOString(),
			service: this.service,
			error,
			metadata,
		});
	}

	// Request-specific logging
	logRequest(request: NextRequest, response?: Response, metadata?: Record<string, any>): void {
		const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
		const ip = this.getClientIP(request);
		const userAgent = request.headers.get('user-agent') || 'unknown';

		this.info('API Request', {
			requestId,
			method: request.method,
			url: request.url,
			ip,
			userAgent,
			statusCode: response?.status,
			duration: metadata?.duration,
			...metadata,
		});
	}

	logUserActivity(userId: string, action: string, metadata?: Record<string, any>): void {
		this.info('User Activity', {
			userId,
			action,
			...metadata,
		});
	}

	logSecurityEvent(event: string, request: NextRequest, metadata?: Record<string, any>): void {
		const ip = this.getClientIP(request);
		const userAgent = request.headers.get('user-agent') || 'unknown';

		this.warn('Security Event', {
			event,
			ip,
			userAgent,
			url: request.url,
			...metadata,
		});
	}

	logDatabaseQuery(query: string, duration: number, metadata?: Record<string, any>): void {
		this.debug('Database Query', {
			query: query.substring(0, 200), // Truncate long queries
			duration,
			...metadata,
		});
	}

	logApiCall(
		service: string,
		endpoint: string,
		duration: number,
		success: boolean,
		metadata?: Record<string, any>
	): void {
		const level = success ? LogLevel.INFO : LogLevel.WARN;
		const message = success ? 'API Call Success' : 'API Call Failed';

		this.writeLog({
			level,
			message,
			timestamp: new Date().toISOString(),
			service: this.service,
			metadata: {
				externalService: service,
				endpoint,
				duration,
				success,
				...metadata,
			},
		});
	}

	private getClientIP(request: NextRequest): string {
		const forwarded = request.headers.get('x-forwarded-for');
		const realIP = request.headers.get('x-real-ip');

		if (forwarded) {
			return forwarded.split(',')[0].trim();
		}

		if (realIP) {
			return realIP;
		}

		return 'unknown';
	}

	apiRequest(message: string, metadata?: Record<string, any>): void {
		this.info(message, metadata);
	}

	security(message: string, metadata?: Record<string, any>): void {
		this.warn(message, metadata);
	}
}

// Singleton logger instance
export const logger = new Logger();

// Request logging middleware
export function withRequestLogging(handler: (...args: unknown[]) => unknown) {
	return async function (request: NextRequest, ...args: unknown[]) {
		const startTime = Date.now();
		const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
		console.log(requestId);
		// Add request ID to headers
		request.headers.set('x-request-id', requestId);

		try {
			const response = await handler(request, ...args);
			const duration = Date.now() - startTime;

			logger.logRequest(request, response as Response, { duration });

			return response;
		} catch (error) {
			const duration = Date.now() - startTime;

			logger.error('Request Handler Error', error as Error, {
				requestId,
				method: request.method,
				url: request.url,
				duration,
			});

			throw error;
		}
	};
}

export default logger;
