import { JetNetAuthManager, AuthMetrics } from './jetnet-auth-manager';
import { TokenScheduler } from './token-scheduler';
import { JetNetAPIClient } from './jetnet-api-client';

export interface HealthStatus {
	overall: 'healthy' | 'degraded' | 'unhealthy';
	jetnetApi: 'connected' | 'disconnected' | 'error';
	authentication: 'valid' | 'expired' | 'error';
	tokenScheduler: 'running' | 'stopped' | 'error';
	lastCheck: Date;
	details: {
		tokenMetadata: any;
		authMetrics: any;
		schedulerStatus: any;
		apiConnectivity: boolean;
	};
}

export interface AlertConfig {
	emailEnabled: boolean;
	emailRecipients: string[];
	smsEnabled: boolean;
	smsRecipients: string[];
	webhookUrl?: string;
	alertThresholds: {
		tokenExpiryMinutes: number;
		authFailureCount: number;
		apiErrorRate: number;
	};
}

export class JetNetMonitoringSystem {
	private healthCheckInterval: NodeJS.Timeout | null = null;
	private alertConfig: AlertConfig;
	private lastHealthStatus: HealthStatus | null = null;
	private consecutiveFailures: number = 0;
	private maxConsecutiveFailures: number = 3;

	constructor(
		private authManager: JetNetAuthManager,
		private tokenScheduler: TokenScheduler,
		private apiClient: JetNetAPIClient,
		alertConfig?: Partial<AlertConfig>
	) {
		this.alertConfig = {
			emailEnabled: true,
			emailRecipients: ['douglas@aceaircraft.com'], // Douglas Young's email
			smsEnabled: true,
			smsRecipients: ['+1234567890'], // Douglas's phone
			webhookUrl: process.env.GHL_WEBHOOK_URL,
			alertThresholds: {
				tokenExpiryMinutes: 30, // Alert when token expires in 30 minutes
				authFailureCount: 3, // Alert after 3 consecutive failures
				apiErrorRate: 0.1, // Alert if error rate > 10%
			},
			...alertConfig,
		};
	}

	/**
	 * Start monitoring the JetNet authentication system
	 */
	startMonitoring(intervalMs: number = 60000): void {
		if (this.healthCheckInterval) {
			console.warn('⚠️ Monitoring is already running');
			return;
		}

		console.log('🏥 Starting JetNet authentication monitoring');
		this.healthCheckInterval = setInterval(async () => {
			await this.performHealthCheck();
		}, intervalMs);

		// Perform initial health check
		this.performHealthCheck();
	}

