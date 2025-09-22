/**
 * Logging Configuration for ACE Aircraft Intelligence
 */

export interface LoggingConfig {
	level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
	enableConsole: boolean;
	enableExternalService: boolean;
	externalServiceUrl?: string;
	externalServiceToken?: string;
	enablePerformanceLogging: boolean;
	enableUserActionLogging: boolean;
	enableApiRequestLogging: boolean;
	enableDatabaseQueryLogging: boolean;
	enableSecurityLogging: boolean;
	maxLogEntries: number;
	flushInterval: number; // in milliseconds
}

export const defaultLoggingConfig: LoggingConfig = {
	level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
	enableConsole: true,
	enableExternalService: process.env.NODE_ENV === 'production',
	externalServiceUrl: process.env.NEXT_PUBLIC_LOGGING_SERVICE_URL,
	externalServiceToken: process.env.LOGGING_SERVICE_TOKEN,
	enablePerformanceLogging: true,
	enableUserActionLogging: true,
	enableApiRequestLogging: true,
	enableDatabaseQueryLogging: process.env.NODE_ENV === 'development',
	enableSecurityLogging: true,
	maxLogEntries: 1000,
	flushInterval: 30000, // 30 seconds
};

export const getLoggingConfig = (): LoggingConfig => {
	return {
		...defaultLoggingConfig,
		// Override with environment variables if present
		level: (process.env.LOG_LEVEL as LoggingConfig['level']) || defaultLoggingConfig.level,
		enableConsole: process.env.DISABLE_CONSOLE_LOGGING !== 'true',
		enableExternalService: process.env.ENABLE_EXTERNAL_LOGGING === 'true',
	};
};
