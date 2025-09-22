import NodeCache from 'node-cache';
import { logger } from './logger';

// Cache configuration
const cacheConfig = {
	stdTTL: 300, // 5 minutes default TTL
	checkperiod: 120, // Check for expired keys every 2 minutes
	useClones: false, // Don't clone objects for better performance
	maxKeys: 10000, // Maximum number of keys
};

// Create cache instances for different data types
const aircraftCache = new NodeCache({
	...cacheConfig,
	stdTTL: 600, // 10 minutes for aircraft data
});

const marketDataCache = new NodeCache({
	...cacheConfig,
	stdTTL: 1800, // 30 minutes for market data
});

const userCache = new NodeCache({
	...cacheConfig,
	stdTTL: 900, // 15 minutes for user data
});

const apiCache = new NodeCache({
	...cacheConfig,
	stdTTL: 300, // 5 minutes for API responses
});

// Cache statistics
interface CacheStats {
	hits: number;
	misses: number;
	keys: number;
	size: number;
}

class CacheManager {
	private stats: Map<string, CacheStats> = new Map();
	private cacheInstances: Map<string, NodeCache> = new Map();

	constructor() {
		// Initialize cache instances
		this.cacheInstances.set('aircraft', aircraftCache);
		this.cacheInstances.set('market', marketDataCache);
		this.cacheInstances.set('user', userCache);
		this.cacheInstances.set('api', apiCache);

		// Initialize stats
		this.cacheInstances.forEach((_, name) => {
			this.stats.set(name, { hits: 0, misses: 0, keys: 0, size: 0 });
		});

		// Set up cache event listeners
		this.setupEventListeners();
	}

	private setupEventListeners() {
		this.cacheInstances.forEach((cache, name) => {
			cache.on('set', key => {
				const stats = this.stats.get(name)!;
				stats.keys++;
				stats.size += this.estimateSize(key);
				logger.debug(`Cache set: ${name}:${key}`);
			});

			cache.on('del', key => {
				const stats = this.stats.get(name)!;
				stats.keys--;
				stats.size -= this.estimateSize(key);
				logger.debug(`Cache delete: ${name}:${key}`);
			});

			cache.on('expired', key => {
				const stats = this.stats.get(name)!;
				stats.keys--;
				stats.size -= this.estimateSize(key);
				logger.debug(`Cache expired: ${name}:${key}`);
			});
		});
	}

	private estimateSize(key: string): number {
		// Rough estimation of key size in bytes
		return Buffer.byteLength(key, 'utf8');
	}

	// Generic cache operations
	get<T>(cacheName: string, key: string): T | undefined {
		const cache = this.cacheInstances.get(cacheName);
		if (!cache) {
			logger.warn(`Cache instance not found: ${cacheName}`);
			return undefined;
		}

		const value = cache.get<T>(key);
		const stats = this.stats.get(cacheName)!;

		if (value !== undefined) {
			stats.hits++;
			logger.debug(`Cache hit: ${cacheName}:${key}`);
		} else {
			stats.misses++;
			logger.debug(`Cache miss: ${cacheName}:${key}`);
		}

		return value;
	}

	set<T>(cacheName: string, key: string, value: T, ttl?: number): boolean {
		const cache = this.cacheInstances.get(cacheName);
		if (!cache) {
			logger.warn(`Cache instance not found: ${cacheName}`);
			return false;
		}

		const success = cache.set(key, value, ttl || 300);
		if (success) {
			logger.debug(`Cache set: ${cacheName}:${key}`, { ttl });
		} else {
			logger.warn(`Cache set failed: ${cacheName}:${key}`);
		}

		return success;
	}

	del(cacheName: string, key: string): number {
		const cache = this.cacheInstances.get(cacheName);
		if (!cache) {
			logger.warn(`Cache instance not found: ${cacheName}`);
			return 0;
		}

		const deleted = cache.del(key);
		logger.debug(`Cache delete: ${cacheName}:${key}`, { deleted });
		return deleted;
	}

	clear(cacheName: string): void {
		const cache = this.cacheInstances.get(cacheName);
		if (!cache) {
			logger.warn(`Cache instance not found: ${cacheName}`);
			return;
		}

		cache.flushAll();
		const stats = this.stats.get(cacheName)!;
		stats.keys = 0;
		stats.size = 0;
		logger.info(`Cache cleared: ${cacheName}`);
	}

