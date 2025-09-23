/**
 * JetNet API Integration Service
 * Integrates with JetNet Connect API for real aircraft data
 */

export interface JetNetAuthResponse {
	bearerToken: string;
	apiToken: string;
	status?: string;
}

export interface JetNetAircraftData {
	aircraftid: string;
	make: string;
	model: string;
	yearmfr?: number;
	yeardlv?: number;
	yeardelivered?: number;
	regnbr?: string;
	sernbr?: string;
	askingprice?: number;
	asking?: number;
	basecity?: string;
	acbasecity?: string;
	acbasename?: string;
	basestate?: string;
	basecountry?: string;
	baseairportid?: string;
	baseicaocode?: string;
	baseiata?: string;
	aftt?: string;
	achours?: number;
	estaftt?: number;
	enginesn1?: string;
	enginesn2?: string;
	acavionics?: string;
	acpassengers?: string;
	acphotos?: string;
	acnotes?: string;
	forsale?: string | boolean;
	marketstatus?: string;
	exclusive?: string;
	leased?: string;
	listdate?: string;
	[key: string]: unknown;
}

export interface JetNetBulkExportResponse {
	responsestatus: string;
	aircraftcount: number;
	responseid?: string;
	aircraft: JetNetAircraftData[];
}

export interface JetNetBulkExportRequest {
	forsale?: string;
	basecountry?: string;
	aircraftchanges?: string;
	showHistoricalAcRefs?: boolean;
	airframetype?: string;
	maketype?: string;
	yearmfr?: number;
	basestate?: string[];
	basecountrylist?: string[];
	makelist?: string[];
	exactMatchReg?: boolean;
	exactMatchSer?: boolean;
	exactMatchMake?: boolean;
	exactMatchModel?: boolean;
	caseSensitive?: boolean;
	includeInactive?: boolean;
	includeDeleted?: boolean;
}

class JetNetAPIService {
	private baseUrl = 'https://customer.jetnetconnect.com';
	private credentials = {
		email: 'chase@theskylinebusinessgroup.com',
		password: 'Smiley654!',
	};
	private userAgent = 'ACE-Aircraft-Sales/1.0';

	private authCache: {
		bearerToken?: string;
		apiToken?: string;
		expiresAt?: number;
	} = {};

	/**
	 * Authenticate with JetNet API
	 */
	async authenticate(): Promise<JetNetAuthResponse> {
		// Check if we have valid cached credentials
		if (
			this.authCache.bearerToken &&
			this.authCache.expiresAt &&
			Date.now() < this.authCache.expiresAt
		) {
			return {
				bearerToken: this.authCache.bearerToken,
				apiToken: this.authCache.apiToken!,
			};
		}

		try {
			const response = await fetch(`${this.baseUrl}/api/Admin/APILogin`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					'User-Agent': 'ACE-Aircraft-Sales/1.0',
				},
				body: JSON.stringify({
					emailaddress: this.credentials.email,
					password: this.credentials.password,
				}),
			});

			if (!response.ok) {
				throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
			}

			const authData = await response.json();

			// Handle different response formats
			let bearerToken: string;
			let apiToken: string;

			if (Array.isArray(authData) && authData.length > 0) {
				bearerToken = authData[0].bearerToken;
				apiToken = authData[0].apiToken;
			} else {
				bearerToken = authData.bearerToken;
				apiToken = authData.apiToken;
			}

			if (!bearerToken || !apiToken) {
				throw new Error('Invalid authentication response: missing tokens');
			}

			// Cache credentials for 50 minutes (tokens expire in 1 hour)
			this.authCache = {
				bearerToken,
				apiToken,
				expiresAt: Date.now() + 50 * 60 * 1000, // 50 minutes
			};

