import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface JetNetCredentials {
	email: string;
	password: string;
}

interface JetNetAuthResponse {
	bearerToken: string;
	apiToken: string;
	expiresIn?: number;
}

interface JetNetAircraft {
	aircraftId: number;
	make: string;
	model: string;
	year?: number;
	yearManufactured?: number;
	yearDelivered?: number;
	registration?: string;
	serialNumber?: string;
	price?: number;
	askingPrice?: number;
	currency?: string;
	location?: string;
	baseCity?: string;
	baseState?: string;
	baseCountry?: string;
	baseAirportId?: string;
	baseIcaoCode?: string;
	baseIataCode?: string;
	totalTime?: number;
	totalTimeHours?: number;
	estimatedAftt?: number;
	engineSn1?: string;
	engineSn2?: string;
	avionics?: string;
	passengers?: string;
	photos?: string;
	notes?: string;
	forsale?: boolean;
	marketStatus?: string;
	exclusive?: string;
	leased?: string;
	listDate?: Date;
	status?: string;
	rawData?: any;
	processedAt?: string;
	dataSource?: string;
	enrichment?: {
		status?: any;
		airframe?: any;
		engines?: any;
		apu?: any;
		avionics?: any;
		features?: any;
		additionalEquipment?: any;
		interior?: any;
		exterior?: any;
		maintenance?: any;
		relationships?: any;
	};
	techSummary?: {
		engines?: number;
		avionicsSuite?: string;
		maintenanceDueInDays?: number;
		interiorYear?: number;
		exteriorYear?: number;
		featuresCount?: number;
	};
}

interface WorkflowState {
	workflowId: string;
	startTime: string;
	steps: Array<{
		step: string;
		status: string;
		timestamp: string;
		message: string;
	}>;
	errors: Array<{
		step: string;
		error: string;
		timestamp: string;
	}>;
	metrics: {
		startTime: number;
		completedSteps: number;
	};
	data: {
		auth?: any;
		aircraft?: any;
		databaseSync?: any;
		reports?: any;
	};
}

export class JetNetComprehensiveClient {
	private baseUrl = 'https://customer.jetnetconnect.com/api';
	private credentials: JetNetCredentials;
	private authTokens: JetNetAuthResponse | null = null;

	constructor(credentials: JetNetCredentials) {
		this.credentials = credentials;
	}

