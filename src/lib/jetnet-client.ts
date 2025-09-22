import {
	Aircraft,
	AircraftImage,
	ApiResponse,
	SearchParams,
	SearchResponse,
	MarketTrend,
	Company,
	Transaction,
} from '@/types';
import { tokenManager } from './token-manager';

// Rate Limiter Implementation
class RateLimiter {
	private requests: number[] = [];
	private readonly maxRequests: number;
	private readonly windowMs: number;

	constructor(maxRequests: number = 100, windowMs: number = 60000) {
		this.maxRequests = maxRequests;
		this.windowMs = windowMs;
	}

	async checkLimit(): Promise<boolean> {
		const now = Date.now();
		// Remove requests outside the window
		this.requests = this.requests.filter(time => now - time < this.windowMs);

		if (this.requests.length >= this.maxRequests) {
			const oldestRequest = Math.min(...this.requests);
			const waitTime = this.windowMs - (now - oldestRequest);
			await new Promise(resolve => setTimeout(resolve, waitTime));
			return this.checkLimit();
		}

		this.requests.push(now);
		return true;
	}
}

// Circuit Breaker Implementation
class CircuitBreaker {
	private failures: number = 0;
	private lastFailureTime: number = 0;
	private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

	constructor(
		private readonly failureThreshold: number = 5,
		private readonly recoveryTimeout: number = 60000
	) {}

	async execute<T>(operation: () => Promise<T>): Promise<T> {
		if (this.state === 'OPEN') {
			if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
				this.state = 'HALF_OPEN';
			} else {
				throw new Error('Circuit breaker is OPEN');
			}
		}

		try {
			const result = await operation();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	private onSuccess(): void {
		this.failures = 0;
		this.state = 'CLOSED';
	}

	private onFailure(): void {
		this.failures++;
		this.lastFailureTime = Date.now();

		if (this.failures >= this.failureThreshold) {
			this.state = 'OPEN';
		}
	}
}

// Cache Implementation
class APICache {
	private cache = new Map<string, { data: any; expires: number }>();
	private readonly defaultTtl: number;

	constructor(defaultTtl: number = 300000) {
		// 5 minutes default
		this.defaultTtl = defaultTtl;
	}

	get(key: string): any | null {
		const item = this.cache.get(key);
		if (!item) return null;

		if (Date.now() > item.expires) {
			this.cache.delete(key);
			return null;
		}

		return item.data;
	}

	set(key: string, data: any, ttl?: number): void {
		const expires = Date.now() + (ttl || this.defaultTtl);
		this.cache.set(key, { data, expires });
	}

	delete(key: string): void {
		this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	size(): number {
		return this.cache.size;
	}
}

// Enhanced JetNet Client
export class JetNetAPIClient {
	private readonly baseURL: string;
	private readonly email: string;
	private readonly password: string;
	private readonly rateLimiter: RateLimiter;
	private readonly circuitBreaker: CircuitBreaker;
	private readonly cache: APICache;
	private authToken: string | null = null;
	private bearerToken: string | null = null;
	private tokenExpiresAt: number | null = null;
	private authPromise: Promise<boolean> | null = null;

	constructor(email?: string, password?: string, baseURL?: string) {
		// Use provided credentials or fall back to environment variables
		this.email = email || process.env.JETNET_EMAIL || '';
		this.password = password || process.env.JETNET_PASSWORD || '';
		this.baseURL =
			baseURL || process.env.JETNET_BASE_URL || 'https://customer.jetnetconnect.com/api';

		this.rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
		this.circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1 minute recovery
		this.cache = new APICache(300000); // 5 minutes default cache
	}

	// Authentication Methods
	private async authenticate(): Promise<boolean> {
		// Check if credentials are available
		if (!this.email || !this.password) {
			console.log('⚠️ JetNet API credentials not provided');
			return false;
		}

		try {
			console.log('🔐 Authenticating with JetNet API...');

			const authPayload = {
				EmailAddress: this.email,
				Password: this.password,
			};

			console.log('📡 Sending auth request to:', `${this.baseURL}/Admin/APILogin`);

			const response = await fetch(`${this.baseURL}/Admin/APILogin`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify(authPayload),
			});

			if (!response.ok) {
				console.error(`❌ JetNet authentication failed: ${response.status} ${response.statusText}`);
				const errorText = await response.text();
				console.error('Response body:', errorText);
				return false;
			}

			const data = await response.json();
			console.log(
				'🔍 Auth response received:',
				typeof data,
				Array.isArray(data) ? 'Array' : 'Object'
			);

			// Handle different response formats
			let authData;
			if (Array.isArray(data) && data.length > 0) {
				authData = data[0];
			} else if (data && typeof data === 'object') {
				authData = data;
			} else {
				console.error('❌ Invalid authentication response format');
				return false;
			}

			// Check for tokens with different possible field names
			const bearerToken =
				authData.bearerToken || authData.bearer_token || authData.token || authData.access_token;
			const apiToken =
				authData.apiToken ||
				authData.api_token ||
				authData.apikey ||
				authData.api_key ||
				authData.securityToken;

			if (!bearerToken || !apiToken) {
				console.error('❌ Missing tokens in authentication response');
				console.log('Response structure:', JSON.stringify(authData, null, 2));
				return false;
			}

			this.authToken = apiToken;
			this.bearerToken = bearerToken;
			// Set token to expire in 50 minutes (refresh before actual expiry)
			this.tokenExpiresAt = Date.now() + 50 * 60 * 1000;
			this.authPromise = null;
			console.log('✅ JetNet authentication successful!');
			console.log('🎟️  API Token length:', this.authToken?.length);
			console.log('🎟️  Bearer Token length:', this.bearerToken?.length);
			console.log('⏰ Token expires at:', new Date(this.tokenExpiresAt).toISOString());

			return true;
		} catch (error) {
			console.error('JetNet authentication error:', error);
			this.authToken = null;
			this.bearerToken = null;
			this.tokenExpiresAt = null;
			this.authPromise = null;
			return false;
		} finally {
			// Clear the auth promise so new requests can trigger re-auth
			this.authPromise = null;
		}
	}

