/**
 * JetNet Webhook Authentication Manager
 * Uses n8n webhook for authentication and retrieves stored auth data
 */

export interface JetNetWebhookResponse {
	bearerToken: string;
	securityToken: string;
	authTime: string;
	expiresIn: number;
	loginResponse: {
		bearerToken: string;
		apiToken: string;
	};
}

export interface JetNetWebhookAuthConfig {
	webhookUrl: string;
	testWebhookUrl?: string;
	useTestMode?: boolean;
	authDataEndpoint?: string;
}

export class JetNetWebhookAuthManager {
	private webhookUrl: string;
	private testWebhookUrl?: string;
	private useTestMode: boolean;
	private authDataEndpoint: string;
	private currentToken: string | null = null;
	private currentApiToken: string | null = null;
	private tokenExpiry: Date | null = null;
	private lastAuthTime: Date | null = null;

	constructor(config: JetNetWebhookAuthConfig) {
		this.webhookUrl =
			config.webhookUrl ||
			process.env.N8N_WEBHOOK_URL ||
			'https://autom8god.app.n8n.cloud/webhook/d9d8af7b-7238-4879-8267-84a105112628';
		this.testWebhookUrl = config.testWebhookUrl || process.env.N8N_TEST_WEBHOOK_URL;
		this.useTestMode = config.useTestMode || false;
		this.authDataEndpoint =
			config.authDataEndpoint ||
			(process.env.NODE_ENV === 'production'
				? 'https://ace-aircraft-sales-pokcpiuhq-bas3.vercel.app/api/jetnet/auth-data'
				: 'http://localhost:8000/api/jetnet/auth-data');
	}

	/**
	 * Get valid token from webhook
	 * ALWAYS triggers webhook for fresh auth data on every request
	 */
	async getValidToken(): Promise<string> {
		console.log('🔗 Getting fresh token from JetNet webhook for each request...');

		// ALWAYS trigger webhook for fresh auth data
		await this.triggerWebhookAndWait();

		if (!this.currentToken) {
			throw new Error('Failed to get token from webhook');
		}

		console.log('✅ Fresh token obtained from webhook');
		return this.currentToken;
	}

	/**
	 * Get security token (API token)
	 */
	getSecurityToken(): string {
		return this.currentApiToken || 'NONE';
	}

	/**
	 * Load stored auth data from our application
	 */
	private async loadStoredAuthData(): Promise<void> {
		try {
			console.log('🔍 Checking for stored auth data...');

			const response = await fetch(this.authDataEndpoint, {
				method: 'GET',
				headers: {
					Accept: 'application/json',
				},
			});

			if (!response.ok) {
				console.log('📭 No stored auth data available');
				return;
			}

			const data = await response.json();

			if (data.success && data.data) {
				const authData = data.data;

				// Store tokens
				this.currentToken = authData.bearerToken;
				this.currentApiToken = authData.securityToken;

				// Calculate expiry time
				const authTime = new Date(authData.authTime);
				const expiresInMs = authData.expiresIn * 1000;
				this.tokenExpiry = new Date(authTime.getTime() + expiresInMs);
				this.lastAuthTime = authTime;

				console.log('✅ Loaded stored auth data');
				console.log(`🔐 Bearer token: ${this.currentToken?.substring(0, 20)}...`);
				console.log(`🔑 Security token: ${this.currentApiToken}`);
				console.log(`⏰ Expires at: ${this.tokenExpiry.toISOString()}`);
				console.log(`✅ Valid: ${data.data.isValid}`);
			}
		} catch (error) {
			console.log('⚠️ Failed to load stored auth data:', error);
		}
	}

	/**
	 * Trigger webhook and wait for auth data
	 */
	private async triggerWebhookAndWait(): Promise<void> {
		const maxRetries = 3;
		const retryDelay = 10000; // 10 seconds between retries

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const webhookUrl =
					this.useTestMode && this.testWebhookUrl ? this.testWebhookUrl : this.webhookUrl;

				console.log(`🔄 Triggering webhook (attempt ${attempt}/${maxRetries}): ${webhookUrl}`);

				// Trigger the webhook
				const triggerResponse = await fetch(webhookUrl, {
					method: 'GET',
					headers: {
						Accept: 'application/json',
					},
				});

				if (!triggerResponse.ok) {
					throw new Error(
						`Webhook trigger failed: ${triggerResponse.status} ${triggerResponse.statusText}`
					);
				}

				const triggerData = await triggerResponse.json();
				console.log('📡 Webhook triggered:', triggerData);

				// Wait for the webhook to process and send data back
				console.log('⏳ Waiting for webhook to process and send auth data back...');

				// Poll for auth data with timeout
				const maxWaitTime = 60000; // 60 seconds
				const pollInterval = 2000; // 2 seconds
				let waitedTime = 0;

				while (waitedTime < maxWaitTime) {
					await new Promise(resolve => setTimeout(resolve, pollInterval));
					waitedTime += pollInterval;

					// Try to load stored auth data
					await this.loadStoredAuthData();

					if (this.currentToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
						console.log('✅ Auth data received from webhook');
						return; // Success, exit retry loop
					}

					console.log(`⏳ Still waiting for auth data... (${waitedTime / 1000}s)`);
				}

				throw new Error('Timeout waiting for auth data from webhook');
			} catch (error) {
				console.error(`❌ Attempt ${attempt} failed:`, error);

				if (attempt === maxRetries) {
					throw new Error(
						`Webhook authentication failed after ${maxRetries} attempts: ${
							error instanceof Error ? error.message : 'Unknown error'
						}`
					);
				}

				console.log(`⏳ Waiting ${retryDelay / 1000} seconds before retry...`);
				await new Promise(resolve => setTimeout(resolve, retryDelay));
			}
		}
	}

	/**
	 * Check if token is valid
	 */
	isTokenValid(): boolean {
		return !!(this.currentToken && this.tokenExpiry && new Date() < this.tokenExpiry);
	}

	/**
	 * Get token info for debugging
	 */
	getTokenInfo() {
		return {
			hasToken: !!this.currentToken,
			hasApiToken: !!this.currentApiToken,
			tokenExpiry: this.tokenExpiry?.toISOString(),
			lastAuthTime: this.lastAuthTime?.toISOString(),
			isValid: this.isTokenValid(),
			webhookUrl: this.useTestMode && this.testWebhookUrl ? this.testWebhookUrl : this.webhookUrl,
			authDataEndpoint: this.authDataEndpoint,
		};
	}

	/**
	 * Force refresh token
	 */
	async forceRefresh(): Promise<void> {
		this.currentToken = null;
		this.currentApiToken = null;
		this.tokenExpiry = null;
		await this.triggerWebhookAndWait();
	}
}
