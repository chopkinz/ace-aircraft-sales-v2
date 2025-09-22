import { JetNetAuthManager, JetNetCredentials, AuthMetrics } from './jetnet-auth-manager';
import { JetNetWebhookAuthManager } from './jetnet-webhook-auth';
import { JetNetAPIClient } from './jetnet-api-client';
import { FallbackJetNetAPIClient } from './fallback-jetnet-api';
import { TokenScheduler } from './token-scheduler';
import { JetNetMonitoringSystem, HealthStatus, AlertConfig } from './jetnet-monitoring';
import { PrismaClient } from '@prisma/client';

export interface JetNetServiceConfig {
	credentials: JetNetCredentials;
	encryptionKey?: string;
	monitoring?: {
		enabled: boolean;
		intervalMs?: number;
		alertConfig?: Partial<AlertConfig>;
	};
	scheduler?: {
		enabled: boolean;
	};
}

export class JetNetService {
	private prisma: PrismaClient;
	private authManager: JetNetAuthManager | JetNetWebhookAuthManager;
	private apiClient: JetNetAPIClient;
	private tokenScheduler: TokenScheduler;
	private monitoringSystem: JetNetMonitoringSystem | null = null;
	private isInitialized: boolean = false;
	private config: JetNetServiceConfig;

	constructor(config: JetNetServiceConfig) {
		this.config = config;
		this.prisma = new PrismaClient();

		// Use webhook authentication by default
		this.authManager = new JetNetWebhookAuthManager({
			webhookUrl: process.env.N8N_WEBHOOK_URL || 'https://autom8god.app.n8n.cloud/webhook/d9d8af7b-7238-4879-8267-84a105112628',
			testWebhookUrl: process.env.N8N_TEST_WEBHOOK_URL,
			useTestMode: false, // Always use production webhook
		});

		this.apiClient = new JetNetAPIClient(config.credentials, this.authManager);
		this.tokenScheduler = new TokenScheduler(this.authManager as JetNetAuthManager);

		// Initialize monitoring if enabled
		if (config.monitoring?.enabled) {
			this.monitoringSystem = new JetNetMonitoringSystem(
				this.authManager as JetNetAuthManager,
				this.tokenScheduler,
				this.apiClient,
				config.monitoring.alertConfig
			);
		}
	}

	/**
	 * Initialize the JetNet service
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			console.warn('⚠️ JetNet service is already initialized');
			return;
		}

		console.log('🚀 Initializing JetNet Service...');

		try {
			// Initialize API client
			await this.apiClient.initialize();

			// Start token scheduler if enabled
			if (this.config.scheduler?.enabled !== false) {
				this.tokenScheduler.startProactiveRefresh();
				console.log('✅ Token scheduler started');
			}

			// Start monitoring if enabled
			if (this.config.monitoring?.enabled && this.monitoringSystem) {
				this.monitoringSystem.startMonitoring(this.config.monitoring.intervalMs);
				console.log('✅ Monitoring system started');
			}

			this.isInitialized = true;
			console.log('✅ JetNet service initialized successfully');
		} catch (error) {
			console.error('❌ Failed to initialize JetNet service:', error);
			throw error;
		}
	}

	/**
	 * Shutdown the JetNet service
	 */
	async shutdown(): Promise<void> {
		console.log('🛑 Shutting down JetNet service...');

		try {
			// Stop monitoring
			if (this.monitoringSystem) {
				this.monitoringSystem.stopMonitoring();
			}

			// Stop token scheduler
			this.tokenScheduler.stopRefresh();

			// Cleanup API client
			await this.apiClient.cleanup();

			// Cleanup auth manager
			await this.authManager.cleanup();

			// Close database connection
			await this.prisma.$disconnect();

			this.isInitialized = false;
			console.log('✅ JetNet service shutdown complete');
		} catch (error) {
			console.error('❌ Error during JetNet service shutdown:', error);
		}
	}