	private isTokenExpired(): boolean {
		if (!this.tokenExpiresAt || !this.authToken || !this.bearerToken) {
			return true;
		}

		// Consider token expired if it expires in the next 5 minutes
		const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
		return this.tokenExpiresAt <= fiveMinutesFromNow;
	}

	private async ensureAuthenticated(): Promise<boolean> {
		try {
			// Use token manager for automatic token rotation
			const tokenInfo = await tokenManager.getValidToken(this);
			if (tokenInfo) {
				// Update client with fresh token info
				this.authToken = tokenInfo.token;
				this.bearerToken = tokenInfo.bearerToken;
				this.tokenExpiresAt = tokenInfo.expiresAt;
				this.authPromise = null;

				console.log(
					'🔄 Using managed token (expires: ' + new Date(tokenInfo.expiresAt).toISOString() + ')'
				);
				return true;
			}
		} catch (error) {
			console.warn('⚠️ Token manager failed, falling back to direct auth:', error);
		}

		// Fallback to direct authentication
		// If token is still valid, return immediately
		if (!this.isTokenExpired()) {
			console.log(
				'🔄 Using existing valid token (expires: ' +
					new Date(this.tokenExpiresAt!).toISOString() +
					')'
			);
			return true;
		}

		// If authentication is already in progress, wait for it
		if (this.authPromise) {
			console.log('⏳ Authentication in progress, waiting...');
			return await this.authPromise;
		}

		// Start new authentication
		console.log('🔄 Token expired or missing, refreshing authentication...');
		this.authPromise = this.authenticate();
		return await this.authPromise;
	}

