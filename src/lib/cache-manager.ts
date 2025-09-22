let Redis: any = null;
try {
	Redis = require('ioredis').default;
} catch (error) {
	// Redis is optional
}

class CacheManager {
	private redis: Redis | null = null;
	private memoryCache = new Map<string, { value: unknown; expires: number }>();
	private readonly MEMORY_CACHE_SIZE = 1000;
	private readonly DEFAULT_TTL = 300; // 5 minutes

	constructor() {
		this.initializeRedis();
	}

	private async initializeRedis() {
		try {
			if (process.env.REDIS_URL && Redis) {
				this.redis = new Redis(process.env.REDIS_URL!, {
					lazyConnect: true,
				});

				this.redis.on('error', error => {
					console.warn('Redis connection error:', error.message);
					this.redis = null;
				});

				this.redis.on('connect', () => {
					console.log('✅ Redis connected successfully');
				});

				await this.redis.connect();
			}
		} catch (error) {
			console.warn('Redis initialization failed, using memory cache:', error);
			this.redis = null;
		}
	}

	async get<T>(key: string): Promise<T | null> {
		try {
			// Try Redis first
			if (this.redis) {
				const value = await this.redis.get(key);
				if (value) {
					return JSON.parse(value);
				}
			}

			// Fallback to memory cache
			const cached = this.memoryCache.get(key);
			if (cached && cached.expires > Date.now()) {
				return cached.value as T;
			}

			// Clean up expired memory cache entry
			if (cached) {
				this.memoryCache.delete(key);
			}

			return null;
		} catch (error) {
			console.error('Cache get error:', error);
			return null;
		}
	}

	async set(key: string, value: unknown, ttl: number = this.DEFAULT_TTL): Promise<boolean> {
		try {
			const serializedValue = JSON.stringify(value);
			const expires = Date.now() + ttl * 1000;

			// Try Redis first
			if (this.redis) {
				await this.redis.setex(key, ttl, serializedValue);
				return true;
			}

			// Fallback to memory cache
			this.memoryCache.set(key, { value, expires });

			// Clean up memory cache if it gets too large
			if (this.memoryCache.size > this.MEMORY_CACHE_SIZE) {
				const entries = Array.from(this.memoryCache.entries());
				const expired = entries.filter(([_, data]) => data.expires <= Date.now());
				expired.forEach(([key]) => this.memoryCache.delete(key));

				// If still too large, remove oldest entries
				if (this.memoryCache.size > this.MEMORY_CACHE_SIZE) {
					const sortedEntries = entries
						.filter(([_, data]) => data.expires > Date.now())
						.sort((a, b) => a[1].expires - b[1].expires);

					const toRemove = sortedEntries.slice(0, this.memoryCache.size - this.MEMORY_CACHE_SIZE);
					toRemove.forEach(([key]) => this.memoryCache.delete(key));
				}
			}

			return true;
		} catch (error) {
			console.error('Cache set error:', error);
			return false;
		}
	}

	async del(key: string): Promise<boolean> {
		try {
			// Try Redis first
			if (this.redis) {
				await this.redis.del(key);
			}

			// Also remove from memory cache
			this.memoryCache.delete(key);
			return true;
		} catch (error) {
			console.error('Cache delete error:', error);
			return false;
		}
	}

	async exists(key: string): Promise<boolean> {
		try {
			// Try Redis first
			if (this.redis) {
				const exists = await this.redis.exists(key);
				return exists === 1;
			}

			// Check memory cache
			const cached = this.memoryCache.get(key);
			return cached ? cached.expires > Date.now() : false;
		} catch (error) {
			console.error('Cache exists error:', error);
			return false;
		}
	}

	async flush(): Promise<boolean> {
		try {
			// Flush Redis
			if (this.redis) {
				await this.redis.flushdb();
			}

			// Flush memory cache
			this.memoryCache.clear();
			return true;
		} catch (error) {
			console.error('Cache flush error:', error);
			return false;
		}
	}

	async getStats(): Promise<{
		type: 'redis' | 'memory';
		size: number;
		hitRate?: number;
	}> {
		try {
			if (this.redis) {
				const info = await this.redis.info('memory');
				const keyspace = await this.redis.dbsize();
				return {
					type: 'redis',
					size: keyspace,
				};
			}

			return {
				type: 'memory',
				size: this.memoryCache.size,
			};
		} catch (error) {
			console.error('Cache stats error:', error);
			return {
				type: 'memory',
				size: this.memoryCache.size,
			};
		}
	}

	// Cache decorator for functions
	async cache<T>(key: string, fn: () => Promise<T>, ttl: number = this.DEFAULT_TTL): Promise<T> {
		const cached = await this.get<T>(key);
		if (cached !== null) {
			return cached;
		}

		const result = await fn();
		await this.set(key, result, ttl);
		return result;
	}

	// Pattern-based cache invalidation
	async invalidatePattern(pattern: string): Promise<number> {
		try {
			if (this.redis) {
				const keys = await this.redis.keys(pattern);
				if (keys.length > 0) {
					await this.redis.del(...keys);
				}
				return keys.length;
			}

			// For memory cache, we need to check each key
			let count = 0;
			for (const key of this.memoryCache.keys()) {
				if (key.includes(pattern.replace('*', ''))) {
					this.memoryCache.delete(key);
					count++;
				}
			}
			return count;
		} catch (error) {
			console.error('Cache pattern invalidation error:', error);
			return 0;
		}
	}
}

// Singleton instance
export const cacheManager = new CacheManager();

// Cache decorator for API routes
export function withCache<T>(keyGenerator: (params: unknown[]) => string, ttl: number = 300) {
	return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
		const method = descriptor.value;

		descriptor.value = async function (...args: unknown[]) {
			const key = keyGenerator(args);
			return cacheManager.cache(key, () => method.apply(this, args), ttl);
		};

		return descriptor;
	};
}

export default cacheManager;
