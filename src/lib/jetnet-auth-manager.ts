import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// Types for JetNet Authentication
export interface JetNetAuthResponse {
	bearerToken: string;
	apiToken: string;
	expires_in?: number; // Seconds until expiry
	token_type?: string; // "Bearer"
	scope?: string;
}

export interface JetNetCredentials {
	username: string;
	password: string;
	clientId?: string;
	clientSecret?: string;
	baseUrl: string;
}

export interface TokenMetadata {
	isValid: boolean;
	expiresAt: Date | null;
	timeUntilExpiry: number; // milliseconds
	timeUntilRefresh: number; // milliseconds
	refreshCount: number;
	lastRefreshed: Date | null;
}

export interface AuthMetrics {
	tokenRefreshCount: number;
	authFailureCount: number;
	avgTokenLifetime: number;
	lastSuccessfulAuth: Date | null;
	currentTokenExpiresAt: Date | null;
	timeUntilNextRefresh: number;
	concurrentRequests: number;
	queuedRequests: number;
}

export class JetNetAuthManager {
	async initialize(): Promise<void> {
		console.log('🔐 JetNet Auth Manager initialized');
		// No special initialization needed for JetNet auth manager
	}
	private currentToken: string | null = null;
	private currentApiToken: string | null = null;
	private tokenExpiry: Date | null = null;
	private refreshToken: string | null = null;
	private isRefreshing: boolean = false;
	private refreshPromise: Promise<string> | null = null;
	private requestQueue: Array<() => void> = [];
	private metrics: AuthMetrics;
	private encryptionKey: string;
	private retryAttempts: number = 0;
	private maxRetryAttempts: number = 3;
	private retryDelayMs: number = 1000;
	private refreshThreshold: number = 0.8; // Refresh at 80% of lifetime

	constructor(
		private credentials: JetNetCredentials,
		private prisma: PrismaClient,
		encryptionKey?: string
	) {
		this.encryptionKey =
			encryptionKey || process.env.TOKEN_ENCRYPTION_KEY || 'default-key-change-in-production';
		this.metrics = {
			tokenRefreshCount: 0,
			authFailureCount: 0,
			avgTokenLifetime: 0,
			lastSuccessfulAuth: null,
			currentTokenExpiresAt: null,
			timeUntilNextRefresh: 0,
			concurrentRequests: 0,
			queuedRequests: 0,
		};
	}

	/**
	 * Get a valid token, refreshing if necessary
	 * Handles concurrent requests safely
	 */
	async getValidToken(): Promise<string> {
		this.metrics.concurrentRequests++;

		try {
			// Check if current token is valid
			if (this.isTokenValid()) {
				return this.currentToken!;
			}

			// If already refreshing, wait for that to complete
			if (this.isRefreshing && this.refreshPromise) {
				await this.refreshPromise;
				return this.currentToken!;
			}

			// Start refresh process
			const newToken = await this.refreshTokenIfNeeded();
			return newToken;
		} finally {
			this.metrics.concurrentRequests--;
		}
	}

	/**
	 * Check if current token is valid and not expiring soon
	 */
	private isTokenValid(): boolean {
		if (!this.currentToken || !this.tokenExpiry) {
			return false;
		}

		const now = new Date();
		const timeUntilExpiry = this.tokenExpiry.getTime() - now.getTime();
		const tokenLifetime =
			this.tokenExpiry.getTime() - (this.metrics.lastSuccessfulAuth?.getTime() || now.getTime());
		const refreshThresholdMs = tokenLifetime * this.refreshThreshold;

		// Token is valid if it hasn't expired and isn't within refresh threshold
		return timeUntilExpiry > refreshThresholdMs;
	}

	/**
	 * Refresh token if needed, handling concurrent requests
	 */
	private async refreshTokenIfNeeded(): Promise<string> {
		if (this.isRefreshing) {
			// Wait for existing refresh to complete
			if (this.refreshPromise) {
				return await this.refreshPromise;
			}
		}

		this.isRefreshing = true;
		this.refreshPromise = this.performTokenRefresh();

		try {
			const newToken = await this.refreshPromise;
			this.processQueuedRequests();
			return newToken;
		} finally {
			this.isRefreshing = false;
			this.refreshPromise = null;
		}
	}

