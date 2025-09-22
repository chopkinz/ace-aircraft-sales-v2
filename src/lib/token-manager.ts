import { JetNetAPIClient } from '@/lib/jetnet-client';

interface TokenInfo {
	token: string;
	bearerToken: string;
	expiresAt: number;
	refreshAt: number;
}

interface TokenCache {
	[key: string]: TokenInfo;
}

/**
 * Enhanced Token Manager for JetNet API
 * Handles automatic token rotation, caching, and expiration
 */
export class TokenManager {
	private static instance: TokenManager;
	private tokenCache: TokenCache = {};
	private refreshPromises: Map<string, Promise<TokenInfo>> = new Map();
	private readonly REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry
	private readonly MAX_RETRY_ATTEMPTS = 3;
	private readonly RETRY_DELAY_MS = 1000;

	private constructor() {}

	static getInstance(): TokenManager {
		if (!TokenManager.instance) {
			TokenManager.instance = new TokenManager();
		}
		return TokenManager.instance;
	}

	/**
	 * Get valid token for a client, refreshing if necessary
	 */
	async getValidToken(client: JetNetAPIClient): Promise<TokenInfo | null> {
		const clientKey = this.getClientKey(client);
		const cached = this.tokenCache[clientKey];

		// Check if we have a valid cached token
		if (cached && Date.now() < cached.refreshAt) {
			return cached;
		}

		// Check if refresh is already in progress
		if (this.refreshPromises.has(clientKey)) {
			return await this.refreshPromises.get(clientKey)!;
		}

		// Start refresh process
		const refreshPromise = this.refreshToken(client);
		this.refreshPromises.set(clientKey, refreshPromise);

		try {
			const newToken = await refreshPromise;
			this.tokenCache[clientKey] = newToken;
			return newToken;
		} finally {
			this.refreshPromises.delete(clientKey);
		}
	}

	/**
	 * Refresh token for a client
	 */
	private async refreshToken(client: JetNetAPIClient): Promise<TokenInfo> {
		const clientKey = this.getClientKey(client);
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
			try {
				console.log(`🔄 Refreshing token for ${clientKey} (attempt ${attempt})`);

				// Force authentication by clearing any existing tokens
				await this.clearClientTokens(client);

				// Get fresh token
				const authResult = await client.getApiStatus();
				if (!authResult.success) {
					throw new Error(authResult.error?.message || 'Authentication failed');
				}

				// Extract token info from client
				const tokenInfo = this.extractTokenInfo(client);
				if (!tokenInfo) {
					throw new Error('Failed to extract token information');
				}

				console.log(`✅ Token refreshed successfully for ${clientKey}`);
				return tokenInfo;
			} catch (error) {
				lastError = error as Error;
				console.warn(`⚠️ Token refresh attempt ${attempt} failed:`, error);

				if (attempt < this.MAX_RETRY_ATTEMPTS) {
					// Exponential backoff
					const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
					await this.sleep(delay);
				}
			}
		}

		throw new Error(
			`Token refresh failed after ${this.MAX_RETRY_ATTEMPTS} attempts: ${lastError?.message}`
		);
	}

	/**
	 * Extract token information from client
	 */
	private extractTokenInfo(client: JetNetAPIClient): TokenInfo | null {
		// Access private properties through reflection or public methods
		const authToken = (client as any).authToken;
		const bearerToken = (client as any).bearerToken;
		const tokenExpiresAt = (client as any).tokenExpiresAt;

		if (!authToken || !bearerToken || !tokenExpiresAt) {
			return null;
		}

		return {
			token: authToken,
			bearerToken: bearerToken,
			expiresAt: tokenExpiresAt,
			refreshAt: tokenExpiresAt - this.REFRESH_BUFFER_MS,
		};
	}

	/**
	 * Clear tokens for a specific client
	 */
	private async clearClientTokens(client: JetNetAPIClient): Promise<void> {
		// Clear client's internal token state
		(client as any).authToken = null;
		(client as any).bearerToken = null;
		(client as any).tokenExpiresAt = null;
		(client as any).authPromise = null;
	}

	/**
	 * Get unique key for client
	 */
	private getClientKey(client: JetNetAPIClient): string {
		const email = (client as any).email;
		const baseUrl = (client as any).baseURL;
		return `${email}@${baseUrl}`;
	}

	/**
	 * Clear all cached tokens
	 */
	clearCache(): void {
		this.tokenCache = {};
		this.refreshPromises.clear();
		console.log('🧹 Token cache cleared');
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; clients: string[] } {
		return {
			size: Object.keys(this.tokenCache).length,
			clients: Object.keys(this.tokenCache),
		};
	}

	/**
	 * Check if token is expired
	 */
	isTokenExpired(tokenInfo: TokenInfo): boolean {
		return Date.now() >= tokenInfo.expiresAt;
	}

	/**
	 * Check if token needs refresh
	 */
	needsRefresh(tokenInfo: TokenInfo): boolean {
		return Date.now() >= tokenInfo.refreshAt;
	}

	/**
	 * Get token expiry time
	 */
	getTokenExpiry(tokenInfo: TokenInfo): Date {
		return new Date(tokenInfo.expiresAt);
	}

	/**
	 * Get time until refresh needed
	 */
	getTimeUntilRefresh(tokenInfo: TokenInfo): number {
		return Math.max(0, tokenInfo.refreshAt - Date.now());
	}

	/**
	 * Sleep utility
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Start background token refresh process
	 */
	startBackgroundRefresh(): void {
		setInterval(() => {
			this.performBackgroundRefresh();
		}, 60000); // Check every minute
	}

	/**
	 * Perform background refresh for all cached tokens
	 */
	private async performBackgroundRefresh(): Promise<void> {
		const now = Date.now();
		const clientsToRefresh: string[] = [];

		// Find clients that need refresh
		for (const [clientKey, tokenInfo] of Object.entries(this.tokenCache)) {
			if (now >= tokenInfo.refreshAt) {
				clientsToRefresh.push(clientKey);
			}
		}

		// Refresh tokens in background
		for (const clientKey of clientsToRefresh) {
			try {
				console.log(`🔄 Background refresh for ${clientKey}`);
				// Note: We can't refresh without the original client instance
				// This would need to be implemented with a client registry
			} catch (error) {
				console.error(`❌ Background refresh failed for ${clientKey}:`, error);
			}
		}
	}
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();
