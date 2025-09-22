import { JetNetService, JetNetServiceConfig } from './jetnet-service';

// Global service instance
let globalJetNetService: JetNetService | null = null;
let initializationPromise: Promise<JetNetService> | null = null;

/**
 * Get or initialize the global JetNet service
 */
export async function getGlobalJetNetService(): Promise<JetNetService> {
	console.log(
		'🔍 getGlobalJetNetService called - globalJetNetService:',
		!!globalJetNetService,
		'initializationPromise:',
		!!initializationPromise
	);

	// If already initialized, return it
	if (globalJetNetService) {
		console.log('✅ Returning existing global JetNet service');
		return globalJetNetService;
	}

	// If initialization is in progress, wait for it
	if (initializationPromise) {
		console.log('⏳ Waiting for existing initialization promise');
		return await initializationPromise;
	}

	// Start initialization
	console.log('🚀 Starting new JetNet service initialization');
	initializationPromise = initializeGlobalJetNetService();

	try {
		globalJetNetService = await initializationPromise;
		console.log('✅ Global JetNet service initialized and stored');
		return globalJetNetService;
	} catch (error) {
		// Reset on failure
		console.error('❌ Failed to initialize global JetNet service:', error);
		initializationPromise = null;
		throw error;
	}
}

/**
 * Initialize the global JetNet service
 */
async function initializeGlobalJetNetService(): Promise<JetNetService> {
	console.log('🚀 Initializing Global JetNet Service...');

	const config: JetNetServiceConfig = {
		credentials: {
			username: process.env.JETNET_EMAIL!,
			password: process.env.JETNET_PASSWORD!,
			baseUrl: process.env.JETNET_BASE_URL!,
		},
		encryptionKey: process.env.TOKEN_ENCRYPTION_KEY!,
		monitoring: {
			enabled: true,
			intervalMs: 300000, // 5 minutes
		},
		scheduler: {
			enabled: true,
		},
	};

	const service = new JetNetService(config);
	await service.initialize();

	console.log('✅ Global JetNet Service initialized successfully');
	return service;
}

/**
 * Force re-initialization of the global service
 */
export async function reinitializeGlobalJetNetService(): Promise<JetNetService> {
	console.log('🔄 Re-initializing Global JetNet Service...');

	// Clean up existing service
	if (globalJetNetService) {
		try {
			await globalJetNetService.shutdown();
		} catch (error) {
			console.warn('⚠️ Error during service shutdown:', error);
		}
	}

	// Reset state
	globalJetNetService = null;
	initializationPromise = null;

	// Initialize fresh
	return await getGlobalJetNetService();
}

/**
 * Check if the global service is initialized
 */
export function isGlobalJetNetServiceInitialized(): boolean {
	return globalJetNetService !== null;
}

/**
 * Get the global service without initialization (may return null)
 */
export function getGlobalJetNetServiceSync(): JetNetService | null {
	return globalJetNetService;
}