	/**
	 * Step 1: Authenticate with JetNet API
	 */
	private async authenticate(): Promise<JetNetAuthResponse> {
		try {
			const response = await fetch(`${this.baseUrl}/Admin/APILogin`, {
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

			const data = await response.json();

			if (!data.bearerToken || !data.apiToken) {
				throw new Error('Invalid authentication response: missing tokens');
			}

			this.authTokens = {
				bearerToken: data.bearerToken,
				apiToken: data.apiToken,
				expiresIn: 3600,
			};

			return this.authTokens;
		} catch (error) {
			console.error('JetNet authentication error:', error);
			throw error;
		}
	}

	/**
	 * Step 2: Fetch bulk aircraft data
	 */
	private async fetchBulkAircraftData(): Promise<any[]> {
		if (!this.authTokens) {
			throw new Error('Not authenticated. Call authenticate() first.');
		}

		try {
			const response = await fetch(
				`${this.baseUrl}/Aircraft/getBulkAircraftExport/${this.authTokens.apiToken}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						Authorization: `Bearer ${this.authTokens.bearerToken}`,
						'User-Agent': 'ACE-Aircraft-Sales/1.0',
					},
					body: JSON.stringify({
						forsale: 'True',
						aircraftchanges: 'true',
						showHistoricalAcRefs: true,
						exactMatchReg: false,
						exactMatchSer: false,
						exactMatchMake: false,
						exactMatchModel: false,
						caseSensitive: false,
						includeInactive: true,
						includeDeleted: false,
					}),
				}
			);

			if (!response.ok) {
				throw new Error(`Bulk aircraft fetch failed: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			return Array.isArray(data.aircraft) ? data.aircraft : [];
		} catch (error) {
			console.error('Bulk aircraft fetch error:', error);
			throw error;
		}
	}

	/**
	 * Step 3: Process aircraft data (normalize and transform)
	 */
	private processAircraftData(rawAircraft: any[]): JetNetAircraft[] {
		const toNum = (v: any) =>
			v == null || v === '' ? null : typeof v === 'number' ? v : Number(v);
		const toYear = (v: any) => {
			const n = toNum(v);
			return n && n > 1900 && n < 3000 ? n : null;
		};
		const truthyY = (v: any) => v === 'Y' || v === 'True' || v === true;

		return rawAircraft
			.map((aircraft, i) => {
				const year = toYear(aircraft.yearmfr ?? aircraft.yeardlv ?? aircraft.yeardelivered);
				const price = toNum(aircraft.askingprice ?? aircraft.asking);
				const aftt = toNum(aircraft.aftt ?? aircraft.achours);

				return {
					aircraftId: aircraft.aircraftid,
					make: aircraft.make || 'Unknown',
					model: aircraft.model || 'Unknown',
					year,
					yearManufactured: toYear(aircraft.yearmfr),
					yearDelivered: toYear(aircraft.yeardlv),
					registration: aircraft.regnbr || '',
					serialNumber: aircraft.sernbr || '',
					price,
					askingPrice: toNum(aircraft.askingprice),
					currency: 'USD',
					location: aircraft.basecity || aircraft.acbasecity || aircraft.acbasename || '',
					baseCity: aircraft.basecity || '',
					baseState: aircraft.basestate || '',
					baseCountry: aircraft.basecountry || '',
					baseAirportId: aircraft.baseairportid || '',
					baseIcaoCode: aircraft.baseicaocode || '',
					baseIataCode: aircraft.baseiata || '',
					totalTime: aftt,
					totalTimeHours: aftt,
					estimatedAftt: toNum(aircraft.estaftt),
					engineSn1: aircraft.enginesn1 || '',
					engineSn2: aircraft.enginesn2 || '',
					avionics: aircraft.acavionics || '',
					passengers: aircraft.acpassengers ?? '',
					photos: aircraft.acphotos,
					notes: aircraft.acnotes || '',
					forsale: truthyY(aircraft.forsale),
					marketStatus: aircraft.marketstatus || '',
					exclusive: aircraft.exclusive ?? '',
					leased: aircraft.leased ?? '',
					listDate: aircraft.listdate ? new Date(aircraft.listdate) : null,
					status: truthyY(aircraft.forsale) ? 'AVAILABLE' : 'SOLD',
					rawData: aircraft,
					processedAt: new Date().toISOString(),
					dataSource: 'JetNet-BulkExport',
				};
			})
			.filter(Boolean);
	}

	/**
	 * Step 4: Enrich aircraft data with detailed information from all endpoints
	 */
	private async enrichAircraftData(aircraft: JetNetAircraft): Promise<JetNetAircraft> {
		if (!this.authTokens) {
			throw new Error('Not authenticated. Call authenticate() first.');
		}

		const headers = {
			Accept: 'application/json',
			'User-Agent': 'ACE-Aircraft-Sales/1.0',
			Authorization: `Bearer ${this.authTokens.bearerToken}`,
		};

		const endpoints = [
			{
				name: 'status',
				url: `${this.baseUrl}/Aircraft/getStatus/${aircraft.aircraftId}/${this.authTokens.apiToken}`,
			},
			{
				name: 'airframe',
				url: `${this.baseUrl}/Aircraft/getAirframe/${aircraft.aircraftId}/${this.authTokens.apiToken}`,
			},
			{
				name: 'engines',
				url: `${this.baseUrl}/Aircraft/getEngine/${aircraft.aircraftId}/${this.authTokens.apiToken}`,
			},
			{
				name: 'apu',
				url: `${this.baseUrl}/Aircraft/getApu/${aircraft.aircraftId}/${this.authTokens.apiToken}`,
			},
			{
				name: 'avionics',
				url: `${this.baseUrl}/Aircraft/getAvionics/${aircraft.aircraftId}/${this.authTokens.apiToken}`,
			},
			{
				name: 'features',
				url: `${this.baseUrl}/Aircraft/getFeatures/${aircraft.aircraftId}/${this.authTokens.apiToken}`,
			},
			{
				name: 'additionalEquipment',
				url: `${this.baseUrl}/Aircraft/getAdditionalEquipment/${aircraft.aircraftId}/${this.authTokens.apiToken}`,
			},
			{
				name: 'interior',
				url: `${this.baseUrl}/Aircraft/getInterior/${aircraft.aircraftId}/${this.authTokens.apiToken}`,
			},
			{
				name: 'exterior',
				url: `${this.baseUrl}/Aircraft/getExterior/${aircraft.aircraftId}/${this.authTokens.apiToken}`,
			},
			{
				name: 'maintenance',
				url: `${this.baseUrl}/Aircraft/getMaintenance/${aircraft.aircraftId}/${this.authTokens.apiToken}`,
			},
			{
				name: 'relationships',
				url: `${this.baseUrl}/Aircraft/getCompanyrelationships/${aircraft.aircraftId}/${this.authTokens.apiToken}`,
			},
		];

		const enrichment: any = {};

		// Fetch all endpoint data in parallel
		const promises = endpoints.map(async endpoint => {
			try {
				const response = await fetch(endpoint.url, { headers });
				if (response.ok) {
					const data = await response.json();
					return { name: endpoint.name, data };
				} else {
					console.warn(
						`Failed to fetch ${endpoint.name} for aircraft ${aircraft.aircraftId}: ${response.status}`
					);
					return { name: endpoint.name, data: {} };
				}
			} catch (error) {
				console.warn(`Error fetching ${endpoint.name} for aircraft ${aircraft.aircraftId}:`, error);
				return { name: endpoint.name, data: {} };
			}
		});

		const results = await Promise.all(promises);

		// Combine all enrichment data
		results.forEach(result => {
			enrichment[result.name] = result.data;
		});

		// Generate tech summary
		const techSummary = {
			engines: Array.isArray(enrichment.engines?.engines)
				? enrichment.engines.engines.length
				: enrichment.engines && enrichment.engines.model
					? 1
					: 0,
			avionicsSuite: enrichment.avionics?.suite || enrichment.avionics?.primary || null,
			maintenanceDueInDays: enrichment.maintenance?.nextDueDays ?? null,
			interiorYear: enrichment.interior?.year ?? null,
			exteriorYear: enrichment.exterior?.year ?? null,
			featuresCount: Array.isArray(enrichment.features)
				? enrichment.features.length
				: Object.keys(enrichment.features || {}).length,
		};

		return {
			...aircraft,
			enrichment,
			techSummary,
		};
	}

	/**
	 * Step 5: Sync enriched data to database
	 */
	private async syncToDatabase(enrichedAircraft: JetNetAircraft[]): Promise<{
		totalProcessed: number;
		created: number;
		updated: number;
		errors: number;
		errorDetails: any[];
	}> {
		const syncResults = {
			totalProcessed: 0,
			created: 0,
			updated: 0,
			errors: 0,
			errorDetails: [] as any[],
		};

		for (const aircraft of enrichedAircraft) {
			try {
				syncResults.totalProcessed++;

				// Transform JetNet data to our schema with ALL endpoint data
				const transformedAircraft = {
					aircraftId: aircraft.aircraftId,
					manufacturer: aircraft.make || 'Unknown',
					model: aircraft.model || 'Unknown',
					variant: aircraft.model,
					year: aircraft.year || aircraft.yearManufactured || aircraft.yearDelivered,
					yearManufactured: aircraft.yearManufactured,
					price: aircraft.price || aircraft.askingPrice,
					askingPrice: aircraft.askingPrice,
					currency: aircraft.currency || 'USD',
					location: aircraft.location || aircraft.baseCity || '',
					status: aircraft.forsale ? 'AVAILABLE' : 'SOLD',
					image: aircraft.photos || '',
					description: aircraft.notes || '',
					specifications: JSON.stringify({
						// Basic aircraft info
						registration: aircraft.registration,
						serialNumber: aircraft.serialNumber,
						baseCity: aircraft.baseCity,
						baseState: aircraft.baseState,
						baseCountry: aircraft.baseCountry,
						baseAirportId: aircraft.baseAirportId,
						baseIcaoCode: aircraft.baseIcaoCode,
						baseIataCode: aircraft.baseIataCode,
						totalTimeHours: aircraft.totalTimeHours || aircraft.totalTime,
						estimatedAftt: aircraft.estimatedAftt,
						engineSn1: aircraft.engineSn1,
						engineSn2: aircraft.engineSn2,
						avionics: aircraft.avionics,
						passengers: aircraft.passengers,
						marketStatus: aircraft.marketStatus,
						exclusive: aircraft.exclusive,
						leased: aircraft.leased,
						dataSource: aircraft.dataSource || 'JetNet-Comprehensive',
						processedAt: aircraft.processedAt,
						// Raw data for debugging
						rawData: aircraft.rawData,
					}),
					features: aircraft.enrichment
						? JSON.stringify({
								// Features endpoint data
								features: aircraft.enrichment.features,
								// Additional Equipment endpoint data
								additionalEquipment: aircraft.enrichment.additionalEquipment,
								// Interior endpoint data
								interior: aircraft.enrichment.interior,
								// Exterior endpoint data
								exterior: aircraft.enrichment.exterior,
								// Engines endpoint data
								engines: aircraft.enrichment.engines,
								// APU endpoint data
								apu: aircraft.enrichment.apu,
								// Avionics endpoint data
								avionics: aircraft.enrichment.avionics,
								// Tech summary from processing
								techSummary: aircraft.techSummary,
							})
						: '',
					contactInfo: aircraft.enrichment?.relationships
						? JSON.stringify({
								// Relationships endpoint data
								relationships: aircraft.enrichment.relationships,
								// Company contacts
								companies: aircraft.enrichment.relationships?.companies || [],
								// Individual contacts
								contacts: aircraft.enrichment.relationships?.contacts || [],
							})
						: '',
					marketData: aircraft.enrichment
						? JSON.stringify({
								// Status endpoint data
								status: aircraft.enrichment.status,
								// Airframe endpoint data
								airframe: aircraft.enrichment.airframe,
								// Market analysis data
								marketAnalysis: {
									priceRange: aircraft.price
										? {
												min: aircraft.price * 0.8,
												max: aircraft.price * 1.2,
												current: aircraft.price,
											}
										: null,
									marketPosition: aircraft.marketStatus,
									exclusivity: aircraft.exclusive,
									leaseStatus: aircraft.leased,
								},
								// Tech summary
								techSummary: aircraft.techSummary,
							})
						: '',
					maintenanceData: aircraft.enrichment?.maintenance
						? JSON.stringify({
								// Maintenance endpoint data
								maintenance: aircraft.enrichment.maintenance,
								// Calculated maintenance metrics
								maintenanceMetrics: {
									nextDueDays: aircraft.techSummary?.maintenanceDueInDays,
									lastInspection: aircraft.enrichment.maintenance?.lastInspection,
									maintenanceHistory: aircraft.enrichment.maintenance?.history || [],
									complianceStatus: aircraft.enrichment.maintenance?.compliance || 'Unknown',
								},
							})
						: '',
					ownershipData: aircraft.enrichment?.relationships
						? JSON.stringify({
								// Ownership history
								ownershipHistory: aircraft.enrichment.relationships?.ownership || [],
								// Current owner
								currentOwner: aircraft.enrichment.relationships?.currentOwner,
								// Previous owners
								previousOwners: aircraft.enrichment.relationships?.previousOwners || [],
								// Registration history
								registrationHistory: aircraft.enrichment.relationships?.registrationHistory || [],
							})
						: '',
					registration: aircraft.registration || '',
					make: aircraft.make || 'Unknown',
					serialNumber: aircraft.serialNumber || '',
					forSale: aircraft.forsale || false,
					totalTimeHours: aircraft.totalTimeHours || aircraft.totalTime,
					engineHours: aircraft.estimatedAftt,
					dateListed: aircraft.listDate || new Date(),
				};

				// Check if aircraft already exists
				const existingAircraft = await prisma.aircraft.findFirst({
					where: {
						OR: [
							{ aircraftId: aircraft.aircraftId },
							{ registration: aircraft.registration },
							{ serialNumber: aircraft.serialNumber },
						],
					},
				});

				if (existingAircraft) {
					// Update existing aircraft
					await prisma.aircraft.update({
						where: { id: existingAircraft.id },
						data: transformedAircraft,
					});
					syncResults.updated++;
				} else {
					// Create new aircraft
					await prisma.aircraft.create({
						data: transformedAircraft,
					});
					syncResults.created++;
				}
			} catch (err) {
				syncResults.errors++;
				syncResults.errorDetails.push({
					aircraft: aircraft.registration || aircraft.serialNumber || aircraft.aircraftId,
					error: String(err?.message || err),
				});
			}
		}

		return syncResults;
	}

	/**
	 * Step 6: Generate comprehensive reports
	 */
	private generateReports(enrichedAircraft: JetNetAircraft[], syncResults: any): any {
		const num = (v: any) => (v == null ? null : Number(v));
		const withPrice = enrichedAircraft.filter(a => Number.isFinite(num(a.price)));
		const avgPrice = withPrice.length
			? withPrice.reduce((s, a) => s + Number(a.price), 0) / withPrice.length
			: 0;
		const priceRange = withPrice.length
			? {
					min: Math.min(...withPrice.map(a => Number(a.price))),
					max: Math.max(...withPrice.map(a => Number(a.price))),
				}
			: { min: 0, max: 0 };

		const engineCounts = enrichedAircraft.map(a => a.techSummary?.engines || 0);
		const avgEngines = engineCounts.length
			? engineCounts.reduce((s, n) => s + n, 0) / engineCounts.length
			: 0;

		const withMaint = enrichedAircraft.filter(a => a.enrichment?.maintenance);
		const dueSoon = withMaint.filter(a => {
			const d = a.enrichment.maintenance?.nextDueDays;
			return Number.isFinite(d) && d <= 90;
		}).length;

		const countBy = (keyFn: (a: JetNetAircraft) => string) =>
			enrichedAircraft.reduce(
				(acc, a) => {
					const k = keyFn(a) || 'Unknown';
					acc[k] = (acc[k] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>
			);

		const topFrom = (obj: Record<string, number>, n = 10) =>
			Object.entries(obj)
				.sort((a, b) => b[1] - a[1])
				.slice(0, n);

		const marketAnalysis = {
			totalAircraft: enrichedAircraft.length,
			forSaleCount: enrichedAircraft.filter(a => a.forsale).length,
			avgPrice,
			priceRange,
			avgEngines,
			maintenanceDue90Days: dueSoon,
			topAvionics: topFrom(
				enrichedAircraft.reduce(
					(m, a) => {
						const k = (a.techSummary?.avionicsSuite || 'Unknown').toString();
						m[k] = (m[k] || 0) + 1;
						return m;
					},
					{} as Record<string, number>
				),
				5
			),
			topMakes: topFrom(
				countBy(a => a.make),
				10
			),
			topModels: topFrom(
				countBy(a => a.model),
				10
			),
		};

		const executiveSummary = {
			timestamp: new Date().toISOString(),
			status: syncResults.errors === 0 ? 'SUCCESS' : 'COMPLETED_WITH_WARNINGS',
			summary: {
				totalAircraftProcessed: enrichedAircraft.length,
				databaseRecordsCreated: syncResults.created,
				databaseRecordsUpdated: syncResults.updated,
				totalForSale: marketAnalysis.forSaleCount,
				averagePrice: avgPrice ? `$${Math.round(avgPrice).toLocaleString()}` : 'N/A',
				priceRange: priceRange.min
					? `$${Math.round(priceRange.min).toLocaleString()} - $${Math.round(priceRange.max).toLocaleString()}`
					: 'N/A',
				topMake: marketAnalysis.topMakes[0]?.[0] || 'N/A',
				topModel: marketAnalysis.topModels[0]?.[0] || 'N/A',
				commonAvionics: marketAnalysis.topAvionics[0]?.[0] || 'N/A',
				maintDue90Days: marketAnalysis.maintenanceDue90Days,
			},
		};

		return { marketAnalysis, executiveSummary };
	}

	/**
	 * Complete comprehensive sync workflow
	 */
	async runComprehensiveSync(): Promise<{
		success: boolean;
		data: any;
		reports: any;
		count: number;
		summary: any;
	}> {
		const workflowState: WorkflowState = {
			workflowId: `workflow-${Date.now()}`,
			startTime: new Date().toISOString(),
			steps: [],
			errors: [],
			metrics: {
				startTime: Date.now(),
				completedSteps: 0,
			},
			data: {},
		};

		try {
			// Step 1: Authenticate
			workflowState.steps.push({
				step: 'authentication',
				status: 'in-progress',
				timestamp: new Date().toISOString(),
				message: 'Authenticating with JetNet API...',
			});

			const authTokens = await this.authenticate();
			workflowState.data.auth = authTokens;
			workflowState.steps[workflowState.steps.length - 1].status = 'completed';
			workflowState.metrics.completedSteps++;

			// Step 2: Fetch bulk aircraft data
			workflowState.steps.push({
				step: 'bulk-fetch',
				status: 'in-progress',
				timestamp: new Date().toISOString(),
				message: 'Fetching bulk aircraft data...',
			});

			const rawAircraft = await this.fetchBulkAircraftData();
			workflowState.steps[workflowState.steps.length - 1].status = 'completed';
			workflowState.metrics.completedSteps++;

			// Step 3: Process aircraft data
			workflowState.steps.push({
				step: 'aircraft-processing',
				status: 'in-progress',
				timestamp: new Date().toISOString(),
				message: `Processing ${rawAircraft.length} aircraft records...`,
			});

			const processedAircraft = this.processAircraftData(rawAircraft);
			workflowState.data.aircraft = {
				rawResponse: rawAircraft,
				processedData: processedAircraft,
				count: processedAircraft.length,
			};
			workflowState.steps[workflowState.steps.length - 1].status = 'completed';
			workflowState.metrics.completedSteps++;

			// Step 4: Enrich aircraft data (process in batches of 25)
			workflowState.steps.push({
				step: 'enrichment',
				status: 'in-progress',
				timestamp: new Date().toISOString(),
				message: `Enriching ${processedAircraft.length} aircraft with detailed data...`,
			});

			const enrichedAircraft: JetNetAircraft[] = [];
			const batchSize = 25;

			for (let i = 0; i < processedAircraft.length; i += batchSize) {
				const batch = processedAircraft.slice(i, i + batchSize);
				const batchPromises = batch.map(aircraft => this.enrichAircraftData(aircraft));
				const batchResults = await Promise.all(batchPromises);
				enrichedAircraft.push(...batchResults);

				// Add small delay between batches to avoid rate limiting
				if (i + batchSize < processedAircraft.length) {
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			}

			workflowState.data.aircraft.enriched = enrichedAircraft;
			workflowState.steps[workflowState.steps.length - 1].status = 'completed';
			workflowState.metrics.completedSteps++;

			// Step 5: Sync to database
			workflowState.steps.push({
				step: 'database-sync',
				status: 'in-progress',
				timestamp: new Date().toISOString(),
				message: 'Syncing enriched data to database...',
			});

			const syncResults = await this.syncToDatabase(enrichedAircraft);
			workflowState.data.databaseSync = syncResults;
			workflowState.steps[workflowState.steps.length - 1].status = syncResults.errors
				? 'completed-with-errors'
				: 'completed';
			workflowState.metrics.completedSteps++;

			// Step 6: Generate reports
			workflowState.steps.push({
				step: 'report-generation',
				status: 'in-progress',
				timestamp: new Date().toISOString(),
				message: 'Generating comprehensive reports...',
			});

			const reports = this.generateReports(enrichedAircraft, syncResults);
			workflowState.data.reports = reports;
			workflowState.steps[workflowState.steps.length - 1].status = 'completed';
			workflowState.metrics.completedSteps++;

			const finalSummary = {
				workflowId: workflowState.workflowId,
				status: workflowState.errors.length === 0 ? 'SUCCESS' : 'COMPLETED_WITH_WARNINGS',
				startTime: workflowState.startTime,
				endTime: new Date().toISOString(),
				totalDuration: `${Date.now() - workflowState.metrics.startTime}ms`,
				stepsCompleted: workflowState.metrics.completedSteps,
				totalSteps: workflowState.steps.length,
				successRate: workflowState.steps.length
					? `${((workflowState.metrics.completedSteps / workflowState.steps.length) * 100).toFixed(1)}%`
					: '0%',
				errorCount: workflowState.errors.length,
				dataProcessed: {
					aircraftRecords: enrichedAircraft.length,
					databaseCreated: syncResults.created,
					databaseUpdated: syncResults.updated,
				},
				reportsGenerated: Object.keys(reports),
				timestamp: new Date().toISOString(),
			};

			return {
				success: true,
				data: workflowState.data,
				reports,
				count: enrichedAircraft.length,
				summary: finalSummary,
			};
		} catch (error) {
			workflowState.errors.push({
				step: 'workflow-error',
				error: String(error?.message || error),
				timestamp: new Date().toISOString(),
			});

			return {
				success: false,
				data: workflowState.data,
				reports: null,
				count: 0,
				summary: {
					workflowId: workflowState.workflowId,
					status: 'FAILED',
					error: String(error?.message || error),
					timestamp: new Date().toISOString(),
				},
			};
		}
	}
}

export default JetNetComprehensiveClient;
