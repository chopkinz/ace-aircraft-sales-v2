import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { log } from '@/lib/logging/logger';
import { Prisma } from '@prisma/client';

// Utility functions from N8N workflow
const toNum = (v: unknown): number | null => {
	if (v == null || v === '') return null;
	return typeof v === 'number' ? v : Number(v);
};

const toYear = (v: unknown): number | null => {
	const n = toNum(v);
	return n && n > 1900 && n < 3000 ? n : null;
};

const truthyY = (v: unknown): boolean => {
	return v === 'Y' || v === 'True' || v === true;
};

// Enrichment endpoints - matching N8N workflow exactly
async function getAircraftEnrichment(
	aircraftId: string,
	apiToken: string,
	bearerToken: string,
	baseUrl: string
) {
	const headers = {
		Authorization: `Bearer ${bearerToken}`,
		Accept: 'application/json',
		'User-Agent': 'ACE-Aircraft-Sales/2.0',
	};

	const enrichment = {
		status: null,
		airframe: null,
		engines: null,
		apu: null,
		avionics: null,
		features: null,
		additionalEquipment: null,
		interior: null,
		exterior: null,
		maintenance: null,
		relationships: null,
	};

	// Parallel fetch all enrichment data (exact N8N endpoints)
	const [
		statusRes,
		airframeRes,
		enginesRes,
		apuRes,
		avionicsRes,
		featuresRes,
		additionalEquipmentRes,
		interiorRes,
		exteriorRes,
		maintenanceRes,
		relationshipsRes,
	] = await Promise.allSettled([
		fetch(`${baseUrl}/api/Aircraft/getStatus/${aircraftId}/${apiToken}`, { headers }),
		fetch(`${baseUrl}/api/Aircraft/getAirframe/${aircraftId}/${apiToken}`, { headers }),
		fetch(`${baseUrl}/api/Aircraft/getEngine/${aircraftId}/${apiToken}`, { headers }),
		fetch(`${baseUrl}/api/Aircraft/getApu/${aircraftId}/${apiToken}`, { headers }),
		fetch(`${baseUrl}/api/Aircraft/getAvionics/${aircraftId}/${apiToken}`, { headers }),
		fetch(`${baseUrl}/api/Aircraft/getFeatures/${aircraftId}/${apiToken}`, { headers }),
		fetch(`${baseUrl}/api/Aircraft/getAdditionalEquipment/${aircraftId}/${apiToken}`, { headers }),
		fetch(`${baseUrl}/api/Aircraft/getInterior/${aircraftId}/${apiToken}`, { headers }),
		fetch(`${baseUrl}/api/Aircraft/getExterior/${aircraftId}/${apiToken}`, { headers }),
		fetch(`${baseUrl}/api/Aircraft/getMaintenance/${aircraftId}/${apiToken}`, { headers }),
		fetch(`${baseUrl}/api/Aircraft/getCompanyrelationships/${aircraftId}/${apiToken}`, { headers }),
	]);

	// Process results
	if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
		enrichment.status = await statusRes.value.json();
	}
	if (airframeRes.status === 'fulfilled' && airframeRes.value.ok) {
		enrichment.airframe = await airframeRes.value.json();
	}
	if (enginesRes.status === 'fulfilled' && enginesRes.value.ok) {
		enrichment.engines = await enginesRes.value.json();
	}
	if (apuRes.status === 'fulfilled' && apuRes.value.ok) {
		enrichment.apu = await apuRes.value.json();
	}
	if (avionicsRes.status === 'fulfilled' && avionicsRes.value.ok) {
		enrichment.avionics = await avionicsRes.value.json();
	}
	if (featuresRes.status === 'fulfilled' && featuresRes.value.ok) {
		enrichment.features = await featuresRes.value.json();
	}
	if (additionalEquipmentRes.status === 'fulfilled' && additionalEquipmentRes.value.ok) {
		enrichment.additionalEquipment = await additionalEquipmentRes.value.json();
	}
	if (interiorRes.status === 'fulfilled' && interiorRes.value.ok) {
		enrichment.interior = await interiorRes.value.json();
	}
	if (exteriorRes.status === 'fulfilled' && exteriorRes.value.ok) {
		enrichment.exterior = await exteriorRes.value.json();
	}
	if (maintenanceRes.status === 'fulfilled' && maintenanceRes.value.ok) {
		enrichment.maintenance = await maintenanceRes.value.json();
	}
	if (relationshipsRes.status === 'fulfilled' && relationshipsRes.value.ok) {
		enrichment.relationships = await relationshipsRes.value.json();
	}

	return enrichment;
}

