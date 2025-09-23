import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { log } from '@/lib/logging/logger';

interface JetNetAuthData {
	bearerToken: string;
	securityToken: string;
	expiresAt: number;
}

interface EnhancedAircraftData {
	// Core identification
	aircraftId: number;
	registration: string;
	serialNumber: string;
	make: string;
	model: string;
	year: number;

	// Market data
	price: number;
	askingPrice: number;
	currency: string;
	status: string;
	forSale: boolean;
	marketStatus: string;

	// Location and base
	location: string;
	baseCity: string;
	baseState: string;
	baseCountry: string;
	baseAirportId: string;
	baseIcaoCode: string;
	baseIataCode: string;

	// Flight data
	totalTimeHours: number;
	engineHours: number;
	apuHours: number;
	cycles: number;

	// Technical specifications
	avionics: string;
	passengers: string;
	engines: string;
	maxRange: number;
	maxSpeed: number;
	maxAltitude: number;

	// Images and media
	photos: string[];
	images: Array<{
		url: string;
		type: 'exterior' | 'interior' | 'cockpit' | 'engine' | 'other';
		caption?: string;
		isHero?: boolean;
	}>;

	// Ownership and relationships
	ownerInfo: {
		companyName: string;
		contactName: string;
		phone: string;
		email: string;
		address: string;
		relationshipType: string;
	};

	operatorInfo: {
		companyName: string;
		contactName: string;
		phone: string;
		email: string;
		relationshipType: string;
	};

	// Broker information
	brokerInfo: {
		companyName: string;
		contactName: string;
		phone: string;
		email: string;
		address: string;
		exclusive: boolean;
	};

	// Maintenance and history
	maintenanceData: {
		lastInspection: string;
		nextInspection: string;
		maintenanceProgram: string;
		complianceStatus: string;
	};

	// Market intelligence
	marketData: {
		daysOnMarket: number;
		priceHistory: Array<{
			date: string;
			price: number;
			status: string;
		}>;
		marketTrend: string;
		comparableAircraft: Array<{
			registration: string;
			price: number;
			year: number;
			hours: number;
		}>;
	};

	// Raw data from all endpoints
	rawData: Record<string, unknown>;