	// Core Request Method with Error Handling and Retries
	private async request<T>(
		endpoint: string,
		options: RequestInit = {},
		useCache: boolean = true,
		cacheTtl?: number
	): Promise<ApiResponse<T>> {
		const cacheKey = `${endpoint}-${JSON.stringify(options)}`;

		// Check cache first
		if (
			useCache &&
			options.method !== 'POST' &&
			options.method !== 'PUT' &&
			options.method !== 'DELETE'
		) {
			const cached = this.cache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		// Rate limiting
		await this.rateLimiter.checkLimit();

		// Ensure authentication
		const isAuthenticated = await this.ensureAuthenticated();
		if (!isAuthenticated) {
			// Fail hard when authentication fails - no mock data
			throw new Error('JetNet API authentication failed - credentials required');
		}

		const operation = async (): Promise<ApiResponse<T>> => {
			const startTime = Date.now();
			const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			try {
				const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

				let response: Response;
				try {
					response = await fetch(url, {
						...options,
						headers: {
							Authorization: `Bearer ${this.bearerToken}`,
							'X-API-Token': this.authToken || '',
							'Content-Type': 'application/json',
							Accept: 'application/json',
							'X-Request-ID': requestId,
							...options.headers,
						},
						signal: controller.signal,
					});
					clearTimeout(timeoutId);
				} catch (error) {
					clearTimeout(timeoutId);
					throw error;
				}

				const duration = Date.now() - startTime;

				if (!response.ok) {
					let errorData;
					try {
						errorData = await response.json();
					} catch {
						errorData = { message: response.statusText };
					}

					const apiError: ApiResponse<T> = {
						success: false,
						error: {
							code: `HTTP_${response.status}`,
							message:
								errorData.message || `Request failed: ${response.status} ${response.statusText}`,
							details: errorData,
						},
						metadata: {
							timestamp: new Date().toISOString(),
							requestId,
							duration,
							source: 'JetNet API',
							version: '2.0.0',
						},
					};

					// Don't cache error responses
					return apiError;
				}

				const data = await response.json();

				// Check for JetNet-specific authentication errors
				if (data && data.responsestatus && typeof data.responsestatus === 'string') {
					if (
						data.responsestatus.includes('INVALID SECURITY TOKEN') ||
						data.responsestatus.includes('UNAUTHORIZED') ||
						data.responsestatus.includes('TOKEN EXPIRED')
					) {
						console.log('🔄 JetNet token invalid, forcing re-authentication...');

						// Clear current tokens to force re-auth
						this.authToken = null;
						this.bearerToken = null;
						this.tokenExpiresAt = null;
						this.authPromise = null;

						// Try to re-authenticate and retry the request once
						const reauth = await this.ensureAuthenticated();
						if (reauth) {
							console.log('🔄 Re-authentication successful, retrying request...');

							// Retry the request with new token
							const retryResponse = await fetch(url, {
								...options,
								headers: {
									Authorization: `Bearer ${this.bearerToken}`,
									'X-API-Token': this.authToken || '',
									'Content-Type': 'application/json',
									Accept: 'application/json',
									'X-Request-ID': `${requestId}_retry`,
									...options.headers,
								},
							});

							if (retryResponse.ok) {
								const retryData = await retryResponse.json();
								const retryApiResponse: ApiResponse<T> = {
									success: true,
									data: retryData.data || retryData,
									metadata: {
										timestamp: new Date().toISOString(),
										requestId: `${requestId}_retry`,
										duration: Date.now() - startTime,
										source: 'JetNet API',
										version: '2.0.0',
									},
									pagination: retryData.pagination,
								};

								// Cache successful retry responses
								if (useCache && retryResponse.status === 200) {
									this.cache.set(cacheKey, retryApiResponse, cacheTtl);
								}

								return retryApiResponse;
							}
						}
					}
				}

				const apiResponse: ApiResponse<T> = {
					success: true,
					data: data.data || data,
					metadata: {
						timestamp: new Date().toISOString(),
						requestId,
						duration,
						source: 'JetNet API',
						version: '2.0.0',
					},
					pagination: data.pagination,
				};

				// Cache successful responses
				if (useCache && response.status === 200) {
					this.cache.set(cacheKey, apiResponse, cacheTtl);
				}

				return apiResponse;
			} catch (error) {
				const duration = Date.now() - startTime;

				return {
					success: false,
					error: {
						code: 'NETWORK_ERROR',
						message: error instanceof Error ? error.message : 'Network request failed',
						details:
							error instanceof Error
								? { message: error.message, stack: error.stack }
								: { message: String(error) },
					},
					metadata: {
						timestamp: new Date().toISOString(),
						requestId,
						duration,
						source: 'JetNet API',
						version: '2.0.0',
					},
				};
			}
		};

		// Execute with circuit breaker
		return this.circuitBreaker.execute(operation);
	}

	// Aircraft Search and Lookup Methods
	async searchAircraft(params: SearchParams): Promise<SearchResponse<Aircraft>> {
		console.log('🔍 Searching aircraft with params:', params);

		// Check if API credentials are configured
		if (!this.email || !this.password) {
			console.log('⚠️ JetNet API credentials not configured');
			return {
				success: false,
				error: {
					code: 'JETNET_CREDENTIALS_NOT_CONFIGURED',
					message:
						'JetNet API credentials not configured. Please configure your JetNet credentials in settings.',
				},
				filters: params.filters || {},
				sort: params.sort || { field: 'createdAt', direction: 'desc' },
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'JetNet API',
					version: '2.0.0',
					requestId: `req_${Date.now()}`,
					duration: 0,
				},
			};
		}

		// Use the actual JetNet endpoint structure
		const endpoint = `/api/Aircraft/getAircraftList/${this.authToken}`;

		// Build JetNet API request body - use MINIMAL filters like working client
		const requestBody: any = {
			// ONLY the essential filter that works
			forsale: 'true',
		};

		// Only add filters if they are specified (don't add empty strings)
		if (params.filters?.make) requestBody.aircraftmake = params.filters.make;
		if (params.filters?.model) requestBody.aircraftmodel = params.filters.model;
		if (params.filters?.category) requestBody.aircraftcategory = params.filters.category;
		if (params.filters?.registration) requestBody.registration = params.filters.registration;
		if (params.filters?.serialNumber) requestBody.serialnumber = params.filters.serialNumber;

		// Add price filters only if specified
		if (
			params.filters?.minPrice &&
			typeof params.filters.minPrice === 'number' &&
			params.filters.minPrice > 0
		)
			requestBody.pricelow = params.filters.minPrice;
		if (
			params.filters?.maxPrice &&
			typeof params.filters.maxPrice === 'number' &&
			params.filters.maxPrice < 999999999
		)
			requestBody.pricehigh = params.filters.maxPrice;

		// Add year filters only if specified
		if (
			params.filters?.minYear &&
			typeof params.filters.minYear === 'number' &&
			params.filters.minYear > 1950
		)
			requestBody.yearlow = params.filters.minYear;
		if (
			params.filters?.maxYear &&
			typeof params.filters.maxYear === 'number' &&
			params.filters.maxYear < new Date().getFullYear()
		)
			requestBody.yearhigh = params.filters.maxYear;

		// Add hours filters only if specified
		if (
			params.filters?.minHours &&
			typeof params.filters.minHours === 'number' &&
			params.filters.minHours > 0
		)
			requestBody.hourslow = params.filters.minHours;
		if (
			params.filters?.maxHours &&
			typeof params.filters.maxHours === 'number' &&
			params.filters.maxHours < 999999
		)
			requestBody.hourshigh = params.filters.maxHours;

		console.log('📡 JetNet request body:', requestBody);

		const response = await this.request<any>(endpoint, {
			method: 'POST',
			body: JSON.stringify(requestBody),
		});

		if (!response.success) {
			console.error('❌ JetNet search failed:', response.error);
			throw new Error(response.error?.message || 'Aircraft search failed');
		}

		console.log('✅ JetNet search response received, processing...');
		console.log('🔍 Full response:', JSON.stringify(response, null, 2));

		// Parse JetNet response format (matches working client structure)
		const jetnetData = response.data;
		let aircraftList: Aircraft[] = [];

		console.log('📋 JetNet raw data keys:', Object.keys(jetnetData || {}));

		// Handle JetNet's actual response structure
		if (jetnetData && jetnetData.responsestatus) {
			console.log(`📊 JetNet response status: ${jetnetData.responsestatus}`);

			if (jetnetData.responsestatus.toUpperCase().includes('SUCCESS')) {
				const aircraftArray = jetnetData.aircraft || jetnetData.aircraftlist || [];

				console.log(
					`🛩️  Aircraft data found: ${
						Array.isArray(aircraftArray) ? aircraftArray.length : 'not array'
					}`
				);

				if (Array.isArray(aircraftArray) && aircraftArray.length > 0) {
					console.log(`📝 First aircraft:`, JSON.stringify(aircraftArray[0], null, 2));
					aircraftList = aircraftArray.map((aircraft: any) => this.mapJetNetAircraft(aircraft));
				}
			} else {
				console.log(`❌ JetNet error: ${jetnetData.responsestatus}`);
			}
		} else if (jetnetData && Array.isArray(jetnetData)) {
			// Direct array response
			aircraftList = jetnetData.map((aircraft: any) => this.mapJetNetAircraft(aircraft));
		} else if (jetnetData && jetnetData.aircraft && Array.isArray(jetnetData.aircraft)) {
			// Aircraft nested in response
			aircraftList = jetnetData.aircraft.map((aircraft: any) => this.mapJetNetAircraft(aircraft));
		} else {
			console.log('❓ Unknown JetNet response structure');
		}

		console.log(`🛩️  Final result: Found ${aircraftList.length} aircraft`);

		// Get images for each aircraft
		for (let i = 0; i < Math.min(aircraftList.length, 10); i++) {
			try {
				const images = await this.getAircraftImages(aircraftList[i].id);
				aircraftList[i].images = images as AircraftImage[];
			} catch (error) {
				console.warn(`⚠️  Failed to get images for aircraft ${aircraftList[i].id}:`, error);
			}
		}

		return {
			...response,
			data: aircraftList,
			filters: params.filters || {},
			sort: params.sort || { field: 'registration', direction: 'asc' },
			pagination: {
				page: params.page || 1,
				limit: params.limit || 50,
				total: jetnetData?.aircraftcount || aircraftList.length,
				totalPages: Math.ceil(
					(jetnetData?.aircraftcount || aircraftList.length) / (params.limit || 50)
				),
			},
		} as SearchResponse<Aircraft>;
	}