			return { bearerToken, apiToken };
		} catch (error) {
			console.error('JetNet authentication error:', error);
			throw new Error(
				`Failed to authenticate with JetNet: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			);
		}
	}

	/**
	 * Make authenticated request to JetNet API
	 */
	private async makeRequest<T>(
		endpoint: string,
		method: 'GET' | 'POST' = 'GET',
		body?: Record<string, unknown>,
		retries = 3
	): Promise<T> {
		const auth = await this.authenticate();
		const url = `${this.baseUrl}${endpoint.replace('{{securityToken}}', auth.apiToken)}`;

		const headers: HeadersInit = {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			Authorization: `Bearer ${auth.bearerToken}`,
			'User-Agent': this.userAgent,
		};

		try {
			const response = await fetch(url, {
				method,
				headers,
				body: body ? JSON.stringify(body) : undefined,
				signal: AbortSignal.timeout(120000), // 120 seconds timeout
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error(
					`JetNet API request failed for ${endpoint}: ${response.status} ${response.statusText} - ${errorText}`
				);
				if (response.status === 401 && retries > 0) {
					console.log('Token expired or invalid, re-authenticating and retrying...');
					this.authCache = {}; // Clear invalid token
					return this.makeRequest<T>(endpoint, method, body, retries - 1);
				}
				throw new Error(`JetNet API request failed: ${response.statusText} - ${errorText}`);
			}

			return (await response.json()) as T;
		} catch (error) {
			console.error(`Error making JetNet API request to ${endpoint}:`, error);
			throw error;
		}
	}

	/**
	 * Get bulk aircraft export with comprehensive filtering
	 */
	async getBulkAircraftExport(
		request: JetNetBulkExportRequest = {}
	): Promise<JetNetBulkExportResponse> {
		// Default request parameters for comprehensive data
		const defaultRequest: JetNetBulkExportRequest = {
			forsale: 'All', // Get all aircraft, not just for sale
			aircraftchanges: 'true',
			showHistoricalAcRefs: true,
			exactMatchReg: false,
			exactMatchSer: false,
			exactMatchMake: false,
			exactMatchModel: false,
			caseSensitive: false,
			includeInactive: true, // Include inactive aircraft
			includeDeleted: false,
			...request,
		};

		try {
			const data = await this.makeRequest<JetNetBulkExportResponse>(
				'/api/Aircraft/getBulkAircraftExport/{{securityToken}}',
				'POST',
				defaultRequest as Record<string, unknown>
			);

			// Handle different response formats
			if (Array.isArray(data)) {
				return {
					responsestatus: 'SUCCESS',
					aircraftcount: data.length,
					aircraft: data,
				};
			} else {
				return data as JetNetBulkExportResponse;
			}
		} catch (error) {
			console.error('JetNet bulk export error:', error);
			throw new Error(
				`Failed to fetch aircraft data: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Get aircraft list with filtering
	 */
	async getAircraftList(request: JetNetBulkExportRequest = {}): Promise<JetNetBulkExportResponse> {
		const auth = await this.authenticate();

		const defaultRequest: JetNetBulkExportRequest = {
			forsale: 'True',
			aircraftchanges: 'true',
			...request,
		};

		try {
			const response = await fetch(
				`${this.baseUrl}/api/Aircraft/getAircraftList/${auth.apiToken}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						Authorization: `Bearer ${auth.bearerToken}`,
						'User-Agent': 'ACE-Aircraft-Sales/1.0',
					},
					body: JSON.stringify(defaultRequest),
				}
			);

			if (!response.ok) {
				throw new Error(`Aircraft list failed: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			if (Array.isArray(data)) {
				return {
					responsestatus: 'SUCCESS',
					aircraftcount: data.length,
					aircraft: data,
				};
			} else {
				return data as JetNetBulkExportResponse;
			}
		} catch (error) {
			console.error('JetNet aircraft list error:', error);
			throw new Error(
				`Failed to fetch aircraft list: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Get comprehensive aircraft data for market intelligence
	 */
	async getComprehensiveAircraftData(): Promise<JetNetBulkExportResponse> {
		return this.getBulkAircraftExport({
			forsale: 'True',
			aircraftchanges: 'true',
			showHistoricalAcRefs: true,
			exactMatchReg: false,
			exactMatchSer: false,
			exactMatchMake: false,
			exactMatchModel: false,
			caseSensitive: false,
			includeInactive: false,
			includeDeleted: false,
		});
	}

	/**
	 * Get detailed aircraft status information
	 */
	async getAircraftStatus(aircraftId: string): Promise<Record<string, unknown>> {
		console.log(`Fetching aircraft status for ${aircraftId}...`);
		return this.makeRequest<Record<string, unknown>>(
			`/api/Aircraft/getStatus/${aircraftId}/{{securityToken}}`,
			'GET'
		);
	}

	/**
	 * Get detailed aircraft airframe information
	 */
	async getAircraftAirframe(aircraftId: string): Promise<Record<string, unknown>> {
		console.log(`Fetching aircraft airframe for ${aircraftId}...`);
		return this.makeRequest<Record<string, unknown>>(
			`/api/Aircraft/getAirframe/${aircraftId}/{{securityToken}}`,
			'GET'
		);
	}

	/**
	 * Get detailed aircraft engine information
	 */
	async getAircraftEngines(aircraftId: string): Promise<Record<string, unknown>> {
		console.log(`Fetching aircraft engines for ${aircraftId}...`);
		return this.makeRequest<Record<string, unknown>>(
			`/api/Aircraft/getEngine/${aircraftId}/{{securityToken}}`,
			'GET'
		);
	}

	/**
	 * Get detailed aircraft APU information
	 */
	async getAircraftAPU(aircraftId: string): Promise<Record<string, unknown>> {
		console.log(`Fetching aircraft APU for ${aircraftId}...`);
		return this.makeRequest<Record<string, unknown>>(
			`/api/Aircraft/getApu/${aircraftId}/{{securityToken}}`,
			'GET'
		);
	}

	/**
	 * Get detailed aircraft avionics information
	 */
	async getAircraftAvionics(aircraftId: string): Promise<Record<string, unknown>> {
		console.log(`Fetching aircraft avionics for ${aircraftId}...`);
		return this.makeRequest<Record<string, unknown>>(
			`/api/Aircraft/getAvionics/${aircraftId}/{{securityToken}}`,
			'GET'
		);
	}

	/**
	 * Get detailed aircraft additional equipment information
	 */
	async getAircraftAdditionalEquipment(aircraftId: string): Promise<Record<string, unknown>> {
		console.log(`Fetching aircraft additional equipment for ${aircraftId}...`);
		return this.makeRequest<Record<string, unknown>>(
			`/api/Aircraft/getAdditionalEquipment/${aircraftId}/{{securityToken}}`,
			'GET'
		);
	}

	/**
	 * Get detailed aircraft interior information
	 */
	async getAircraftInterior(aircraftId: string): Promise<Record<string, unknown>> {
		console.log(`Fetching aircraft interior for ${aircraftId}...`);
		return this.makeRequest<Record<string, unknown>>(
			`/api/Aircraft/getInterior/${aircraftId}/{{securityToken}}`,
			'GET'
		);
	}

	/**
	 * Get detailed aircraft exterior information
	 */
	async getAircraftExterior(aircraftId: string): Promise<Record<string, unknown>> {
		console.log(`Fetching aircraft exterior for ${aircraftId}...`);
		return this.makeRequest<Record<string, unknown>>(
			`/api/Aircraft/getExterior/${aircraftId}/{{securityToken}}`,
			'GET'
		);
	}

	/**
	 * Get detailed aircraft maintenance information
	 */
	async getAircraftMaintenance(aircraftId: string): Promise<Record<string, unknown>> {
		console.log(`Fetching aircraft maintenance for ${aircraftId}...`);
		return this.makeRequest<Record<string, unknown>>(
			`/api/Aircraft/getMaintenance/${aircraftId}/{{securityToken}}`,
			'GET'
		);
	}

	/**
	 * Get detailed aircraft company relationships information
	 */
	async getAircraftCompanyRelationships(aircraftId: string): Promise<Record<string, unknown>> {
		console.log(`Fetching aircraft company relationships for ${aircraftId}...`);
		return this.makeRequest<Record<string, unknown>>(
			`/api/Aircraft/getCompanyrelationships/${aircraftId}/{{securityToken}}`,
			'GET'
		);
	}

	/**
	 * Get aircraft features
	 */
	async getAircraftFeatures(aircraftId: string): Promise<Record<string, unknown>> {
		return this.makeRequest<Record<string, unknown>>(
			`/api/Aircraft/getFeatures/${aircraftId}/{{securityToken}}`
		);
	}

	/**
	 * Get aircraft pictures/images
	 */
	async getAircraftPictures(aircraftId: string): Promise<Record<string, unknown>> {
		return this.makeRequest<Record<string, unknown>>(
			`/api/Aircraft/getPictures/${aircraftId}/{{securityToken}}`
		);
	}

	/**
	 * Get comprehensive aircraft details including all subsystems
	 */
	async getAircraftComprehensiveDetails(aircraftId: string): Promise<{
		status: Record<string, unknown>;
		airframe: Record<string, unknown>;
		engines: Record<string, unknown>;
		apu: Record<string, unknown>;
		avionics: Record<string, unknown>;
		features: Record<string, unknown>;
		additionalEquipment: Record<string, unknown>;
		interior: Record<string, unknown>;
		exterior: Record<string, unknown>;
		maintenance: Record<string, unknown>;
		companyRelationships: Record<string, unknown>;
		pictures: Record<string, unknown>;
	}> {
		console.log(`Fetching comprehensive aircraft details for ${aircraftId}...`);

		try {
			const [
				status,
				airframe,
				engines,
				apu,
				avionics,
				features,
				additionalEquipment,
				interior,
				exterior,
				maintenance,
				companyRelationships,
				pictures,
			] = await Promise.all([
				this.getAircraftStatus(aircraftId),
				this.getAircraftAirframe(aircraftId),
				this.getAircraftEngines(aircraftId),
				this.getAircraftAPU(aircraftId),
				this.getAircraftAvionics(aircraftId),
				this.getAircraftFeatures(aircraftId),
				this.getAircraftAdditionalEquipment(aircraftId),
				this.getAircraftInterior(aircraftId),
				this.getAircraftExterior(aircraftId),
				this.getAircraftMaintenance(aircraftId),
				this.getAircraftCompanyRelationships(aircraftId),
				this.getAircraftPictures(aircraftId),
			]);

			return {
				status,
				airframe,
				engines,
				apu,
				avionics,
				features,
				additionalEquipment,
				interior,
				exterior,
				maintenance,
				companyRelationships,
				pictures,
			};
		} catch (error) {
			console.error(`Error fetching comprehensive aircraft details for ${aircraftId}:`, error);
			throw error;
		}
	}

	/**
	 * Transform JetNet aircraft data to our internal format
	 */
	transformAircraftData(jetnetAircraft: JetNetAircraftData[], index: number = 0) {
		return jetnetAircraft.map((aircraft, idx) => ({
			// Core identification
			id: `jetnet-${aircraft.aircraftid || Date.now()}-${index}-${idx}`,
			aircraftId: aircraft.aircraftid,

			// Basic aircraft info
			manufacturer: aircraft.make || 'Unknown',
			model: aircraft.model || 'Unknown',
			year: aircraft.yearmfr || aircraft.yeardlv || aircraft.yeardelivered || null,
			yearManufactured: aircraft.yearmfr || null,

			// Registration and serial
			registration: aircraft.regnbr || '',
			serialNumber: aircraft.sernbr || '',

			// Pricing
			price: aircraft.askingprice
				? parseFloat(aircraft.askingprice.toString())
				: aircraft.asking
				? parseFloat(aircraft.asking.toString())
				: null,
			askingPrice: aircraft.askingprice ? parseFloat(aircraft.askingprice.toString()) : null,
			currency: 'USD',

			// Location and base
			location: aircraft.basecity || aircraft.acbasecity || aircraft.acbasename || '',

			// Flight hours
			totalTimeHours: aircraft.aftt ? parseFloat(aircraft.aftt.toString()) : null,

			// Market status
			forSale: aircraft.forsale === 'Y' || aircraft.forsale === 'True' || aircraft.forsale === true,

			// Dates
			dateListed: aircraft.listdate ? new Date(aircraft.listdate) : null,

			// Status
			status: aircraft.forsale === 'Y' || aircraft.forsale === 'True' ? 'AVAILABLE' : 'SOLD',

			// Processing metadata - these fields are not in the Prisma schema
		}));
	}

	/**
	 * Get model intelligence data
	 */
	async getModelIntelligence(make: string, model: string, year?: number) {
		const auth = await this.authenticate();

		try {
			const response = await fetch(
				`${this.baseUrl}/api/Model/getModelIntelligence/${auth.apiToken}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						Authorization: `Bearer ${auth.bearerToken}`,
						'User-Agent': 'ACE-Aircraft-Sales/1.0',
					},
					body: JSON.stringify({
						make,
						model,
						yearmfr: year,
					}),
				}
			);

			if (!response.ok) {
				throw new Error(`Model intelligence failed: ${response.status} ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			console.error('JetNet model intelligence error:', error);
			throw new Error(
				`Failed to fetch model intelligence: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			);
		}
	}

	/**
	 * Get model market trends
	 */
	async getModelMarketTrends(
		make: string,
		model: string,
		year?: number,
		startDate?: string,
		endDate?: string
	) {
		const auth = await this.authenticate();

		try {
			const response = await fetch(
				`${this.baseUrl}/api/Model/getModelMarketTrends/${auth.apiToken}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						Authorization: `Bearer ${auth.bearerToken}`,
						'User-Agent': 'ACE-Aircraft-Sales/1.0',
					},
					body: JSON.stringify({
						make,
						model,
						yearmfr: year,
						startdate: startDate,
						enddate: endDate,
					}),
				}
			);

			if (!response.ok) {
				throw new Error(`Model market trends failed: ${response.status} ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			console.error('JetNet model market trends error:', error);
			throw new Error(
				`Failed to fetch model market trends: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			);
		}
	}
}

export const jetnetAPI = new JetNetAPIService();
