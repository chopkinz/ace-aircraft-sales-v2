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

interface ComprehensiveSyncData {
	aircraft: Record<string, unknown>[];
	events: Record<string, unknown>[];
	history: Record<string, unknown>[];
	relationships: Record<string, unknown>[];
	flightData: Record<string, unknown>[];
	ownerOperators: Record<string, unknown>[];
	snapshot: Record<string, unknown>[];
	companies: Record<string, unknown>[];
	contacts: Record<string, unknown>[];
	marketData: Record<string, unknown>[];
	enrichmentData: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const startTime = Date.now();
	const requestId = crypto.randomUUID();

	try {
		log.info('Comprehensive JetNet sync started', {
			requestId,
			component: 'api',
			action: 'comprehensive_jetnet_sync',
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

		// Define all JetNet endpoints for comprehensive data collection
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
			{
				name: 'market-data',
				url: `${baseUrl}/Market/getMarketData/${authData.securityToken}`,
				method: 'POST',
				body: { page: 1, limit: 10000 },
			},
		];

		// Collect data from all endpoints
		const comprehensiveData: ComprehensiveSyncData = {
			aircraft: [],
			events: [],
			history: [],
			relationships: [],
			flightData: [],
			ownerOperators: [],
			snapshot: [],
			companies: [],
			contacts: [],
			marketData: [],
			enrichmentData: {},
		};

		let totalRecords = 0;
		let successCount = 0;
		let errorCount = 0;

		// Process endpoints in parallel for better performance
		const endpointPromises = endpoints.map(async endpoint => {
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
				} else if (endpoint.name === 'market-data') {
					extractedData = data.marketData || [];
				}

				// Store in comprehensive data
				(comprehensiveData as any)[endpoint.name.replace('-', '')] = extractedData;
				totalRecords += extractedData.length;
				successCount++;

				log.info(`Successfully fetched ${extractedData.length} records from ${endpoint.name}`, {
					requestId,
					endpoint: endpoint.name,
					recordCount: extractedData.length,
				});

				return { endpoint: endpoint.name, success: true, count: extractedData.length };
			} catch (error) {
				errorCount++;
				log.error(
					`Failed to fetch data from ${endpoint.name}`,
					{
						requestId,
						endpoint: endpoint.name,
					},
					error as Error
				);
				return { endpoint: endpoint.name, success: false, error: error as Error };
			}
		});

		// Wait for all endpoints to complete
		const endpointResults = await Promise.all(endpointPromises);

		// Process and store aircraft data
		const aircraftData = comprehensiveData.aircraft || [];
		let createdCount = 0;
		let updatedCount = 0;
		let aircraftErrorCount = 0;

		log.info(`Processing ${aircraftData.length} aircraft records`, {
			requestId,
			aircraftCount: aircraftData.length,
		});