	private mapSortField(sort?: string): string {
		if (!sort) return 'price';

		const sortMap: Record<string, string> = {
			price_asc: 'price',
			price_desc: 'price',
			year_asc: 'year',
			year_desc: 'year',
			hours_asc: 'hours',
			hours_desc: 'hours',
			make_asc: 'make',
			make_desc: 'make',
		};

		return sortMap[sort] || 'price';
	}

	private mapJetNetAircraft(jetnetAircraft: any): Aircraft {
		// Map JetNet's actual field names to simplified Aircraft interface
		const aircraft: any = {
			id: jetnetAircraft.AircraftID || jetnetAircraft.aircraftid || jetnetAircraft.id || '',
			registration:
				jetnetAircraft.Registration ||
				jetnetAircraft.aircraftregistration ||
				jetnetAircraft.registration ||
				'',
			serialNumber:
				jetnetAircraft.SerialNumber ||
				jetnetAircraft.aircraftserialnumber ||
				jetnetAircraft.serialnumber ||
				'',
			make: jetnetAircraft.Make || jetnetAircraft.aircraftmake || jetnetAircraft.make || '',
			model: jetnetAircraft.Model || jetnetAircraft.aircraftmodel || jetnetAircraft.model || '',
			variant: jetnetAircraft.Variant || jetnetAircraft.variant || '',
			year:
				parseInt(jetnetAircraft.Year || jetnetAircraft.aircraftyear || jetnetAircraft.year) || 0,

			// Simplified category mapping
			category: this.mapCategory(
				jetnetAircraft.Category ||
					jetnetAircraft.AircraftCategory ||
					jetnetAircraft.aircraftcategory ||
					''
			),

			// Status information
			status: {
				marketStatus: 'For Sale',
				askingPrice:
					parseFloat(
						jetnetAircraft.Price || jetnetAircraft.aircraftprice || jetnetAircraft.price
					) || 0,
				currency: 'USD',
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				source: 'JetNet',
				verified: true,
			},

			// Location information
			location: {
				country: jetnetAircraft.BaseCountry || jetnetAircraft.Location || 'US',
				state: jetnetAircraft.BaseState || '',
				city: jetnetAircraft.BaseCity || '',
				airport: jetnetAircraft.BaseAirport || '',
			},

			// Specifications
			specifications: {
				category: this.mapCategory(
					jetnetAircraft.Category || jetnetAircraft.AircraftCategory || ''
				),
				engines: parseInt(jetnetAircraft.Engines) || 1,
				engineType: jetnetAircraft.EngineType || '',
				engineModel: jetnetAircraft.EngineModel || '',
				avionics: jetnetAircraft.Avionics ? [jetnetAircraft.Avionics] : [],
				maxSpeed: parseFloat(jetnetAircraft.MaxSpeed || jetnetAircraft.Speed) || 0,
				cruiseSpeed: parseFloat(jetnetAircraft.CruiseSpeed) || 0,
				range: parseFloat(jetnetAircraft.Range) || 0,
				maxAltitude: parseFloat(jetnetAircraft.MaxAltitude || jetnetAircraft.ServiceCeiling) || 0,
				passengerCapacity: parseInt(jetnetAircraft.Seats || jetnetAircraft.MaxSeating) || 0,
			},

			// Ownership placeholder
			ownership: {
				ownerType: 'Unknown',
				registrationCountry: jetnetAircraft.BaseCountry || 'US',
			},

			// Maintenance information
			maintenance: {
				totalTime: parseFloat(jetnetAircraft.TotalHours || jetnetAircraft.Hours) || 0,
				maintenanceStatus: 'Unknown',
			},

			// Market information
			market: {
				marketTrend: 'Unknown',
				priceHistory: [],
				comparableSales: [],
				marketAnalysis: {
					demandLevel: 'Medium',
					supplyLevel: 'Medium',
					priceStability: 'Medium',
				},
			},

			// Images and documents
			images: [], // Will be populated by getAircraftImages
			documents: [],
			history: [],

			// Timestamps
			createdAt: jetnetAircraft.CreateDate || jetnetAircraft.createdate || new Date().toISOString(),
			updatedAt: jetnetAircraft.UpdateDate || jetnetAircraft.updatedate || new Date().toISOString(),
		};

		return aircraft as Aircraft;
	}