	// Metadata
	dataSource: string;
	processedAt: string;
	lastUpdated: string;
}

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const startTime = Date.now();
	const requestId = crypto.randomUUID();

	try {
		log.info('Enhanced JetNet sync started', {
			requestId,
			component: 'api',
			action: 'enhanced_jetnet_sync',
		});

		// Get authentication data
		const authData = (globalThis as Record<string, unknown>).jetnetAuthData as JetNetAuthData;

		if (!authData || !authData.bearerToken || !authData.securityToken) {
			return NextResponse.json(
				{
					success: false,
					error: 'No authentication data available. Please authenticate first.',
				},
				{ status: 401 }
			);
		}

		// Check if auth is still valid
		if (Date.now() > authData.expiresAt) {
			return NextResponse.json(
				{
					success: false,
					error: 'Authentication expired. Please re-authenticate.',
				},
				{ status: 401 }
			);
		}

		const baseUrl = 'https://customer.jetnetconnect.com/api';
		const headers = {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		};

		// Define all JetNet endpoints to collect comprehensive data
		const endpoints = [
			{
				name: 'aircraft-list',
				url: `${baseUrl}/Aircraft/getAircraftList/${authData.securityToken}`,
				method: 'POST',
				body: { page: 1, limit: 10000 },
			},
			{
				name: 'bulk-aircraft-export',
				url: `${baseUrl}/Aircraft/getBulkAircraftExport/${authData.securityToken}`,
				method: 'POST',
				body: { page: 1, limit: 10000 },
			},
			{
				name: 'events-list',
				url: `${baseUrl}/Aircraft/getEventList/${authData.securityToken}`,
				method: 'POST',
				body: { page: 1, limit: 10000 },
			},
			{
				name: 'history-list',
				url: `${baseUrl}/Aircraft/getHistoryList/${authData.securityToken}`,
				method: 'POST',
				body: { page: 1, limit: 10000 },
			},
			{
				name: 'relationships',
				url: `${baseUrl}/Aircraft/getRelationships/${authData.securityToken}`,
				method: 'POST',
				body: { page: 1, limit: 10000 },
			},
			{
				name: 'flight-data',
				url: `${baseUrl}/Aircraft/getFlightData/${authData.securityToken}`,
				method: 'POST',
				body: { page: 1, limit: 10000 },
			},
			{
				name: 'owner-operators',
				url: `${baseUrl}/Aircraft/getCondensedOwnerOperators/${authData.securityToken}`,
				method: 'POST',
				body: { page: 1, limit: 10000 },
			},
			{
				name: 'snapshot',
				url: `${baseUrl}/Aircraft/getCondensedSnapshot/${authData.securityToken}`,
				method: 'POST',
				body: { page: 1, limit: 10000 },
			},
			{
				name: 'companies',
				url: `${baseUrl}/Company/getCompanyList/${authData.securityToken}`,
				method: 'POST',
				body: { page: 1, limit: 10000 },
			},
			{
				name: 'contacts',
				url: `${baseUrl}/Contact/getContactList/${authData.securityToken}`,
				method: 'POST',
				body: { page: 1, limit: 10000 },
			},
		];

		// Collect data from all endpoints
		const allData: Record<string, unknown[]> = {};
		let totalRecords = 0;
		let successCount = 0;
		let enhancedErrorCount = 0;

		for (const endpoint of endpoints) {
			try {
				log.info(`Fetching data from ${endpoint.name}`, { requestId, endpoint: endpoint.name });

				const response = await fetch(endpoint.url, {
					method: endpoint.method,
					headers,
					body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const data = await response.json();

				// Extract data based on endpoint type
				let extractedData: unknown[] = [];
				if (endpoint.name === 'aircraft-list' || endpoint.name === 'bulk-aircraft-export') {
					extractedData = data.aircraft || [];
				} else if (endpoint.name === 'events-list') {
					extractedData = data.events || [];
				} else if (endpoint.name === 'history-list') {
					extractedData = data.history || [];
				} else if (endpoint.name === 'relationships') {
					extractedData = data.relationships || [];
				} else if (endpoint.name === 'flight-data') {
					extractedData = data.flightData || [];
				} else if (endpoint.name === 'owner-operators') {
					extractedData = data.ownerOperators || [];
				} else if (endpoint.name === 'snapshot') {
					extractedData = data.snapshot || [];
				} else if (endpoint.name === 'companies') {
					extractedData = data.companies || [];
				} else if (endpoint.name === 'contacts') {
					extractedData = data.contacts || [];
				}

				allData[endpoint.name] = extractedData;
				totalRecords += extractedData.length;
				successCount++;

				log.info(`Successfully fetched ${extractedData.length} records from ${endpoint.name}`, {
					requestId,
					endpoint: endpoint.name,
					recordCount: extractedData.length,
				});
			} catch (error) {
				enhancedErrorCount++;
				log.error(
					`Failed to fetch data from ${endpoint.name}`,
					{
						requestId,
						endpoint: endpoint.name,
					},
					error as Error
				);
			}
		}

		// Process and enhance aircraft data
		const aircraftData = allData['aircraft-list'] || allData['bulk-aircraft-export'] || [];
		const enhancedAircraft: EnhancedAircraftData[] = [];

		for (const aircraft of aircraftData) {
			try {
				const aircraftRecord = aircraft as Record<string, unknown>;

				// Process images
				const photos = aircraftRecord.acphotos
					? Array.isArray(aircraftRecord.acphotos)
						? aircraftRecord.acphotos
						: [aircraftRecord.acphotos]
					: [];

				const images = photos.map((photo: string, index: number) => ({
					url: photo,
					type: index === 0 ? ('exterior' as const) : ('other' as const),
					caption: `Aircraft ${aircraftRecord.regnbr || aircraftRecord.sernbr} - Image ${
						index + 1
					}`,
					isHero: index === 0,
				}));

				// Extract owner information
				const ownerInfo = {
					companyName: (aircraftRecord.owrcompanyname as string) || '',
					contactName: `${aircraftRecord.owrfname || ''} ${aircraftRecord.owrlname || ''}`.trim(),
					phone: (aircraftRecord.owrphone1 as string) || '',
					email: (aircraftRecord.owremail as string) || '',
					address: [
						aircraftRecord.owraddress1,
						aircraftRecord.owrcity,
						aircraftRecord.owrstate,
						aircraftRecord.owrzip,
						aircraftRecord.owrcountry,
					]
						.filter(Boolean)
						.join(', '),
					relationshipType: (aircraftRecord.owrtypecode as string) || 'Owner',
				};

				// Extract operator information
				const operatorInfo = {
					companyName: (aircraftRecord.oper1companyname as string) || '',
					contactName: `${aircraftRecord.oper1fname || ''} ${
						aircraftRecord.oper1lname || ''
					}`.trim(),
					phone: (aircraftRecord.oper1phone1 as string) || '',
					email: (aircraftRecord.oper1email as string) || '',
					relationshipType: 'Operator',
				};

				// Extract broker information
				const brokerInfo = {
					companyName: (aircraftRecord.excbrk1companyname as string) || '',
					contactName: `${aircraftRecord.excbrk1fname || ''} ${
						aircraftRecord.excbrk1lname || ''
					}`.trim(),
					phone: (aircraftRecord.excbrk1phone1 as string) || '',
					email: (aircraftRecord.excbrk1email as string) || '',
					address: [
						aircraftRecord.excbrk1address1,
						aircraftRecord.excbrk1city,
						aircraftRecord.excbrk1state,
						aircraftRecord.excbrk1zip,
						aircraftRecord.excbrk1country,
					]
						.filter(Boolean)
						.join(', '),
					exclusive: aircraftRecord.exclusive === 'Y' || aircraftRecord.exclusive === true,
				};

				// Create enhanced aircraft record
				const enhancedRecord: EnhancedAircraftData = {
					// Core identification
					aircraftId: aircraftRecord.aircraftid as number,
					registration: (aircraftRecord.regnbr as string) || '',
					serialNumber: (aircraftRecord.sernbr as string) || '',
					make: (aircraftRecord.make as string) || 'Unknown',
					model: (aircraftRecord.model as string) || 'Unknown',
					year: (aircraftRecord.yearmfr as number) || (aircraftRecord.yeardlv as number) || 0,

					// Market data
					price: parseFloat((aircraftRecord.askingprice as string) || '0'),
					askingPrice: parseFloat((aircraftRecord.askingprice as string) || '0'),
					currency: 'USD',
					status: (aircraftRecord.marketstatus as string) || 'Unknown',
					forSale: aircraftRecord.forsale === 'Y' || aircraftRecord.forsale === true,
					marketStatus: (aircraftRecord.marketstatus as string) || 'Unknown',

					// Location and base
					location: (aircraftRecord.basecity as string) || '',
					baseCity: (aircraftRecord.basecity as string) || '',
					baseState: (aircraftRecord.basestate as string) || '',
					baseCountry: (aircraftRecord.basecountry as string) || '',
					baseAirportId: (aircraftRecord.baseairportid as string) || '',
					baseIcaoCode: (aircraftRecord.baseicaocode as string) || '',
					baseIataCode: (aircraftRecord.baseiata as string) || '',

					// Flight data
					totalTimeHours: parseFloat((aircraftRecord.aftt as string) || '0'),
					engineHours: parseFloat((aircraftRecord.enginesn1 as string) || '0'),
					apuHours: 0, // Not available in basic data
					cycles: 0, // Not available in basic data

					// Technical specifications
					avionics: (aircraftRecord.acavionics as string) || '',
					passengers: (aircraftRecord.acpassengers as string) || '',
					engines: (aircraftRecord.enginesn1 as string) || '',
					maxRange: 0, // Would need additional endpoint
					maxSpeed: 0, // Would need additional endpoint
					maxAltitude: 0, // Would need additional endpoint

					// Images and media
					photos: photos as string[],
					images,

					// Ownership and relationships
					ownerInfo,
					operatorInfo,
					brokerInfo,

					// Maintenance and history
					maintenanceData: {
						lastInspection: '', // Would need additional endpoint
						nextInspection: '', // Would need additional endpoint
						maintenanceProgram: '', // Would need additional endpoint
						complianceStatus: '', // Would need additional endpoint
					},

					// Market intelligence
					marketData: {
						daysOnMarket: 0, // Would need calculation
						priceHistory: [], // Would need additional endpoint
						marketTrend: 'Unknown', // Would need additional endpoint
						comparableAircraft: [], // Would need additional endpoint
					},

					// Raw data from all endpoints
					rawData: aircraftRecord,

					// Metadata
					dataSource: 'JetNet-Enhanced',
					processedAt: new Date().toISOString(),
					lastUpdated: new Date().toISOString(),
				};

				enhancedAircraft.push(enhancedRecord);
			} catch (error) {
				log.error(
					'Error processing aircraft record',
					{
						requestId,
						aircraftId: (aircraft as Record<string, unknown>).aircraftid,
					},
					error as Error
				);
			}
		}

		// Store enhanced data in database
		let createdCount = 0;
		let updatedCount = 0;

		for (const aircraft of enhancedAircraft) {
			try {
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

				// Prepare database record
				const dbRecord = {
					aircraftId: aircraft.aircraftId,
					manufacturer: aircraft.make,
					model: aircraft.model,
					year: aircraft.year,
					price: aircraft.price,
					askingPrice: aircraft.askingPrice,
					currency: aircraft.currency,
					location: aircraft.location,
					status: (aircraft.forSale ? 'ACTIVE' : 'INACTIVE') as
						| 'ACTIVE'
						| 'INACTIVE'
						| 'SOLD'
						| 'PENDING',
					registration: aircraft.registration,
					serialNumber: aircraft.serialNumber,
					forSale: aircraft.forSale,
					totalTimeHours: aircraft.totalTimeHours,
					engineHours: aircraft.engineHours,
					dateListed: new Date(),
					lastUpdated: new Date(),

					// Store comprehensive data as JSON
					specifications: JSON.stringify({
						avionics: aircraft.avionics,
						passengers: aircraft.passengers,
						engines: aircraft.engines,
						maxRange: aircraft.maxRange,
						maxSpeed: aircraft.maxSpeed,
						maxAltitude: aircraft.maxAltitude,
						baseCity: aircraft.baseCity,
						baseState: aircraft.baseState,
						baseCountry: aircraft.baseCountry,
						baseAirportId: aircraft.baseAirportId,
						baseIcaoCode: aircraft.baseIcaoCode,
						baseIataCode: aircraft.baseIataCode,
					}),

					features: JSON.stringify({
						marketStatus: aircraft.marketStatus,
						maintenanceData: aircraft.maintenanceData,
						marketData: aircraft.marketData,
					}),

					contactInfo: JSON.stringify({
						owner: aircraft.ownerInfo,
						operator: aircraft.operatorInfo,
						broker: aircraft.brokerInfo,
					}),

					marketData: JSON.stringify(aircraft.marketData),

					ownershipData: JSON.stringify({
						owner: aircraft.ownerInfo,
						operator: aircraft.operatorInfo,
						broker: aircraft.brokerInfo,
					}),

					maintenanceData: JSON.stringify(aircraft.maintenanceData),
				};

				if (existingAircraft) {
					await prisma.aircraft.update({
						where: { id: existingAircraft.id },
						data: dbRecord,
					});
					updatedCount++;
				} else {
					await prisma.aircraft.create({
						data: dbRecord,
					});
					createdCount++;
				}

				// Store images
				if (aircraft.images.length > 0) {
					// Delete existing images
					await prisma.aircraftImage.deleteMany({
						where: { aircraftId: existingAircraft?.id || '' },
					});

					// Create new images
					for (const image of aircraft.images) {
						await prisma.aircraftImage.create({
							data: {
								aircraftId: existingAircraft?.id || '',
								url: image.url,
								type: image.type,
								caption: image.caption,
								isHero: image.isHero,
								order: aircraft.images.indexOf(image),
							},
						});
					}
				}
			} catch (error) {
				enhancedErrorCount++;
				log.error(
					'Error storing aircraft record',
					{
						requestId,
						aircraftId: aircraft.aircraftId,
					},
					error as Error
				);
			}
		}

		// Create sync log
		await prisma.syncLog.create({
			data: {
				syncType: 'jetnet-enhanced',
				status: enhancedErrorCount === 0 ? 'SUCCESS' : 'COMPLETED_WITH_ERRORS',
				recordsProcessed: enhancedAircraft.length,
				recordsCreated: createdCount,
				recordsUpdated: updatedCount,
				errorMessage:
					enhancedErrorCount > 0 ? `${enhancedErrorCount} records failed to process` : null,
				syncDurationMs: Date.now() - startTime,
				completedAt: new Date(),
				metadata: JSON.stringify({
					endpointsUsed: endpoints.map(e => e.name),
					totalRecords,
					successCount,
					enhancedErrorCount,
					enhancedAircraftCount: enhancedAircraft.length,
				}),
			},
		});

		const duration = Date.now() - startTime;

		log.info('Enhanced JetNet sync completed', {
			requestId,
			component: 'api',
			action: 'enhanced_jetnet_sync_complete',
			metadata: {
				totalRecords,
				enhancedAircraftCount: enhancedAircraft.length,
				createdCount,
				updatedCount,
				enhancedErrorCount,
				duration,
			},
		});

		return NextResponse.json({
			success: true,
			message: 'Enhanced JetNet sync completed successfully',
			data: {
				totalRecords,
				enhancedAircraftCount: enhancedAircraft.length,
				createdCount,
				updatedCount,
				enhancedErrorCount,
				endpointsUsed: endpoints.map(e => e.name),
				duration,
			},
			timestamp: new Date().toISOString(),
			requestId,
		});
	} catch (error) {
		const duration = Date.now() - startTime;

		log.error(
			'Enhanced JetNet sync failed',
			{
				requestId,
				component: 'api',
				action: 'enhanced_jetnet_sync_error',
				metadata: { duration },
			},
			error as Error
		);

		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
				requestId,
			},
			{ status: 500 }
		);
	}
}