	/**
	 * Stop monitoring
	 */
	stopMonitoring(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = null;
			console.log('⏹️ Stopped JetNet authentication monitoring');
		}
	}

	/**
	 * Perform comprehensive health check
	 */
	async performHealthCheck(): Promise<HealthStatus> {
		const startTime = Date.now();
		console.log('🏥 Performing JetNet authentication health check...');

		try {
			const healthStatus = await this.checkSystemHealth();
			this.lastHealthStatus = healthStatus;

			// Check for alerts
			await this.checkAlerts(healthStatus);

			// Reset failure counter on success
			this.consecutiveFailures = 0;

			const duration = Date.now() - startTime;
			console.log(`✅ Health check completed in ${duration}ms - Status: ${healthStatus.overall}`);

			return healthStatus;
		} catch (error) {
			this.consecutiveFailures++;
			console.error('❌ Health check failed:', error);

			const degradedStatus: HealthStatus = {
				overall: 'unhealthy',
				jetnetApi: 'error',
				authentication: 'error',
				tokenScheduler: 'error',
				lastCheck: new Date(),
				details: {
					tokenMetadata: null,
					authMetrics: null,
					schedulerStatus: null,
					apiConnectivity: false,
				},
			};

			// Send critical alert
			await this.sendCriticalAlert(error);

			return degradedStatus;
		}
	}

	/**
	 * Check overall system health
	 */
	private async checkSystemHealth(): Promise<HealthStatus> {
		const checks = await Promise.allSettled([
			this.checkAuthentication(),
			this.checkTokenScheduler(),
			this.checkApiConnectivity(),
		]);

		const [authResult, schedulerResult, apiResult] = checks;

		// Determine overall health
		const authHealthy = authResult.status === 'fulfilled' && authResult.value;
		const schedulerHealthy = schedulerResult.status === 'fulfilled' && schedulerResult.value;
		const apiHealthy = apiResult.status === 'fulfilled' && apiResult.value;

		let overall: 'healthy' | 'degraded' | 'unhealthy';
		if (authHealthy && schedulerHealthy && apiHealthy) {
			overall = 'healthy';
		} else if (authHealthy || schedulerHealthy || apiHealthy) {
			overall = 'degraded';
		} else {
			overall = 'unhealthy';
		}

		return {
			overall,
			jetnetApi: apiHealthy ? 'connected' : 'disconnected',
			authentication: authHealthy ? 'valid' : 'expired',
			tokenScheduler: schedulerHealthy ? 'running' : 'stopped',
			lastCheck: new Date(),
			details: {
				tokenMetadata: this.authManager.getTokenMetadata(),
				authMetrics: this.authManager.getMetrics(),
				schedulerStatus: this.tokenScheduler.getStatus(),
				apiConnectivity: apiHealthy,
			},
		};
	}

	/**
	 * Check authentication status
	 */
	private async checkAuthentication(): Promise<boolean> {
		try {
			const isValid = await this.authManager.validateToken();
			const metadata = this.authManager.getTokenMetadata();

			// Check if token is expiring soon
			const timeUntilExpiry = metadata.timeUntilExpiry;
			const expiryThreshold = this.alertConfig.alertThresholds.tokenExpiryMinutes * 60 * 1000;

			if (timeUntilExpiry <= expiryThreshold && timeUntilExpiry > 0) {
				console.warn(`⚠️ Token expires in ${Math.round(timeUntilExpiry / 1000)}s`);
			}

			return isValid && timeUntilExpiry > 0;
		} catch (error) {
			console.error('❌ Authentication check failed:', error);
			return false;
		}
	}

	/**
	 * Check token scheduler status
	 */
	private async checkTokenScheduler(): Promise<boolean> {
		try {
			const status = this.tokenScheduler.getStatus();
			return status.isRunning && status.nextRefreshScheduled;
		} catch (error) {
			console.error('❌ Token scheduler check failed:', error);
			return false;
		}
	}

	/**
	 * Check API connectivity
	 */
	private async checkApiConnectivity(): Promise<boolean> {
		try {
			const authStatus = await this.apiClient.getAuthStatus();
			return authStatus.isAuthenticated;
		} catch (error) {
			console.error('❌ API connectivity check failed:', error);
			return false;
		}
	}

	/**
	 * Check for alert conditions
	 */
	private async checkAlerts(healthStatus: HealthStatus): Promise<void> {
		const alerts: string[] = [];

		// Check token expiry
		const tokenMetadata = healthStatus.details.tokenMetadata;
		if (tokenMetadata && tokenMetadata.timeUntilExpiry <= this.alertConfig.alertThresholds.tokenExpiryMinutes * 60 * 1000) {
			alerts.push(`Token expires in ${Math.round(tokenMetadata.timeUntilExpiry / 1000)}s`);
		}

		// Check authentication failures
		const authMetrics = healthStatus.details.authMetrics;
		if (authMetrics && authMetrics.authFailureCount >= this.alertConfig.alertThresholds.authFailureCount) {
			alerts.push(`${authMetrics.authFailureCount} consecutive authentication failures`);
		}

		// Check overall health
		if (healthStatus.overall === 'unhealthy') {
			alerts.push('JetNet authentication system is unhealthy');
		} else if (healthStatus.overall === 'degraded') {
			alerts.push('JetNet authentication system is degraded');
		}

		// Send alerts if any conditions are met
		if (alerts.length > 0) {
			await this.sendAlerts(alerts, healthStatus);
		}
	}

	/**
	 * Send alerts via configured channels
	 */
	private async sendAlerts(alerts: string[], healthStatus: HealthStatus): Promise<void> {
		const alertMessage = `🚨 JetNet Authentication Alert\n\n${alerts.join('\n')}\n\nStatus: ${healthStatus.overall}\nTime: ${new Date().toISOString()}`;

		console.warn('🚨 Sending JetNet authentication alerts:', alerts);

		// Send email alerts
		if (this.alertConfig.emailEnabled) {
			await this.sendEmailAlert(alertMessage, 'high');
		}

		// Send SMS alerts
		if (this.alertConfig.smsEnabled) {
			await this.sendSMSAlert(alertMessage);
		}

		// Send webhook alerts
		if (this.alertConfig.webhookUrl) {
			await this.sendWebhookAlert(healthStatus, alerts, 'high');
		}
	}

	/**
	 * Send critical alert for system failures
	 */
	private async sendCriticalAlert(error: any): Promise<void> {
		const criticalMessage = `🚨 CRITICAL: JetNet Authentication System Failure\n\nError: ${error.message}\nTime: ${new Date().toISOString()}\nConsecutive Failures: ${this.consecutiveFailures}`;

		console.error('🚨 CRITICAL ALERT:', criticalMessage);

		// Send immediate alerts for critical failures
		if (this.alertConfig.emailEnabled) {
			await this.sendEmailAlert(criticalMessage, 'critical');
		}

		if (this.alertConfig.smsEnabled) {
			await this.sendSMSAlert(criticalMessage);
		}

		if (this.alertConfig.webhookUrl) {
			await this.sendWebhookAlert(null, [criticalMessage], 'critical');
		}
	}

	/**
	 * Send email alert
	 */
	private async sendEmailAlert(message: string, priority: string = 'normal'): Promise<void> {
		try {
			// TODO: Implement email sending via SMTP or email service
			console.log(`📧 Email alert (${priority}): ${message}`);
		} catch (error) {
			console.error('❌ Failed to send email alert:', error);
		}
	}

	/**
	 * Send SMS alert
	 */
	private async sendSMSAlert(message: string): Promise<void> {
		try {
			// TODO: Implement SMS sending via SMS service
			console.log(`📱 SMS alert: ${message}`);
		} catch (error) {
			console.error('❌ Failed to send SMS alert:', error);
		}
	}

	/**
	 * Send webhook alert to GoHighLevel
	 */
	private async sendWebhookAlert(
		healthStatus: HealthStatus | null,
		alerts: string[],
		priority: string = 'normal'
	): Promise<void> {
		try {
			if (!this.alertConfig.webhookUrl) {
				return;
			}

			const webhookPayload = {
				type: 'jetnet_auth_alert',
				priority,
				alerts,
				healthStatus,
				timestamp: new Date().toISOString(),
				metadata: {
					source: 'ace-aircraft-monitoring',
					version: '1.0.0',
					environment: process.env.NODE_ENV || 'development',
				},
			};

			const response = await fetch(this.alertConfig.webhookUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(webhookPayload),
			});

			if (!response.ok) {
				throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
			}

			console.log(`🔗 Webhook alert sent (${priority}): ${alerts.length} alerts`);
		} catch (error) {
			console.error('❌ Failed to send webhook alert:', error);
		}
	}

	/**
	 * Get current health status
	 */
	getHealthStatus(): HealthStatus | null {
		return this.lastHealthStatus;
	}

	/**
	 * Get monitoring metrics
	 */
	getMetrics(): {
		healthStatus: HealthStatus | null;
		consecutiveFailures: number;
		alertConfig: AlertConfig;
	} {
		return {
			healthStatus: this.lastHealthStatus,
			consecutiveFailures: this.consecutiveFailures,
			alertConfig: this.alertConfig,
		};
	}

	/**
	 * Update alert configuration
	 */
	updateAlertConfig(newConfig: Partial<AlertConfig>): void {
		this.alertConfig = { ...this.alertConfig, ...newConfig };
		console.log('⚙️ Updated alert configuration');
	}

	/**
	 * Force health check
	 */
	async forceHealthCheck(): Promise<HealthStatus> {
		console.log('🔄 Forcing health check...');
		return await this.performHealthCheck();
	}
}