	private mapCategory(category: string): 'Jet' | 'Turboprop' | 'Piston' | 'Helicopter' | 'Other' {
		const cat = category.toLowerCase();
		if (cat.includes('jet') || cat.includes('turbojet') || cat.includes('turbofan')) return 'Jet';
		if (cat.includes('turboprop') || cat.includes('turbo prop')) return 'Turboprop';
		if (cat.includes('piston') || cat.includes('reciprocating')) return 'Piston';
		if (cat.includes('helicopter') || cat.includes('rotorcraft')) return 'Helicopter';
		return 'Other';
	}

	async getAircraftByRegistration(registration: string): Promise<Aircraft | null> {
		const response = await this.request<Aircraft>(`/aircraft/lookup/${registration}`);

		if (!response.success) {
			if (response.error?.code === 'HTTP_404') {
				return null;
			}
			throw new Error(response.error?.message || 'Aircraft lookup failed');
		}

		return response.data || null;
	}

	async getAircraftById(aircraftId: string): Promise<Aircraft | null> {
		try {
			// Get basic aircraft information
			const aircraftResponse = await this.request<any>(
				`/Aircraft/getAircraft/${aircraftId}/${this.authToken}`,
				{ method: 'GET' },
				true
			);

			if (!aircraftResponse || !aircraftResponse.success) {
				return null;
			}

			// Get additional identification data
			const identificationResponse = await this.request<any>(
				`/Aircraft/getIdentification/${aircraftId}/${this.authToken}`,
				{ method: 'GET' },
				true
			);

			// Get status information
			const statusResponse = await this.request<any>(
				`/Aircraft/getStatus/${aircraftId}/${this.authToken}`,
				{ method: 'GET' },
				true
			);

			// Combine all data
			const aircraftData = {
				...aircraftResponse.data,
				...(identificationResponse?.data || {}),
				...(statusResponse?.data || {}),
			};

			return this.transformAircraftData(aircraftData);
		} catch (error) {
			console.error('Error fetching aircraft by ID:', error);
			return null;
		}
	}

