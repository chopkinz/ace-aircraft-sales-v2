import { JetNetAuthManager, JetNetCredentials } from './jetnet-auth-manager';
import { JetNetWebhookAuthManager } from './jetnet-webhook-auth';

export interface JetNetAPIResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	pagination?: {
		total: number;
		limit: number;
		offset: number;
	};
}

export interface SearchParams {
	limit?: number;
	offset?: number;
	forsale?: string;
	aircraftmake?: string;
	aircraftmodel?: string;
	basecountry?: string;
	basestate?: string | string[];
	basecountrylist?: string[];
	makelist?: string[];
	yearmfr?: number;
	yearFrom?: number;
	yearTo?: number;
	airframetype?: string;
	maketype?: string;
	pricelow?: number;
	pricehigh?: number;
	[key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export class JetNetAPIClient {
	private authManager: JetNetAuthManager | JetNetWebhookAuthManager;
	private baseUrl: string;
	private maxRetries: number = 3;
	private retryDelayMs: number = 1000;

	constructor(
		credentials: JetNetCredentials,
		authManager: JetNetAuthManager | JetNetWebhookAuthManager
	) {
		this.baseUrl = credentials.baseUrl;
		this.authManager = authManager;
	}

	/**
	 * Initialize the client and load stored tokens
	 */
	async initialize(): Promise<void> {
		console.log('🚀 Initializing JetNet API Client...');

		// Check if this is a webhook auth manager
		if (this.authManager instanceof JetNetWebhookAuthManager) {
			console.log('🔗 Using webhook authentication - no initialization needed');
			return;
		}

		// Initialize the direct auth manager
		await (this.authManager as JetNetAuthManager).initialize();

		// Try to load stored token first
		const hasValidToken = await (this.authManager as JetNetAuthManager).loadStoredToken();

		if (!hasValidToken) {
			console.log('🔐 No valid stored token, will authenticate on first request');
		} else {
			console.log('✅ Loaded valid stored token');
		}
	}

	/**
	 * Make an authenticated request with automatic retry and token refresh
	 */
	async makeAuthenticatedRequest<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<JetNetAPIResponse<T>> {
		const maxRetries = this.maxRetries;
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				// Get valid token from either auth manager type
				const token = await this.authManager.getValidToken();

				// Get security token if available
				let securityToken = '';
				if (this.authManager instanceof JetNetWebhookAuthManager) {
					securityToken = this.authManager.getSecurityToken();
				} else {
					securityToken = (this.authManager as JetNetAuthManager).getSecurityToken() || '';
				}

				// Prepare request with authentication
				const requestOptions: RequestInit = {
					...options,
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
						...(securityToken && securityToken !== 'NONE' && { 'X-Security-Token': securityToken }),
						...options.headers,
					},
				};

				console.log(
					`📡 Making authenticated request to ${endpoint} (attempt ${attempt}/${maxRetries})`
				);

				// Make the request
				const response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);

				// Handle successful response
				if (response.ok) {
					const data = await response.json();
					console.log(`✅ Request successful: ${endpoint}`);
					return {
						success: true,
						data,
						pagination: this.extractPagination(response),
					};
				}

				// Handle authentication errors
				if (response.status === 401 || response.status === 403) {
					console.warn(
						`⚠️ Authentication error (${response.status}) for ${endpoint}, refreshing token...`
					);

					// Force token refresh and retry
					await this.retryWithNewToken(endpoint, options);
					continue;
				}

				// Handle other HTTP errors
				const errorText = await response.text();
				throw new Error(`HTTP ${response.status}: ${errorText}`);
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				console.error(`❌ Request failed (attempt ${attempt}/${maxRetries}):`, lastError.message);

				// If this is the last attempt, throw the error
				if (attempt === maxRetries) {
					break;
				}

				// Wait before retrying
				const delayMs = this.retryDelayMs * Math.pow(2, attempt - 1);
				console.log(`⏳ Retrying in ${delayMs}ms...`);
				await new Promise(resolve => setTimeout(resolve, delayMs));
			}
		}

		// All retries failed
		return {
			success: false,
			error: lastError?.message || 'Request failed after all retries',
		};
	}

	/**
	 * Retry request with a new token
	 */
	private async retryWithNewToken<T>(
		endpoint: string,
		options: RequestInit
	): Promise<JetNetAPIResponse<T>> {
		try {
			// Force token refresh
			await (this.authManager as JetNetAuthManager).getValidToken();

			// Retry the original request
			return await this.makeAuthenticatedRequest<T>(endpoint, options);
		} catch (error) {
			console.error('❌ Retry with new token failed:', error);
			throw error;
		}
	}

	/**
	 * Search aircraft using bulk aircraft export endpoint (PRIMARY)
	 */
	async searchAircraft(params: SearchParams = {}): Promise<JetNetAPIResponse> {
		console.log('🔍 Searching aircraft with bulk export endpoint:', params);

		try {
			// Ensure we have a valid bearer token first (this will authenticate if needed)
			console.log('🔐 Ensuring valid authentication...');
			const bearerToken = await this.authManager.getValidToken();
			console.log(
				'✅ Bearer token obtained:',
				bearerToken ? bearerToken.substring(0, 20) + '...' : 'NONE'
			);

			// Get the security token from auth manager
			const securityToken = this.authManager.getSecurityToken() || '';
			console.log(
				'🔑 Security token from auth manager:',
				securityToken ? securityToken.substring(0, 20) + '...' : 'NONE'
			);

			if (!securityToken) {
				console.error('❌ No security token available from auth manager');
				throw new Error('No security token available');
			}

			// Convert search parameters to aircraft list format
			const searchBody = this.buildAircraftListBody(params);

			// Use the main aircraft list endpoint
			const endpoint = `/api/Aircraft/getAircraftList/${securityToken}`;
			console.log('📡 Making request to aircraft list endpoint:', endpoint);

			const response = await this.makeAuthenticatedRequest(endpoint, {
				method: 'POST',
				body: JSON.stringify(searchBody),
			});

			if (response.success && response.data) {
				// Transform the response to match expected format
				return {
					success: true,
					data: (response.data as any).aircraft || response.data,
					pagination: response.pagination || {
						total: (response.data as any).aircraftcount || (response.data as any).total || 0,
						limit: 50,
						offset: 0,
					},
				};
			}

			return response;
		} catch (error) {
			console.error('❌ Aircraft search failed:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Get aircraft by ID
	 */
	async getAircraftById(aircraftId: string): Promise<JetNetAPIResponse> {
		console.log(`🛩️ Getting aircraft by ID: ${aircraftId}`);

		return await this.makeAuthenticatedRequest(`/api/Aircraft/${aircraftId}`);
	}

	/**
	 * Get aircraft images
	 */
	async getAircraftImages(aircraftId: string): Promise<JetNetAPIResponse> {
		console.log(`📸 Getting images for aircraft: ${aircraftId}`);

		return await this.makeAuthenticatedRequest(`/api/Aircraft/${aircraftId}/images`);
	}

	/**
	 * Get aircraft makes (manufacturers)
	 */
	async getAircraftMakes(): Promise<JetNetAPIResponse> {
		console.log('🏭 Getting aircraft makes');

		const securityToken = this.authManager.getSecurityToken() || '';
		return await this.makeAuthenticatedRequest(`/api/Utility/getAircraftMakeList/${securityToken}`);
	}

	/**
	 * Get aircraft models for a specific make
	 */
	async getAircraftModels(make: string): Promise<JetNetAPIResponse> {
		console.log(`📋 Getting aircraft models for: ${make}`);

		const securityToken = this.authManager.getSecurityToken() || '';
		return await this.makeAuthenticatedRequest(
			`/api/Utility/getAircraftModelList/${securityToken}`
		);
	}

	/**
	 * Get airports
	 */
	async getAirports(country?: string): Promise<JetNetAPIResponse> {
		console.log('✈️ Getting airports', country ? `for country: ${country}` : '');

		const endpoint = country
			? `/api/Utility/airports?country=${encodeURIComponent(country)}`
			: '/api/Utility/airports';

		return await this.makeAuthenticatedRequest(endpoint);
	}

	/**
	 * Get countries
	 */
	async getCountries(): Promise<JetNetAPIResponse> {
		console.log('🌍 Getting countries');

		return await this.makeAuthenticatedRequest('/api/Utility/countries');
	}

	/**
	 * Get states/provinces for a country
	 */
	async getStates(country: string): Promise<JetNetAPIResponse> {
		console.log(`🗺️ Getting states for country: ${country}`);

		const securityToken = this.authManager.getSecurityToken() || '';
		return await this.makeAuthenticatedRequest(`/api/Utility/getStateList/${securityToken}`);
	}

	/**
	 * Get companies
	 */
	async getCompanies(params: { limit?: number; offset?: number } = {}): Promise<JetNetAPIResponse> {
		console.log('🏢 Getting companies with params:', params);

		const queryParams = new URLSearchParams();
		if (params.limit) queryParams.append('limit', params.limit.toString());
		if (params.offset) queryParams.append('offset', params.offset.toString());

		const endpoint = `/api/Company/list${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
		return await this.makeAuthenticatedRequest(endpoint);
	}

	/**
	 * Get contacts
	 */
	async getContacts(params: { limit?: number; offset?: number } = {}): Promise<JetNetAPIResponse> {
		console.log('👥 Getting contacts with params:', params);

		const queryParams = new URLSearchParams();
		if (params.limit) queryParams.append('limit', params.limit.toString());
		if (params.offset) queryParams.append('offset', params.offset.toString());

		const endpoint = `/api/Contact/list${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
		return await this.makeAuthenticatedRequest(endpoint);
	}

	/**
	 * Build search body for aircraft search
	 */
	public buildSearchBody(params: SearchParams): any {
		// Use the exact format that works in the test endpoint
		const searchBody = {
			airframetype: 'None',
			maketype: 'None',
			sernbr: '',
			regnbr: '',
			regnbrlist: [],
			modelid: 0,
			make: '',
			forsale:
				params.forsale === 'true'
					? 'True'
					: params.forsale === 'false'
						? 'False'
						: params.forsale || 'True',
			lifecycle: 'None',
			basestate: [],
			basestatename: [],
			basecountry: params.basecountry || '',
			basecountrylist: [],
			basecode: '',
			actiondate: '',
			enddate: '',
			companyid: 0,
			complist: [],
			contactid: 0,
			yearmfr: params.yearmfr || 0,
			yeardlv: 0,
			aircraftchanges: 'true',
			aclist: [],
			modlist: [],
			exactMatchReg: true,
		};

		// Add any additional parameters
		// if (params.limit) searchBody. = params.limit;
		// if (params.offset) searchBody.offset = params.offset;
		if (params.aircraftmake) searchBody.make = params.aircraftmake;
		// if (params.aircraftcategory) searchBody. = params.aircraftcategory;

		return searchBody;
	}

	/**
	 * Extract pagination information from response headers
	 */
	private extractPagination(response: Response): any {
		const total = response.headers.get('X-Total-Count');
		const limit = response.headers.get('X-Limit');
		const offset = response.headers.get('X-Offset');

		if (total || limit || offset) {
			return {
				total: total ? parseInt(total) : undefined,
				limit: limit ? parseInt(limit) : undefined,
				offset: offset ? parseInt(offset) : undefined,
			};
		}

		return undefined;
	}

	/**
	 * Get authentication status and metrics
	 */
	async getAuthStatus(): Promise<{
		isAuthenticated: boolean;
		tokenMetadata: any; // eslint-disable-line @typescript-eslint/no-explicit-any
		metrics: any; // eslint-disable-line @typescript-eslint/no-explicit-any
	}> {
		const tokenMetadata = await this.authManager.getValidToken();
		const metrics = await this.authManager.getValidToken();
		const isValid = await this.authManager.getValidToken();

		return {
			tokenMetadata, // eslint-disable-line @typescript-eslint/no-explicit-any
			metrics, // eslint-disable-line @typescript-eslint/no-explicit-any
			isAuthenticated: !!isValid, // eslint-disable-line @typescript-eslint/no-explicit-any
		};
	}

	/**
	 * Build search body for bulk aircraft export endpoint
	 */
	public buildAircraftListBody(params: SearchParams): any {
		// Use the exact format from the JetNet getAircraftList API
		const searchBody = {
			airframetype: params.airframetype || 'None',
			maketype: params.maketype || 'None',
			sernbr: params.sernbr || '',
			regnbr: params.regnbr || '',
			regnbrlist: params.regnbrlist || [],
			modelid: params.modelid || 0,
			make: params.make || '',
			forsale: params.forsale || 'false',
			lifecycle: params.lifecycle || 'None',
			basestate: params.basestate
				? Array.isArray(params.basestate)
					? params.basestate
					: [params.basestate]
				: [],
			basestatename: params.basestatename || [],
			basecountry: params.basecountry || '',
			basecountrylist: params.basecountrylist || [],
			basecode: params.basecode || '',
			actiondate: params.actiondate || '',
			enddate: params.enddate || '',
			companyid: params.companyid || 0,
			complist: params.complist || [],
			contactid: params.contactid || 0,
			yearmfr: params.yearmfr || params.yearFrom || 0,
			yeardlv: params.yeardlv || params.yearTo || 0,
			aircraftchanges: 'true',
			aclist: params.aclist || [],
			modlist: params.modlist || [],
			exactMatchReg: params.exactMatchReg || true,
			exactMatchSer: params.exactMatchSer || false,
			exactMatchMake: params.exactMatchMake || false,
			exactMatchModel: params.exactMatchModel || false,
			caseSensitive: params.caseSensitive || false,
			includeInactive: params.includeInactive || false,
			includeDeleted: params.includeDeleted || false,
			// Additional filtering parameters
			aircraftmake: params.aircraftmake || '',
			aircraftmodel: params.aircraftmodel || '',
			pricelow: params.pricelow || 0,
			pricehigh: params.pricehigh || 0,
		};

		// Add make filtering if specified
		if (params.aircraftmake) {
			searchBody.make = [params.aircraftmake.toUpperCase()];
		}

		console.log('🔧 Built aircraft list body:', searchBody);
		return searchBody;
	}

	/**
	 * Force token refresh
	 */
	async refreshToken(): Promise<boolean> {
		try {
			await this.authManager.getValidToken();
			return true;
		} catch (error) {
			console.error('❌ Manual token refresh failed:', error);
			return false;
		}
	}

	/**
	 * Clean up resources
	 */
	async cleanup(): Promise<void> {
		// Cleanup is not available on JetNetWebhookAuthManager
		if ('cleanup' in this.authManager) {
			await (this.authManager as JetNetAuthManager).cleanup();
		}
	}
}