	// Aircraft-specific cache operations
	getAircraft(key: string) {
		return this.get<any>('aircraft', key);
	}

	setAircraft(key: string, data: any, ttl?: number) {
		return this.set('aircraft', key, data, ttl);
	}

	// Market data-specific cache operations
	getMarketData(key: string) {
		return this.get<any>('market', key);
	}

	setMarketData(key: string, data: any, ttl?: number) {
		return this.set('market', key, data, ttl);
	}

	// User-specific cache operations
	getUser(key: string) {
		return this.get<any>('user', key);
	}

	setUser(key: string, data: any, ttl?: number) {
		return this.set('user', key, data, ttl);
	}

	// API response cache operations
	getApiResponse(key: string) {
		return this.get<any>('api', key);
	}

	setApiResponse(key: string, data: any, ttl?: number) {
		return this.set('api', key, data, ttl);
	}

	// Cache statistics
	getStats(cacheName?: string): Map<string, CacheStats> | CacheStats | undefined {
		if (cacheName) {
			return this.stats.get(cacheName);
		}
		return this.stats;
	}

	// Get all cache statistics
	getAllStats() {
		const allStats: Record<string, any> = {};

		this.cacheInstances.forEach((cache, name) => {
			const stats = this.stats.get(name)!;
			const cacheStats = cache.getStats();

			allStats[name] = {
				...stats,
				hitRate: stats.hits / (stats.hits + stats.misses) || 0,
				keys: cacheStats.keys,
				size: cacheStats.vsize,
				memoryUsage: (cacheStats as any).memsize || 0,
			};
		});

		return allStats;
	}

	// Cache warming
	async warmCache(cacheName: string, keys: string[], dataFetcher: (key: string) => Promise<any>) {
		logger.info(`Warming cache: ${cacheName}`, { keyCount: keys.length });

		const promises = keys.map(async key => {
			try {
				const data = await dataFetcher(key);
				this.set(cacheName, key, data);
				return { key, success: true };
			} catch (error) {
				logger.error(`Cache warming failed for key: ${key}`, error as Error);
				return { key, success: false, error };
			}
		});

		const results = await Promise.allSettled(promises);
		const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

		logger.info(`Cache warming completed: ${cacheName}`, {
			successful,
			total: keys.length,
			successRate: successful / keys.length,
		});

		return results;
	}

	// Cache invalidation patterns
	invalidatePattern(cacheName: string, pattern: RegExp) {
		const cache = this.cacheInstances.get(cacheName);
		if (!cache) return 0;

		const keys = cache.keys();
		const matchingKeys = keys.filter(key => pattern.test(key));

		matchingKeys.forEach(key => cache.del(key));

		logger.info(`Cache pattern invalidation: ${cacheName}`, {
			pattern: pattern.toString(),
			invalidated: matchingKeys.length,
		});

		return matchingKeys.length;
	}

	// Health check
	healthCheck() {
		const health = {
			status: 'healthy',
			caches: {} as Record<string, any>,
			timestamp: new Date().toISOString(),
		};

		this.cacheInstances.forEach((cache, name) => {
			const stats = cache.getStats();
			const cacheStats = this.stats.get(name)!;

			health.caches[name] = {
				keys: stats.keys,
				memoryUsage: (stats as any).memsize || 0,
				hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0,
				status: stats.keys > 0 ? 'active' : 'empty',
			};
		});

		return health;
	}
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Export cache instances for direct access if needed
export { aircraftCache, marketDataCache, userCache, apiCache };

// Cache decorator for functions
export function cached(cacheName: string, keyGenerator: (...args: any[]) => string, ttl?: number) {
	return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
		const method = descriptor.value;

		descriptor.value = async function (...args: any[]) {
			const key = keyGenerator(...args);
			const cached = cacheManager.get(cacheName, key);

			if (cached !== undefined) {
				logger.debug(`Cache hit for method: ${propertyName}`, { key });
				return cached;
			}

			const result = await method.apply(this, args);
			cacheManager.set(cacheName, key, result, ttl);
			logger.debug(`Cache set for method: ${propertyName}`, { key });

			return result;
		};

		return descriptor;
	};
}