export async function GET() {
	try {
		// Get recent sync logs
		const recentSyncs = await prisma.syncLog.findMany({
			where: { syncType: 'jetnet-enhanced' },
			orderBy: { startedAt: 'desc' },
			take: 10,
		});

		// Get aircraft statistics
		const aircraftStats = await prisma.aircraft.aggregate({
			_count: { id: true },
		});

		const forSaleStats = await prisma.aircraft.count({
			where: { forSale: true },
		});

		return NextResponse.json({
			success: true,
			data: {
				recentSyncs: recentSyncs.map(sync => ({
					id: sync.id,
					status: sync.status,
					recordsProcessed: sync.recordsProcessed,
					recordsCreated: sync.recordsCreated,
					recordsUpdated: sync.recordsUpdated,
					startedAt: sync.startedAt,
					completedAt: sync.completedAt,
					syncDurationMs: sync.syncDurationMs,
					metadata: sync.metadata ? JSON.parse(sync.metadata) : null,
				})),
				statistics: {
					totalAircraft: aircraftStats._count.id,
					forSale: forSaleStats,
					lastSync: recentSyncs[0]?.completedAt || null,
				},
			},
		});
	} catch (error) {
		console.error('Error getting enhanced sync status:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to get sync status',
			},
			{ status: 500 }
		);
	}
}