	// Data Transformation Methods
	private transformAircraftData(apiData: any): Aircraft {
		return {
			id: apiData.id || apiData.aircraftId || '',
			registration: apiData.registration || apiData.nNumber || '',
			serialNumber: apiData.serialNumber || apiData.serial || '',
			make: apiData.make || apiData.manufacturer || '',
			model: apiData.model || '',
			variant: apiData.variant || '',
			year: apiData.year || apiData.yearManufactured || null,
			category: this.mapAircraftCategory(apiData.category || apiData.type || ''),
			status: {
				marketStatus: this.mapMarketStatus(apiData.status || 'Unknown'),
				askingPrice: apiData.askingPrice || apiData.price || null,
				currency: apiData.askingPriceCurrency || apiData.currency || 'USD',
				priceHistory: [],
				lastUpdated: new Date().toISOString(),
				source: 'JetNet API',
				verified: true,
			},
			location: {
				country: apiData.baseCountry || apiData.country || '',
				state: apiData.baseState || apiData.state || '',
				city: apiData.baseCity || apiData.city || '',
				airport: apiData.airport || '',
			},
			specifications: {
				category: this.mapAircraftCategory(apiData.category || apiData.type || ''),
				engines: apiData.engineCount || 1,
				engineType: apiData.engineType || '',
				engineModel: apiData.engineModel || '',
				maxSpeed: apiData.maxSpeed || null,
				cruiseSpeed: apiData.cruiseSpeed || null,
				range: apiData.maxRange || null,
				maxAltitude: apiData.ceiling || null,
				fuelCapacity: apiData.fuelCapacity || null,
				passengerCapacity: apiData.seatingCapacity || apiData.seats || null,
				maxTakeoffWeight: apiData.maxTakeoffWeight || null,
				emptyWeight: apiData.emptyWeight || null,
			},
			ownership: {
				ownerType: 'Unknown',
				registrationCountry: apiData.baseCountry || apiData.country || '',
			},
			maintenance: {
				totalTime: apiData.totalTimeHours || apiData.totalTime || null,
				maintenanceStatus: 'Unknown',
			},
			market: {
				marketValue: apiData.askingPrice || apiData.price || null,
				marketTrend: 'Unknown',
				priceHistory: [],
				comparableSales: [],
				marketAnalysis: {
					demandLevel: 'Medium',
					supplyLevel: 'Medium',
					priceStability: 'Medium',
				},
			},
			images: apiData.images || [],
			documents: [],
			history: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
	}

	private mapAircraftCategory(
		category: string
	): 'Jet' | 'Turboprop' | 'Piston' | 'Helicopter' | 'Other' {
		const lower = category.toLowerCase();
		if (lower.includes('jet')) return 'Jet';
		if (lower.includes('turboprop')) return 'Turboprop';
		if (lower.includes('piston') || lower.includes('reciprocating')) return 'Piston';
		if (lower.includes('helicopter') || lower.includes('rotorcraft')) return 'Helicopter';
		return 'Other';
	}

	private mapMarketStatus(
		status: string
	): 'For Sale' | 'Sold' | 'Under Contract' | 'Not For Sale' | 'Unknown' {
		const lower = status.toLowerCase();
		if (lower.includes('for sale') || lower.includes('available')) return 'For Sale';
		if (lower.includes('sold')) return 'Sold';
		if (lower.includes('contract') || lower.includes('pending')) return 'Under Contract';
		if (lower.includes('not for sale') || lower.includes('unavailable')) return 'Not For Sale';
		return 'Unknown';
	}

	async getAircraftDetails(registration: string): Promise<Aircraft | null> {
		const aircraft = await this.getAircraftByRegistration(registration);
		if (!aircraft) return null;

		// Get additional details
		const response = await this.request<any>(`/aircraft/${aircraft.id}/details`);

		if (response.success && response.data) {
			return { ...aircraft, ...response.data };
		}

		return aircraft;
	}

	async getAircraftImages(aircraftId: string): Promise<
		{
			url: string;
			thumbnailUrl: string;
			type: string;
			dateUploaded: string;
			isHero: boolean;
			order: number;
			caption: string;
			createdAt: string;
			id: string;
		}[]
	> {
		const response = await this.request<{ images: string[] }>(`/aircraft/${aircraftId}/images`);

		if (!response.success) {
			console.warn(`Failed to fetch images for aircraft ${aircraftId}:`, response.error?.message);
			return [];
		}

		return (
			response.data?.images.map((image: string) => ({
				url: image,
				thumbnailUrl: image,
				type: 'Exterior',
				dateUploaded: new Date().toISOString(),
				isHero: false,
				order: 0,
				caption: '',
				createdAt: new Date().toISOString(),
				id: image,
			})) || []
		);
	}

	// Market Intelligence Methods
	async getMarketData(): Promise<MarketTrend[]> {
		try {
			// Get real market data from JetNet API
			const response = await this.request<MarketTrend[]>('/market/data', { method: 'GET' }, true);
			if (!response.success) {
				throw new Error(response.error?.message || 'Failed to fetch market data');
			}
			return Array.isArray(response.data) ? response.data : [];
		} catch (error) {
			console.error('Failed to get market data from JetNet API:', error);
			throw new Error('JetNet API unavailable for market data - API connection required');
		}
	}

	async getMarketStats(): Promise<{
		totalAircraft: number;
		monthlyGrowth: number;
		activeListings: number;
		avgPrice: number;
	}> {
		try {
			// Get market stats from JetNet API
			const response = await this.request<any>('/market/stats', { method: 'GET' }, true);

			if (response.success && response.data) {
				return {
					totalAircraft: response.data.totalAircraft || 0,
					monthlyGrowth: response.data.monthlyGrowth || 0,
					activeListings: response.data.activeListings || 0,
					avgPrice: response.data.avgPrice || 0,
				};
			}

			throw new Error('Failed to fetch market stats from JetNet API');
		} catch (error) {
			console.error('Failed to get market stats from JetNet API:', error);
			throw new Error('JetNet API unavailable for market stats - API connection required');
		}
	}

	async getMarketTrends(category: string, period: string = '30d'): Promise<MarketTrend[]> {
		const response = await this.request<MarketTrend[]>(
			`/market/trends?category=${encodeURIComponent(category)}&period=${period}`,
			{},
			true,
			3600000 // 1 hour cache
		);

		if (!response.success) {
			throw new Error(response.error?.message || 'Failed to fetch market trends');
		}

		return response.data || [];
	}

	async getMarketIntelligence(make: string, model: string): Promise<MarketTrend | null> {
		const response = await this.request<MarketTrend>(
			`/market/intelligence?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`,
			{},
			true,
			7200000 // 2 hours cache
		);

		if (!response.success) {
			if (response.error?.code === 'HTTP_404') {
				return null;
			}
			throw new Error(response.error?.message || 'Failed to fetch market intelligence');
		}

		return response.data || null;
	}

	async getLatestMarketChanges(): Promise<any[]> {
		const response = await this.request<any[]>('/market/changes/latest', {}, false); // No cache for real-time data

		if (!response.success) {
			throw new Error(response.error?.message || 'Failed to fetch latest market changes');
		}

		return response.data || [];
	}

	// Company and Transaction Methods
	async getCompany(companyId: string): Promise<Company | null> {
		const response = await this.request<Company>(`/companies/${companyId}`);

		if (!response.success) {
			if (response.error?.code === 'HTTP_404') {
				return null;
			}
			throw new Error(response.error?.message || 'Company lookup failed');
		}

		return response.data || null;
	}

	async searchCompanies(query: string, type?: string): Promise<Company[]> {
		const response = await this.request<Company[]>('/companies/search', {
			method: 'POST',
			body: JSON.stringify({ query, type }),
		});

		if (!response.success) {
			throw new Error(response.error?.message || 'Company search failed');
		}

		return response.data || [];
	}

	async getTransactions(filters?: any): Promise<Transaction[]> {
		const response = await this.request<Transaction[]>('/transactions', {
			method: 'POST',
			body: JSON.stringify({ filters }),
		});

		if (!response.success) {
			throw new Error(response.error?.message || 'Failed to fetch transactions');
		}

		return response.data || [];
	}

	// Bulk Operations
	async bulkAircraftLookup(
		registrations: string[]
	): Promise<{ [registration: string]: Aircraft | null }> {
		const results: { [registration: string]: Aircraft | null } = {};

		// Process in batches to avoid overwhelming the API
		const batchSize = 10;
		const batches = [];

		for (let i = 0; i < registrations.length; i += batchSize) {
			batches.push(registrations.slice(i, i + batchSize));
		}

		for (const batch of batches) {
			const promises = batch.map(async registration => {
				try {
					const aircraft = await this.getAircraftByRegistration(registration);
					return { registration, aircraft };
				} catch (error) {
					console.error(`Bulk lookup error for ${registration}:`, error);
					return { registration, aircraft: null };
				}
			});

			const batchResults = await Promise.all(promises);
			batchResults.forEach(({ registration, aircraft }) => {
				results[registration] = aircraft;
			});
		}

		return results;
	}

	async bulkMarketIntelligence(
		aircraft: { make: string; model: string }[]
	): Promise<{ [key: string]: MarketTrend | null }> {
		const results: { [key: string]: MarketTrend | null } = {};

		const batchSize = 5;
		const batches = [];

		for (let i = 0; i < aircraft.length; i += batchSize) {
			batches.push(aircraft.slice(i, i + batchSize));
		}

		for (const batch of batches) {
			const promises = batch.map(async ({ make, model }) => {
				try {
					const marketData = await this.getMarketIntelligence(make, model);
					return { key: `${make}-${model}`, marketData };
				} catch (error) {
					console.error(`Bulk market intelligence error for ${make} ${model}:`, error);
					return { key: `${make}-${model}`, marketData: null };
				}
			});

			const batchResults = await Promise.all(promises);
			batchResults.forEach(({ key, marketData }) => {
				results[key] = marketData;
			});
		}

		return results;
	}

	// Alerts and Notifications
	async getAlerts(filters?: any): Promise<any[]> {
		const response = await this.request<any[]>(
			'/alerts',
			{
				method: 'POST',
				body: JSON.stringify({ filters }),
			},
			true,
			300000
		); // 5 minutes cache

		if (!response.success) {
			throw new Error(response.error?.message || 'Failed to fetch alerts');
		}

		return response.data || [];
	}

	async markAlertAsRead(alertId: string): Promise<boolean> {
		const response = await this.request<any>(
			`/alerts/${alertId}/read`,
			{
				method: 'POST',
			},
			false
		);

		return response.success;
	}

	// Market Opportunities
	async getMarketOpportunities(filters?: any): Promise<any[]> {
		const response = await this.request<any[]>(
			'/market/opportunities',
			{
				method: 'POST',
				body: JSON.stringify({ filters }),
			},
			true,
			600000
		); // 10 minutes cache

		if (!response.success) {
			throw new Error(response.error?.message || 'Failed to fetch market opportunities');
		}

		return response.data || [];
	}

	// Data Export
	async exportAircraftData(filters: any, format: 'csv' | 'json' = 'json'): Promise<string | any> {
		const response = await this.request<any>(
			'/aircraft/export',
			{
				method: 'POST',
				body: JSON.stringify({ filters, format }),
			},
			false
		); // Don't cache export requests

		if (!response.success) {
			throw new Error(response.error?.message || 'Export failed');
		}

		return format === 'csv' ? response.data?.downloadUrl : response.data;
	}

	// WebSocket Support for Real-time Updates
	async subscribeToUpdates(callback: (data: any) => void): Promise<WebSocket | null> {
		try {
			await this.ensureAuthenticated();

			const wsUrl = this.baseURL.replace('http', 'ws') + '/ws';
			const ws = new WebSocket(wsUrl, ['jetnet-api', this.authToken || '']);

			ws.onopen = () => {
				console.log('WebSocket connected to JetNet API');
			};

			ws.onmessage = event => {
				try {
					const data = JSON.parse(event.data);
					callback(data);
				} catch (error) {
					console.error('WebSocket message parsing error:', error);
				}
			};

			ws.onerror = error => {
				console.error('WebSocket error:', error);
			};

			ws.onclose = () => {
				console.log('WebSocket connection closed');
			};

			return ws;
		} catch (error) {
			console.error('WebSocket subscription error:', error);
			return null;
		}
	}

	// Webhook Management
	async createWebhook(url: string, events: string[]): Promise<{ id: string; success: boolean }> {
		const response = await this.request<{ webhookId: string }>(
			'/webhooks',
			{
				method: 'POST',
				body: JSON.stringify({ url, events }),
			},
			false
		);

		if (!response.success) {
			throw new Error(response.error?.message || 'Webhook creation failed');
		}

		return {
			id: response.data?.webhookId || '',
			success: response.success,
		};
	}

	async deleteWebhook(webhookId: string): Promise<boolean> {
		const response = await this.request<any>(
			`/webhooks/${webhookId}`,
			{
				method: 'DELETE',
			},
			false
		);

		return response.success;
	}

	// Health and Status Methods
	async getApiStatus(): Promise<any> {
		try {
			// Test authentication by making a simple API call
			const response = await this.request<any>(
				'/Admin/APILogin',
				{
					method: 'POST',
					body: JSON.stringify({
						EmailAddress: this.email,
						Password: this.password,
					}),
				},
				false
			); // Don't cache health checks
			return response;
		} catch (error) {
			return {
				success: false,
				data: {
					authenticated: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				},
				metadata: {
					requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					duration: 0,
					version: '2.0.0',
				},
			};
		}
	}

	// Cache Management
	clearCache(): void {
		this.cache.clear();
	}

	getCacheStats(): { size: number; hitRate?: number } {
		return {
			size: this.cache.size(),
			// Hit rate calculation would require tracking hits/misses
		};
	}

	// Rate Limit Status
	getRateLimitStatus(): { requests: number; maxRequests: number; windowMs: number } {
		return {
			requests: this.rateLimiter['requests'].length,
			maxRequests: this.rateLimiter['maxRequests'],
			windowMs: this.rateLimiter['windowMs'],
		};
	}

	// Circuit Breaker Status
	getCircuitBreakerStatus(): { state: string; failures: number } {
		return {
			state: this.circuitBreaker['state'],
			failures: this.circuitBreaker['failures'],
		};
	}
}

// Export singleton instance
export const jetNetClient = new JetNetAPIClient();
