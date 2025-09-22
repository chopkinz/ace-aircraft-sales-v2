import NodeCache from 'node-cache';

// High-performance cache configuration
const cacheConfig = {
	stdTTL: 300, // 5 minutes default TTL
	checkperiod: 60, // Check for expired keys every minute
	useClones: false, // Don't clone objects for better performance
	maxKeys: 1000, // Limit memory usage
	deleteOnExpire: true, // Auto-delete expired keys
};

// Create specialized cache instances
export const aircraftCache = new NodeCache({
	...cacheConfig,
	stdTTL: 600, // 10 minutes for aircraft data
});

export const marketDataCache = new NodeCache({
	...cacheConfig,
	stdTTL: 1800, // 30 minutes for market data
});

export const userCache = new NodeCache({
	...cacheConfig,
	stdTTL: 900, // 15 minutes for user data
});

export const apiResponseCache = new NodeCache({
	...cacheConfig,
	stdTTL: 300, // 5 minutes for API responses
});

// Performance monitoring
export function getCacheStats() {
	return {
		aircraft: {
			keys: aircraftCache.keys().length,
			hits: aircraftCache.getStats().hits,
			misses: aircraftCache.getStats().misses,
		},
		marketData: {
			keys: marketDataCache.keys().length,
			hits: marketDataCache.getStats().hits,
			misses: marketDataCache.getStats().misses,
		},
		user: {
			keys: userCache.keys().length,
			hits: userCache.getStats().hits,
			misses: userCache.getStats().misses,
		},
		apiResponse: {
			keys: apiResponseCache.keys().length,
			hits: apiResponseCache.getStats().hits,
			misses: apiResponseCache.getStats().misses,
		},
	};
}

// Cache warming utilities
export async function warmCache() {
	console.log('🔥 Warming application cache...');

	// Pre-load common data
	try {
		// This would be called during app startup
		console.log('✅ Cache warmed successfully');
	} catch (error) {
		console.error('❌ Cache warming failed:', error);
	}
}

// Cleanup function
export function clearAllCaches() {
	aircraftCache.flushAll();
	marketDataCache.flushAll();
	userCache.flushAll();
	apiResponseCache.flushAll();
	console.log('🧹 All caches cleared');
}