	/**
	 * Get the API client for making requests
	 */
	getAPIClient(): JetNetAPIClient {
		if (!this.isInitialized) {
			throw new Error('JetNet service not initialized. Call initialize() first.');
		}
		return this.apiClient;
	}

	/**
	 * Get the auth manager
	 */
	getAuthManager(): JetNetAuthManager {
		return this.authManager;
	}

	/**
	 * Get the token scheduler
	 */
	getTokenScheduler(): TokenScheduler {
		return this.tokenScheduler;
	}

	/**
	 * Get the monitoring system
	 */
	getMonitoringSystem(): JetNetMonitoringSystem | null {
		return this.monitoringSystem;
	}

	/**
	 * Get comprehensive health status
	 */
	async getHealthStatus(): Promise<{
		service: 'initialized' | 'not_initialized';
		auth: any;
		scheduler: any;
		monitoring: any;
		overall: HealthStatus | null;
	}> {
		const authStatus = await this.apiClient.getAuthStatus();
		const schedulerStatus = this.tokenScheduler.getStatus();
		const monitoringStatus = this.monitoringSystem?.getHealthStatus() || null;

		return {
			service: this.isInitialized ? 'initialized' : 'not_initialized',
			auth: authStatus,
			scheduler: schedulerStatus,
			monitoring: monitoringStatus,
			overall: monitoringStatus,
		};
	}

	/**
	 * Force token refresh
	 */
	async refreshToken(): Promise<boolean> {
		try {
			await this.authManager.getValidToken();
			return true;
		} catch (error) {
			console.error('❌ Token refresh failed:', error);
			return false;
		}
	}

	/**
	 * Force health check
	 */
	async forceHealthCheck(): Promise<HealthStatus | null> {
		if (this.monitoringSystem) {
			return await this.monitoringSystem.forceHealthCheck();
		}
		return null;
	}

	/**
	 * Get comprehensive metrics
	 */
	getMetrics(): {
		auth: AuthMetrics;
		scheduler: any;
		monitoring: any;
	} {
		return {
			auth: this.authManager.getMetrics(),
			scheduler: this.tokenScheduler.getMetrics(),
			monitoring: this.monitoringSystem?.getMetrics() || null,
		};
	}

	/**
	 * Update service configuration
	 */
	updateConfig(newConfig: Partial<JetNetServiceConfig>): void {
		this.config = { ...this.config, ...newConfig };
		console.log('⚙️ Updated JetNet service configuration');
	}

	/**
	 * Check if service is ready
	 */
	isReady(): boolean {
		return this.isInitialized;
	}
}

// Singleton instance for global access
let jetNetServiceInstance: JetNetService | null = null;

/**
 * Ensure JetNet service is initialized and return it
 */
export async function ensureJetNetService(): Promise<JetNetService> {
	if (!jetNetServiceInstance) {
		console.log('🔄 JetNet service not initialized, initializing now...');

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

		jetNetServiceInstance = await initializeJetNetService(config);
	}

	return jetNetServiceInstance;
}

/**
 * Get the global JetNet service instance
 */
export function getJetNetService(): JetNetService {
	if (!jetNetServiceInstance) {
		throw new Error('JetNet service not initialized. Call initializeJetNetService() first.');
	}
	return jetNetServiceInstance;
}

/**
 * Initialize the global JetNet service
 */
export async function initializeJetNetService(config: JetNetServiceConfig): Promise<JetNetService> {
	if (jetNetServiceInstance) {
		console.warn('⚠️ JetNet service already initialized');
		return jetNetServiceInstance;
	}

	jetNetServiceInstance = new JetNetService(config);
	await jetNetServiceInstance.initialize();
	return jetNetServiceInstance;
}

/**
 * Shutdown the global JetNet service
 */
export async function shutdownJetNetService(): Promise<void> {
	if (jetNetServiceInstance) {
		await jetNetServiceInstance.shutdown();
		jetNetServiceInstance = null;
	}
}