export async function POST() {
	const startTime = Date.now();
	let syncLog = null;

	try {
		log.info('JetNet comprehensive sync started');

		// Create sync log entry
		syncLog = await prisma.syncLog.create({
			data: {
				syncType: 'JETNET_COMPREHENSIVE',
				status: 'RUNNING',
				recordsProcessed: 0,
				recordsCreated: 0,
				recordsUpdated: 0,
				startedAt: new Date(),
			},
		});

		const baseUrl = 'https://customer.jetnetconnect.com';

		// Step 1: Authenticate with JetNet (exact N8N structure)
		const authResponse = await fetch(`${baseUrl}/api/Admin/APILogin`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				'User-Agent': 'ACE-Aircraft-Sales/2.0',
			},
			body: JSON.stringify({
				emailaddress: process.env.JETNET_EMAIL,
				password: process.env.JETNET_PASSWORD,
			}),
		});
		console.log('authResponse', authResponse);
		console.log('authResponse.ok', authResponse.ok);
		console.log('authResponse.statusText', authResponse.statusText);
		if (!authResponse.ok) {
			throw new Error(`JetNet authentication failed: ${authResponse.statusText}`);
		}

		const authData = await authResponse.json();
		const { bearerToken, apiToken, expiresIn } = authData;
		console.log('authData', authData);
		console.log('bearerToken', bearerToken);
		console.log('apiToken', apiToken);	
		console.log('expiresIn', expiresIn);
		if (!bearerToken || String(bearerToken).length < 50) {
			throw new Error('Invalid bearer token');
		}
		if (!apiToken || String(apiToken).length < 20) {
			throw new Error('Invalid API token');
		}

		log.info('JetNet authentication successful');

		// Step 2: Fetch bulk aircraft data with pagination support
		let allAircraftData: Record<string, unknown>[] = [];
		let page = 1;
		const pageSize = 2000; // Increased page size for more comprehensive data
		let hasMoreData = true;

		while (hasMoreData) {
			log.info(`Fetching JetNet aircraft data page ${page}`);

			const aircraftResponse = await fetch(
				`${baseUrl}/api/Aircraft/getBulkAircraftExport/${apiToken}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						Authorization: `Bearer ${bearerToken}`,
						'User-Agent': 'ACE-Aircraft-Sales/2.0',
					},
					body: JSON.stringify({
						forsale: '', // Empty to get ALL aircraft regardless of sale status
						aircraftchanges: 'true',
						showHistoricalAcRefs: true,
						exactMatchReg: false,
						exactMatchSer: false,
						exactMatchMake: false,
						exactMatchModel: false,
						caseSensitive: false,
						includeInactive: true,
						includeDeleted: false,
						page: page,
						pageSize: pageSize,
					}),
				}
			);

			if (!aircraftResponse.ok) {
				throw new Error(`JetNet aircraft fetch failed: ${aircraftResponse.statusText}`);
			}

			const aircraftData = await aircraftResponse.json();

			// Handle different response structures
			let pageAircraft = [];
			if (Array.isArray(aircraftData?.aircraft)) pageAircraft = aircraftData.aircraft;
			else if (Array.isArray(aircraftData)) pageAircraft = aircraftData;
			else pageAircraft = [];

			allAircraftData = allAircraftData.concat(pageAircraft);

			// Check if we have more data
			hasMoreData = pageAircraft.length === pageSize;
			page++;

			// Safety limit to prevent infinite loops - increased for comprehensive data
			if (page > 500) {
				log.warn('Reached maximum page limit (500), stopping pagination');
				break;
			}

			// Small delay between API calls
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		const rawAircraft = allAircraftData;

		log.info(`Fetched ${rawAircraft.length} aircraft from JetNet bulk export`);

		// Step 3: Process and normalize aircraft data (exact N8N logic)
		const processedAircraft = rawAircraft
			.map((aircraft, i) => {
				const aircraftRecord = aircraft as Record<string, unknown>;
				const year = toYear(
					aircraftRecord.yearmfr ?? aircraftRecord.yeardlv ?? aircraftRecord.yeardelivered
				);
				const price = toNum(aircraftRecord.askingprice ?? aircraftRecord.asking);
				const aftt = toNum(aircraftRecord.aftt ?? aircraftRecord.achours);

				return {
					id: `jetnet-${aircraftRecord.aircraftid ?? Date.now()}-${i}`,
					aircraftId: aircraftRecord.aircraftid,
					make: aircraftRecord.make || 'Unknown',
					model: aircraftRecord.model || 'Unknown',
					year,
					yearManufactured: toYear(aircraftRecord.yearmfr),
					yearDelivered: toYear(aircraftRecord.yeardlv),
					registration: aircraftRecord.regnbr || '',
					serialNumber: aircraftRecord.sernbr || '',
					price,
					askingPrice: toNum(aircraftRecord.askingprice),
					currency: 'USD',
					location:
						aircraftRecord.basecity || aircraftRecord.acbasecity || aircraftRecord.acbasename || '',
					baseCity: aircraftRecord.basecity || '',
					baseState: aircraftRecord.basestate || '',
					baseCountry: aircraftRecord.basecountry || '',
					baseAirportId: aircraftRecord.baseairportid || '',
					baseIcaoCode: aircraftRecord.baseicaocode || '',
					baseIataCode: aircraftRecord.baseiata || '',
					totalTime: aftt,
					totalTimeHours: aftt,
					estimatedAftt: toNum(aircraftRecord.estaftt),
					engineSn1: aircraftRecord.enginesn1 || '',
					engineSn2: aircraftRecord.enginesn2 || '',
					avionics: aircraftRecord.acavionics || '',
					passengers: aircraftRecord.acpassengers ?? '',
					photos: aircraftRecord.acphotos,
					notes: aircraftRecord.acnotes || '',
					forsale: truthyY(aircraftRecord.forsale),
					marketStatus: aircraftRecord.marketstatus || '',
					exclusive: aircraftRecord.exclusive ?? '',
					leased: aircraftRecord.leased ?? '',
					listDate: aircraftRecord.listdate ? new Date(aircraftRecord.listdate as string) : null,
					status: truthyY(aircraftRecord.forsale)
						? 'AVAILABLE'
						: aircraftRecord.marketstatus === 'Sold'
						? 'SOLD'
						: aircraftRecord.marketstatus === 'Under Contract'
						? 'UNDER_CONTRACT'
						: aircraftRecord.marketstatus === 'Maintenance'
						? 'MAINTENANCE'
						: aircraftRecord.marketstatus === 'Inspection'
						? 'INSPECTION'
						: aircraftRecord.marketstatus === 'Withdrawn'
						? 'WITHDRAWN'
						: 'AVAILABLE',
					rawData: aircraftRecord,
					processedAt: new Date().toISOString(),
					dataSource: 'JetNet-BulkExport',
				};
			})
			.filter(Boolean);

		log.info(`Processed ${processedAircraft.length} aircraft records`);

		// Step 4: Enrich aircraft data (batch processing like N8N)
		const batchSize = 25; // N8N uses 25
		const enrichedAircraft = [];
		let created = 0;
		let updated = 0;
		let errors = 0;

		// Process ALL aircraft data with proper pagination
		const totalAircraft = processedAircraft.length;
		log.info(`Processing ${totalAircraft} aircraft for comprehensive enrichment`);

		for (let i = 0; i < totalAircraft; i += batchSize) {
			const batch = processedAircraft.slice(i, i + batchSize);
			const currentBatch = Math.floor(i / batchSize) + 1;
			const totalBatches = Math.ceil(totalAircraft / batchSize);

			log.info(
				`Processing enrichment batch ${currentBatch}/${totalBatches} (${batch.length} aircraft)`
			);

			// Process each aircraft in the batch
			for (const aircraft of batch) {
				try {
					// Get enrichment data
					const enrichment = await getAircraftEnrichment(
						aircraft.aircraftId as string,
						apiToken,
						bearerToken,
						baseUrl
					);

					// Calculate tech summary (from N8N workflow)
					const enrichmentRecord = enrichment as Record<string, unknown>;
					const techSummary = {
						engines: Array.isArray((enrichmentRecord.engines as Record<string, unknown>)?.engines)
							? ((enrichmentRecord.engines as Record<string, unknown>).engines as unknown[]).length
							: enrichmentRecord.engines &&
							  (enrichmentRecord.engines as Record<string, unknown>).model
							? 1
							: 0,
						avionicsSuite:
							(enrichmentRecord.avionics as Record<string, unknown>)?.suite ||
							(enrichmentRecord.avionics as Record<string, unknown>)?.primary ||
							null,
						maintenanceDueInDays:
							(enrichmentRecord.maintenance as Record<string, unknown>)?.nextDueDays ?? null,
						interiorYear: (enrichmentRecord.interior as Record<string, unknown>)?.year ?? null,
						exteriorYear: (enrichmentRecord.exterior as Record<string, unknown>)?.year ?? null,
						featuresCount: Array.isArray(enrichmentRecord.features)
							? (enrichmentRecord.features as unknown[]).length
							: Object.keys(enrichmentRecord.features || {}).length,
					};

					const enrichedRecord = {
						...aircraft,
						enrichment,
						techSummary,
					};

					// Sync to database
					const existingAircraft = await prisma.aircraft.findFirst({
						where: {
							OR: [
								{ aircraftId: aircraft.aircraftId as number },
								{ registration: aircraft.registration },
								{ serialNumber: aircraft.serialNumber },
							],
						},
					});

					const dbRecord = {
						aircraftId: aircraft.aircraftId,
						manufacturer: aircraft.make,
						model: aircraft.model,
						year: aircraft.year,
						yearManufactured: aircraft.yearManufactured,
						price: aircraft.price,
						askingPrice: aircraft.askingPrice,
						currency: aircraft.currency,
						location: aircraft.location,
						status: aircraft.status as
							| 'AVAILABLE'
							| 'SOLD'
							| 'UNDER_CONTRACT'
							| 'MAINTENANCE'
							| 'INSPECTION'
							| 'WITHDRAWN',
						forSale: aircraft.forsale,
						registration: aircraft.registration,
						serialNumber: aircraft.serialNumber,
						totalTimeHours: aircraft.totalTimeHours,
						dateListed: aircraft.listDate || new Date(),
						lastUpdated: new Date(),
						// Store enrichment data as JSON
						specifications: JSON.stringify({
							enrichment,
							techSummary,
							rawData: aircraft.rawData,
						}),
					};

					if (existingAircraft) {
						await prisma.aircraft.update({
							where: { id: existingAircraft.id },
							data: dbRecord as Prisma.AircraftUpdateInput,
						});
						updated++;
					} else {
						await prisma.aircraft.create({
							data: dbRecord as Prisma.AircraftCreateInput,
						});
						created++;
					}

					enrichedAircraft.push(enrichedRecord);
				} catch (error) {
					log.error(`Error enriching aircraft ${aircraft.aircraftId}`, {}, error as Error);
					errors++;
				}
			}

			// Small delay between batches to avoid rate limiting
			if (i + batchSize < totalAircraft) {
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		}

		// Update sync log
		await prisma.syncLog.update({
			where: { id: syncLog.id },
			data: {
				status: 'COMPLETED',
				recordsProcessed: enrichedAircraft.length,
				recordsCreated: created,
				recordsUpdated: updated,
				completedAt: new Date(),
				syncDurationMs: Date.now() - startTime,
			},
		});

		log.info('JetNet comprehensive sync completed', {
			created,
			updated,
			errors,
			totalProcessed: enrichedAircraft.length,
			duration: Date.now() - startTime,
		});

		return NextResponse.json({
			success: true,
			message: 'JetNet comprehensive sync completed successfully',
			data: {
				created,
				updated,
				errors,
				totalProcessed: enrichedAircraft.length,
				enrichedCount: enrichedAircraft.length,
				duration: Date.now() - startTime,
			},
		});
	} catch (error) {
		log.error('JetNet comprehensive sync failed', {}, error as Error);

		if (syncLog) {
			await prisma.syncLog.update({
				where: { id: syncLog.id },
				data: {
					status: 'FAILED',
					errorMessage: error instanceof Error ? error.message : 'Unknown error',
					completedAt: new Date(),
					syncDurationMs: Date.now() - startTime,
				},
			});
		}

		return NextResponse.json(
			{
				error: 'JetNet comprehensive sync failed',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

export async function GET() {
	try {
		const recentSyncs = await prisma.syncLog.findMany({
			orderBy: { startedAt: 'desc' },
			take: 10,
		});

		return NextResponse.json({
			success: true,
			data: recentSyncs,
		});
	} catch (error) {
		log.error('Error fetching sync logs', {}, error as Error);
		return NextResponse.json({ error: 'Failed to fetch sync logs' }, { status: 500 });
	}
}