	/**
	 * Perform the actual token refresh
	 */
	private async performTokenRefresh(): Promise<string> {
		try {
			console.log('🔄 Refreshing JetNet token...');

			// JetNet API doesn't use refresh tokens, so always do full authentication
			console.log(
				"🔐 JetNet API doesn't support refresh tokens, performing full authentication..."
			);
			return await this.authenticateInitial();
		} catch (error) {
			this.metrics.authFailureCount++;
			console.error('❌ Token refresh failed:', error);
			throw new Error(
				`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Refresh existing token using refresh_token
	 */
	private async refreshExistingToken(): Promise<string | null> {
		if (!this.refreshToken) {
			return null;
		}

		const response = await fetch(`${this.credentials.baseUrl}/api/Admin/refreshToken`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				refresh_token: this.refreshToken,
			}),
		});

		if (!response.ok) {
			throw new Error(`Refresh failed: ${response.status} ${response.statusText}`);
		}

		const authResponse: JetNetAuthResponse = await response.json();
		await this.storeTokenData(authResponse);

		return authResponse.bearerToken;
	}

	/**
	 * Perform initial authentication
	 */
	private async authenticateInitial(): Promise<string> {
		console.log('🔐 Performing initial JetNet authentication...');

		const authData = {
			emailaddress: this.credentials.username,
			password: this.credentials.password,
		};

		// Add client credentials if provided
		if (this.credentials.clientId && this.credentials.clientSecret) {
			Object.assign(authData, {
				client_id: this.credentials.clientId,
				client_secret: this.credentials.clientSecret,
			});
		}

		const response = await fetch(`${this.credentials.baseUrl}/api/Admin/APILogin`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(authData),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`
			);
		}

		const authResponse: JetNetAuthResponse = await response.json();

		// Debug: Log the full authentication response to see what fields are available
		console.log('🔍 Full JetNet authentication response:', JSON.stringify(authResponse, null, 2));

		try {
			await this.storeTokenData(authResponse);
			console.log('✅ Token data stored successfully');
		} catch (error) {
			console.error('❌ Error storing token data:', error);
			throw error;
		}

		console.log('✅ JetNet authentication successful');
		return authResponse.bearerToken;
	}

	/**
	 * Store token data in memory and database
	 */
	private async storeTokenData(authResponse: JetNetAuthResponse): Promise<void> {
		console.log('🔐 Storing token data:', {
			hasBearerToken: !!authResponse.bearerToken,
			hasApiToken: !!authResponse.apiToken,
			bearerTokenPreview: authResponse.bearerToken
				? authResponse.bearerToken.substring(0, 20) + '...'
				: 'NONE',
			apiTokenPreview: authResponse.apiToken
				? authResponse.apiToken.substring(0, 20) + '...'
				: 'NONE',
		});

		const now = new Date();
		const expiresAt = new Date(now.getTime() + (authResponse.expires_in || 3600) * 1000);

		// Store in memory
		this.currentToken = authResponse.bearerToken;
		this.currentApiToken = authResponse.apiToken;
		this.tokenExpiry = expiresAt;
		this.refreshToken = null; // JetNet doesn't use refresh tokens

		console.log('💾 Tokens stored in memory:', {
			currentToken: this.currentToken ? this.currentToken.substring(0, 20) + '...' : 'NONE',
			currentApiToken: this.currentApiToken
				? this.currentApiToken.substring(0, 20) + '...'
				: 'NONE',
			authResponseApiToken: authResponse.apiToken
				? authResponse.apiToken.substring(0, 20) + '...'
				: 'NONE',
		});

		// Test: Immediately check if the field was set correctly
		console.log('🧪 Test: Checking currentApiToken immediately after assignment:', {
			assigned: this.currentApiToken === authResponse.apiToken,
			hasValue: !!this.currentApiToken,
			value: this.currentApiToken ? this.currentApiToken.substring(0, 20) + '...' : 'NONE',
		});

		// Update metrics
		this.metrics.tokenRefreshCount++;
		this.metrics.lastSuccessfulAuth = now;
		this.metrics.currentTokenExpiresAt = expiresAt;
		this.metrics.timeUntilNextRefresh = this.calculateTimeUntilRefresh();

		// Store in database
		try {
			const encryptedToken = this.encryptToken(authResponse.bearerToken);
			const encryptedApiToken = authResponse.apiToken
				? this.encryptToken(authResponse.apiToken)
				: null;

			await this.prisma.apiToken.upsert({
				where: { serviceName: 'jetnet' },
				update: {
					accessToken: encryptedToken,
					refreshToken: encryptedApiToken, // Store security token here
					expiresAt,
					lastRefreshed: now,
					refreshCount: { increment: 1 },
				},
				create: {
					serviceName: 'jetnet',
					accessToken: encryptedToken,
					refreshToken: encryptedApiToken, // Store security token here
					expiresAt,
					lastRefreshed: now,
					refreshCount: 1,
				},
			});

			console.log('💾 Token data stored in database');
		} catch (error) {
			console.error('❌ Failed to store token in database:', error);
			// Don't throw - memory storage is sufficient for operation
		}
	}

	/**
	 * Load token from database on startup
	 */
	async loadStoredToken(): Promise<boolean> {
		try {
			const storedToken = await this.prisma.apiToken.findFirst({
				where: { serviceName: 'jetnet' },
			});

			if (!storedToken || storedToken.expiresAt <= new Date()) {
				return false;
			}

			// Decrypt and load token
			this.currentToken = this.decryptToken(storedToken.accessToken);
			this.currentApiToken = storedToken.refreshToken
				? this.decryptToken(storedToken.refreshToken)
				: null; // Load security token from refreshToken field
			this.tokenExpiry = storedToken.expiresAt;
			this.refreshToken = null; // JetNet doesn't use refresh tokens

			// Update metrics
			this.metrics.lastSuccessfulAuth = storedToken.lastRefreshed;
			this.metrics.currentTokenExpiresAt = storedToken.expiresAt;
			this.metrics.timeUntilNextRefresh = this.calculateTimeUntilRefresh();

			console.log('📂 Loaded stored JetNet token from database');
			return this.isTokenValid();
		} catch (error) {
			console.error('❌ Failed to load stored token:', error);
			return false;
		}
	}

