import { initializeJetNetService, JetNetServiceConfig } from '@/lib/jetnet-service';

// JetNet service configuration
const jetNetConfig: JetNetServiceConfig = {
	credentials: {
		username: process.env.JETNET_EMAIL || '',
		password: process.env.JETNET_PASSWORD || '',
		baseUrl: process.env.JETNET_BASE_URL || 'https://api.jetnet.com',
		clientId: process.env.JETNET_CLIENT_ID,
		clientSecret: process.env.JETNET_CLIENT_SECRET,
	},
	encryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
	monitoring: {
		enabled: true,
		intervalMs: 60000, // 1 minute
		alertConfig: {
			emailEnabled: process.env.ALERT_EMAIL_ENABLED === 'true',
			emailRecipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
			smsEnabled: process.env.ALERT_SMS_ENABLED === 'true',
			smsRecipients: process.env.ALERT_SMS_RECIPIENTS?.split(',') || [],
			webhookUrl: process.env.ALERT_WEBHOOK_URL,
			alertThresholds: {
				tokenExpiryMinutes: parseInt(process.env.TOKEN_EXPIRY_THRESHOLD_MINUTES || '30'),
				authFailureCount: parseInt(process.env.AUTH_FAILURE_THRESHOLD || '3'),
				apiErrorRate: parseFloat(process.env.API_ERROR_RATE_THRESHOLD || '0.1'),
			},
		},
	},
	scheduler: {
		enabled: true,
	},
};

// Initialize JetNet service
let jetNetService: any = null;

export async function initializeJetNet() {
	try {
		console.log('🚀 Initializing JetNet service...');

		// Validate required environment variables
		if (!process.env.JETNET_EMAIL || !process.env.JETNET_PASSWORD) {
			throw new Error('Missing required JetNet credentials in environment variables');
		}

		jetNetService = await initializeJetNetService(jetNetConfig);
		console.log('✅ JetNet service initialized successfully');

		return jetNetService;
	} catch (error) {
		console.error('❌ Failed to initialize JetNet service:', error);
		throw error;
	}
}

// Graceful shutdown
export async function shutdownJetNet() {
	if (jetNetService) {
		console.log('🛑 Shutting down JetNet service...');
		await jetNetService.shutdown();
		jetNetService = null;
		console.log('✅ JetNet service shutdown complete');
	}
}

// Handle process termination
process.on('SIGINT', async () => {
	console.log('🛑 Received SIGINT, shutting down gracefully...');
	await shutdownJetNet();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	console.log('🛑 Received SIGTERM, shutting down gracefully...');
	await shutdownJetNet();
	process.exit(0);
});

// Export the service instance getter
export function getJetNetServiceInstance() {
	return jetNetService;
}