		// Process aircraft in batches
		const batchSize = 50;
		for (let i = 0; i < aircraftData.length; i += batchSize) {
			const batch = aircraftData.slice(i, i + batchSize);

			const batchPromises = batch.map(async aircraft => {
				try {
					const aircraftRecord = aircraft as Record<string, unknown>;

					// Check if aircraft already exists
					const existingAircraft = await prisma.aircraft.findFirst({
						where: {
							OR: [
								{ aircraftId: aircraftRecord.aircraftid as number },
								{ registration: aircraftRecord.regnbr as string },
								{ serialNumber: aircraftRecord.sernbr as string },
							],
						},
					});

					// Prepare comprehensive database record
					const dbRecord = {
						aircraftId: aircraftRecord.aircraftid as number,
						manufacturer: (aircraftRecord.make as string) || 'Unknown',
						model: (aircraftRecord.model as string) || 'Unknown',
						year: (aircraftRecord.yearmfr as number) || (aircraftRecord.yeardlv as number) || 0,
						price: parseFloat((aircraftRecord.askingprice as string) || '0'),
						askingPrice: parseFloat((aircraftRecord.askingprice as string) || '0'),
						currency: 'USD',
						location: (aircraftRecord.basecity as string) || '',
						status: (aircraftRecord.forsale === 'Y' || aircraftRecord.forsale === true
							? 'ACTIVE'
							: 'INACTIVE') as 'ACTIVE' | 'INACTIVE' | 'SOLD' | 'PENDING',
						registration: (aircraftRecord.regnbr as string) || '',
						serialNumber: (aircraftRecord.sernbr as string) || '',
						forSale: aircraftRecord.forsale === 'Y' || aircraftRecord.forsale === true,
						totalTimeHours: parseFloat((aircraftRecord.aftt as string) || '0'),
						engineHours: parseFloat((aircraftRecord.enginesn1 as string) || '0'),
						dateListed: new Date(),
						lastUpdated: new Date(),

						// Store comprehensive specifications as JSON
						specifications: JSON.stringify({
							// Basic aircraft info
							aircraftId: aircraftRecord.aircraftid,
							registration: aircraftRecord.regnbr,
							serialNumber: aircraftRecord.sernbr,
							make: aircraftRecord.make,
							model: aircraftRecord.model,
							year: aircraftRecord.yearmfr || aircraftRecord.yeardlv,

							// Technical specifications
							avionics: aircraftRecord.acavionics,
							passengers: aircraftRecord.acpassengers,
							engines: aircraftRecord.enginesn1,
							enginesn2: aircraftRecord.enginesn2,
							enginesn3: aircraftRecord.enginesn3,
							enginesn4: aircraftRecord.enginesn4,

							// Location and base
							baseCity: aircraftRecord.basecity,
							baseState: aircraftRecord.basestate,
							baseCountry: aircraftRecord.basecountry,
							baseAirportId: aircraftRecord.baseairportid,
							baseIcaoCode: aircraftRecord.baseicaocode,
							baseIataCode: aircraftRecord.baseiata,

							// Market information
							askingPrice: aircraftRecord.askingprice,
							marketStatus: aircraftRecord.marketstatus,
							forsale: aircraftRecord.forsale,
							exclusive: aircraftRecord.exclusive,

							// Flight data
							aftt: aircraftRecord.aftt,
							aftt2: aircraftRecord.aftt2,
							aftt3: aircraftRecord.aftt3,
							aftt4: aircraftRecord.aftt4,

							// Additional fields
							acphotos: aircraftRecord.acphotos,
							acnotes: aircraftRecord.acnotes,
							acremarks: aircraftRecord.acremarks,
						}),

						// Store features and additional data as JSON
						features: JSON.stringify({
							marketStatus: aircraftRecord.marketstatus,
							exclusive: aircraftRecord.exclusive,
							acnotes: aircraftRecord.acnotes,
							acremarks: aircraftRecord.acremarks,
							acphotos: aircraftRecord.acphotos,
							// Store relationships data
							relationships:
								comprehensiveData.relationships?.filter(
									(rel: any) => rel.aircraftId === aircraftRecord.aircraftid
								) || [],
							// Store events data
							events:
								comprehensiveData.events?.filter(
									(event: any) => event.aircraftId === aircraftRecord.aircraftid
								) || [],
							// Store history data
							history:
								comprehensiveData.history?.filter(
									(hist: any) => hist.aircraftId === aircraftRecord.aircraftid
								) || [],
						}),

						// Store contact information as JSON
						contactInfo: JSON.stringify({
							// Owner information
							owner: {
								companyName: aircraftRecord.owrcompanyname,
								firstName: aircraftRecord.owrfname,
								lastName: aircraftRecord.owrlname,
								phone: aircraftRecord.owrphone1,
								email: aircraftRecord.owremail,
								address: aircraftRecord.owraddress1,
								city: aircraftRecord.owrcity,
								state: aircraftRecord.owrstate,
								zip: aircraftRecord.owrzip,
								country: aircraftRecord.owrcountry,
								typeCode: aircraftRecord.owrtypecode,
							},
							// Operator information
							operator: {
								companyName: aircraftRecord.oper1companyname,
								firstName: aircraftRecord.oper1fname,
								lastName: aircraftRecord.oper1lname,
								phone: aircraftRecord.oper1phone1,
								email: aircraftRecord.oper1email,
								address: aircraftRecord.oper1address1,
								city: aircraftRecord.oper1city,
								state: aircraftRecord.oper1state,
								zip: aircraftRecord.oper1zip,
								country: aircraftRecord.oper1country,
								typeCode: aircraftRecord.oper1typecode,
							},
							// Broker information
							broker: {
								companyName: aircraftRecord.excbrk1companyname,
								firstName: aircraftRecord.excbrk1fname,
								lastName: aircraftRecord.excbrk1lname,
								phone: aircraftRecord.excbrk1phone1,
								email: aircraftRecord.excbrk1email,
								address: aircraftRecord.excbrk1address1,
								city: aircraftRecord.excbrk1city,
								state: aircraftRecord.excbrk1state,
								zip: aircraftRecord.excbrk1zip,
								country: aircraftRecord.excbrk1country,
								typeCode: aircraftRecord.excbrk1typecode,
							},
						}),

						// Store market data as JSON
						marketData: JSON.stringify({
							askingPrice: aircraftRecord.askingprice,
							marketStatus: aircraftRecord.marketstatus,
							forsale: aircraftRecord.forsale,
							exclusive: aircraftRecord.exclusive,
							// Include market data from market endpoint
							marketIntelligence:
								comprehensiveData.marketData?.filter(
									(market: any) => market.aircraftId === aircraftRecord.aircraftid
								) || [],
						}),

						// Store ownership data as JSON
						ownershipData: JSON.stringify({
							owner: {
								companyName: aircraftRecord.owrcompanyname,
								contactName: `${aircraftRecord.owrfname || ''} ${
									aircraftRecord.owrlname || ''
								}`.trim(),
								phone: aircraftRecord.owrphone1,
								email: aircraftRecord.owremail,
								address: [
									aircraftRecord.owraddress1,
									aircraftRecord.owrcity,
									aircraftRecord.owrstate,
									aircraftRecord.owrzip,
									aircraftRecord.owrcountry,
								]
									.filter(Boolean)
									.join(', '),
								relationshipType: aircraftRecord.owrtypecode || 'Owner',
							},
							operator: {
								companyName: aircraftRecord.oper1companyname,
								contactName: `${aircraftRecord.oper1fname || ''} ${
									aircraftRecord.oper1lname || ''
								}`.trim(),
								phone: aircraftRecord.oper1phone1,
								email: aircraftRecord.oper1email,
								relationshipType: 'Operator',
							},
							broker: {
								companyName: aircraftRecord.excbrk1companyname,
								contactName: `${aircraftRecord.excbrk1fname || ''} ${
									aircraftRecord.excbrk1lname || ''
								}`.trim(),
								phone: aircraftRecord.excbrk1phone1,
								email: aircraftRecord.excbrk1email,
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
							},
						}),

						// Store maintenance data as JSON
						maintenanceData: JSON.stringify({
							// Include flight data
							flightData:
								comprehensiveData.flightData?.filter(
									(flight: any) => flight.aircraftId === aircraftRecord.aircraftid
								) || [],
							// Include snapshot data
							snapshot:
								comprehensiveData.snapshot?.filter(
									(snap: any) => snap.aircraftId === aircraftRecord.aircraftid
								) || [],
							// Include owner operators data
							ownerOperators:
								comprehensiveData.ownerOperators?.filter(
									(oo: any) => oo.aircraftId === aircraftRecord.aircraftid
								) || [],
						}),
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

					// Process images if available
					if (aircraftRecord.acphotos) {
						const photos = Array.isArray(aircraftRecord.acphotos)
							? aircraftRecord.acphotos
							: [aircraftRecord.acphotos];

						// Delete existing images
						await prisma.aircraftImage.deleteMany({
							where: { aircraftId: existingAircraft?.id || '' },
						});

						// Create new images
						for (let j = 0; j < photos.length; j++) {
							const photo = photos[j] as string;
							await prisma.aircraftImage.create({
								data: {
									aircraftId: existingAircraft?.id || '',
									url: photo,
									type: j === 0 ? 'exterior' : 'other',
									caption: `Aircraft ${aircraftRecord.regnbr || aircraftRecord.sernbr} - Image ${
										j + 1
									}`,
									isHero: j === 0,
									order: j,
								},
							});
						}
					}
				} catch (error) {
					aircraftErrorCount++;
					log.error(
						'Error processing aircraft record',
						{
							requestId,
							aircraftId: (aircraft as Record<string, unknown>).aircraftid,
						},
						error as Error
					);
				}
			});

			// Wait for batch to complete
			await Promise.all(batchPromises);

			// Add delay between batches
			if (i + batchSize < aircraftData.length) {
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		}

		// Store comprehensive data globally for other endpoints to use
		(globalThis as Record<string, unknown>).comprehensiveJetNetData = comprehensiveData;

		// Create sync log
		await prisma.syncLog.create({
			data: {
				syncType: 'jetnet-comprehensive',
				status: errorCount === 0 && aircraftErrorCount === 0 ? 'SUCCESS' : 'COMPLETED_WITH_ERRORS',
				recordsProcessed: totalRecords,
				recordsCreated: createdCount,
				recordsUpdated: updatedCount,
				errorMessage:
					errorCount > 0 || aircraftErrorCount > 0
						? `${errorCount} endpoints failed, ${aircraftErrorCount} aircraft failed to process`
						: null,
				syncDurationMs: Date.now() - startTime,
				completedAt: new Date(),
				metadata: JSON.stringify({
					endpointsUsed: endpoints.map(e => e.name),
					endpointResults,
					totalRecords,
					successCount,
					errorCount,
					aircraftCount: aircraftData.length,
					createdCount,
					updatedCount,
					aircraftErrorCount,
				}),
			},
		});

		const duration = Date.now() - startTime;

		log.info('Comprehensive JetNet sync completed', {
			requestId,
			component: 'api',
			action: 'comprehensive_jetnet_sync_complete',
			metadata: {
				totalRecords,
				aircraftCount: aircraftData.length,
				createdCount,
				updatedCount,
				errorCount,
				aircraftErrorCount,
				duration,
			},
		});

		return NextResponse.json({
			success: true,
			message: 'Comprehensive JetNet sync completed successfully',
			data: {
				totalRecords,
				aircraftCount: aircraftData.length,
				createdCount,
				updatedCount,
				errorCount,
				aircraftErrorCount,
				endpointsUsed: endpoints.map(e => e.name),
				endpointResults,
				duration,
			},
			timestamp: new Date().toISOString(),
			requestId,
		});
	} catch (error) {
		const duration = Date.now() - startTime;

		log.error(
			'Comprehensive JetNet sync failed',
			{
				requestId,
				component: 'api',
				action: 'comprehensive_jetnet_sync_error',
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
		// Get recent comprehensive sync logs
		const recentSyncs = await prisma.syncLog.findMany({
			where: { syncType: 'jetnet-comprehensive' },
			orderBy: { startedAt: 'desc' },
			take: 10,
		});

		// Get comprehensive statistics
		const aircraftStats = await prisma.aircraft.aggregate({
			_count: { id: true },
		});

		const forSaleStats = await prisma.aircraft.count({
			where: { forSale: true },
		});

		const imageStats = await prisma.aircraftImage.aggregate({
			_count: { id: true },
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
					totalImages: imageStats._count.id,
					lastSync: recentSyncs[0]?.completedAt || null,
				},
			},
		});
	} catch (error) {
		console.error('Error getting comprehensive sync status:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to get comprehensive sync status',
			},
			{ status: 500 }
		);
	}
}