	/**
	 * Validate token by making a lightweight API call
	 */
	async validateToken(): Promise<boolean> {
		if (!this.currentToken) {
			return false;
		}

		try {
			const response = await fetch(`${this.credentials.baseUrl}/api/Admin/validateToken`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${this.currentToken}`,
				},
			});

			return response.ok;
		} catch (error) {
			console.warn('⚠️ Token validation failed:', error);
			return false;
		}
	}

	/**
	 * Handle authentication failures with exponential backoff
	 */
	private async handleAuthFailure(error: unknown): Promise<string> {
		this.metrics.authFailureCount++;
		this.retryAttempts++;

		if (this.retryAttempts >= this.maxRetryAttempts) {
			console.error('❌ Max retry attempts reached, clearing tokens');
			this.clearTokens();
			throw new Error(
				`Authentication failed after ${this.maxRetryAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}

		// Exponential backoff
		const delayMs = this.retryDelayMs * Math.pow(2, this.retryAttempts - 1);
		console.log(
			`⏳ Retrying authentication in ${delayMs}ms (attempt ${this.retryAttempts}/${this.maxRetryAttempts})`
		);

		await new Promise(resolve => setTimeout(resolve, delayMs));

		// Clear tokens and re-authenticate
		this.clearTokens();
		return await this.authenticateInitial();
	}

	/**
	 * Clear all stored tokens
	 */
	private clearTokens(): void {
		this.currentToken = null;
		this.currentApiToken = null;
		this.tokenExpiry = null;
		this.refreshToken = null;
		this.retryAttempts = 0;
	}

	/**
	 * Process queued requests after successful token refresh
	 */
	private processQueuedRequests(): void {
		console.log(`🔄 Processing ${this.requestQueue.length} queued requests`);
		this.metrics.queuedRequests = this.requestQueue.length;

		while (this.requestQueue.length > 0) {
			const request = this.requestQueue.shift();
			if (request) {
				try {
					request();
				} catch (error) {
					console.error('❌ Error processing queued request:', error);
				}
			}
		}
	}

	/**
	 * Queue a request to be executed after token refresh
	 */
	queueRequest(request: () => void): void {
		this.requestQueue.push(request);
		this.metrics.queuedRequests = this.requestQueue.length;
	}

	/**
	 * Calculate time until next refresh is needed
	 */
	private calculateTimeUntilRefresh(): number {
		if (!this.tokenExpiry || !this.metrics.lastSuccessfulAuth) {
			return 0;
		}

		const tokenLifetime = this.tokenExpiry.getTime() - this.metrics.lastSuccessfulAuth.getTime();
		const refreshThresholdMs = tokenLifetime * this.refreshThreshold;
		const timeUntilRefresh =
			refreshThresholdMs - (Date.now() - this.metrics.lastSuccessfulAuth.getTime());

		return Math.max(0, timeUntilRefresh);
	}

	/**
	 * Get the current security token (apiToken)
	 */
	getSecurityToken(): string | null {
		console.log(
			'🔑 getSecurityToken called - currentApiToken:',
			this.currentApiToken ? this.currentApiToken.substring(0, 20) + '...' : 'NONE'
		);
		console.log('🔍 Debug currentApiToken field:', {
			isNull: this.currentApiToken === null,
			isUndefined: this.currentApiToken === undefined,
			type: typeof this.currentApiToken,
			length: this.currentApiToken ? this.currentApiToken.length : 0,
		});
		return this.currentApiToken;
	}

	/**
	 * Get token metadata for monitoring
	 */
	getTokenMetadata(): TokenMetadata {
		const now = new Date();
		const expiresAt = this.tokenExpiry;
		const timeUntilExpiry = expiresAt ? expiresAt.getTime() - now.getTime() : 0;

		return {
			isValid: this.isTokenValid(),
			expiresAt,
			timeUntilExpiry,
			timeUntilRefresh: this.calculateTimeUntilRefresh(),
			refreshCount: this.metrics.tokenRefreshCount,
			lastRefreshed: this.metrics.lastSuccessfulAuth,
		};
	}

	/**
	 * Get authentication metrics
	 */
	getMetrics(): AuthMetrics {
		return { ...this.metrics };
	}

	/**
	 * Encrypt sensitive token data
	 */
	private encryptToken(token: string): string {
		const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
		let encrypted = cipher.update(token, 'utf8', 'hex');
		encrypted += cipher.final('hex');
		return encrypted;
	}

	/**
	 * Decrypt sensitive token data
	 */
	private decryptToken(encryptedToken: string): string {
		const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
		let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
		decrypted += decipher.final('utf8');
		return decrypted;
	}

	/**
	 * Clean up resources
	 */
	async cleanup(): Promise<void> {
		this.clearTokens();
		this.requestQueue = [];
		this.isRefreshing = false;
		this.refreshPromise = null;
	}
}
