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

interface EnrichmentData {
	aircraftId: number;
	status?: Record<string, unknown>;
	airframe?: Record<string, unknown>;
	engines?: Record<string, unknown>;
	apu?: Record<string, unknown>;
	avionics?: Record<string, unknown>;
	features?: Record<string, unknown>;
	additionalEquipment?: Record<string, unknown>;
	interior?: Record<string, unknown>;
	exterior?: Record<string, unknown>;
	maintenance?: Record<string, unknown>;
	relationships?: Record<string, unknown>;
	images?: Array<{
		url: string;
		type: string;
		caption?: string;
		isHero?: boolean;
	}>;
}

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const startTime = Date.now();
	const requestId = crypto.randomUUID();

	try {
		log.info('JetNet enrichment started', {
			requestId,
			component: 'api',
			action: 'jetnet_enrichment',
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

		// Get aircraft IDs to enrich
		const { aircraftIds, limit = 100 } = await req.json();

		let aircraftToEnrich: Array<{ aircraftId: number; id: string }> = [];

		if (aircraftIds && Array.isArray(aircraftIds)) {
			// Enrich specific aircraft
			aircraftToEnrich = await prisma.aircraft.findMany({
				where: {
					aircraftId: { in: aircraftIds },
				},
				select: {
					aircraftId: true,
					id: true,
				},
			});
		} else {
			// Enrich aircraft that haven't been enriched recently
			aircraftToEnrich = await prisma.aircraft.findMany({
				where: {
					OR: [
						{ lastEnrichedAt: null },
						{ lastEnrichedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // 7 days ago
					],
				},
				select: {
					aircraftId: true,
					id: true,
				},
				take: limit,
			});
		}

		if (aircraftToEnrich.length === 0) {
			return NextResponse.json({
				success: true,
				message: 'No aircraft to enrich',
				data: {
					processedCount: 0,
					enrichedCount: 0,
					errorCount: 0,
				},
			});
		}

		log.info(`Starting enrichment for ${aircraftToEnrich.length} aircraft`, {
			requestId,
			aircraftCount: aircraftToEnrich.length,
		});

		let enrichedCount = 0;
		let errorCount = 0;
		const enrichmentResults: Array<{
			aircraftId: number;
			success: boolean;
			error?: string;
			enrichmentData?: EnrichmentData;
		}> = [];

		// Process aircraft in batches to avoid overwhelming the API
		const batchSize = 10;
		for (let i = 0; i < aircraftToEnrich.length; i += batchSize) {
			const batch = aircraftToEnrich.slice(i, i + batchSize);

			// Process batch in parallel
			const batchPromises = batch.map(async aircraft => {
				try {
					const enrichmentData: EnrichmentData = {
						aircraftId: aircraft.aircraftId,
					};

					// Define enrichment endpoints
					const enrichmentEndpoints = [
						{
							name: 'status',
							url: `${baseUrl}/Aircraft/getStatus/${authData.securityToken}`,
							method: 'POST',
							body: { aircraftId: aircraft.aircraftId },
						},
						{
							name: 'airframe',
							url: `${baseUrl}/Aircraft/getAirframe/${authData.securityToken}`,
							method: 'POST',
							body: { aircraftId: aircraft.aircraftId },
						},
						{
							name: 'engines',
							url: `${baseUrl}/Aircraft/getEngines/${authData.securityToken}`,
							method: 'POST',
							body: { aircraftId: aircraft.aircraftId },
						},
						{
							name: 'apu',
							url: `${baseUrl}/Aircraft/getAPU/${authData.securityToken}`,
							method: 'POST',
							body: { aircraftId: aircraft.aircraftId },
						},
						{
							name: 'avionics',
							url: `${baseUrl}/Aircraft/getAvionics/${authData.securityToken}`,
							method: 'POST',
							body: { aircraftId: aircraft.aircraftId },
						},
						{
							name: 'features',
							url: `${baseUrl}/Aircraft/getFeatures/${authData.securityToken}`,
							method: 'POST',
							body: { aircraftId: aircraft.aircraftId },
						},
						{
							name: 'additionalEquipment',
							url: `${baseUrl}/Aircraft/getAdditionalEquipment/${authData.securityToken}`,
							method: 'POST',
							body: { aircraftId: aircraft.aircraftId },
						},
						{
							name: 'interior',
							url: `${baseUrl}/Aircraft/getInterior/${authData.securityToken}`,
							method: 'POST',
							body: { aircraftId: aircraft.aircraftId },
						},
						{
							name: 'exterior',
							url: `${baseUrl}/Aircraft/getExterior/${authData.securityToken}`,
							method: 'POST',
							body: { aircraftId: aircraft.aircraftId },
						},
						{
							name: 'maintenance',
							url: `${baseUrl}/Aircraft/getMaintenance/${authData.securityToken}`,
							method: 'POST',
							body: { aircraftId: aircraft.aircraftId },
						},
						{
							name: 'relationships',
							url: `${baseUrl}/Aircraft/getRelationships/${authData.securityToken}`,
							method: 'POST',
							body: { aircraftId: aircraft.aircraftId },
						},
					];

					// Fetch enrichment data from all endpoints
					const enrichmentPromises = enrichmentEndpoints.map(async endpoint => {
						try {
							const response = await fetch(endpoint.url, {
								method: endpoint.method,
								headers,
								body: JSON.stringify(endpoint.body),
							});

							if (!response.ok) {
								throw new Error(`HTTP ${response.status}: ${response.statusText}`);
							}

							const data = await response.json();
							return { name: endpoint.name, data };
						} catch (error) {
							log.warn(
								`Failed to fetch ${endpoint.name} for aircraft ${aircraft.aircraftId}`,
								{
									requestId,
									aircraftId: aircraft.aircraftId,
									endpoint: endpoint.name,
								},
								error as Error
							);
							return { name: endpoint.name, data: null };
						}
					});

					const enrichmentResults = await Promise.all(enrichmentPromises);

					// Process enrichment results
					for (const result of enrichmentResults) {
						if (result.data) {
							switch (result.name) {
								case 'status':
									enrichmentData.status = result.data;
									break;
								case 'airframe':
									enrichmentData.airframe = result.data;
									break;
								case 'engines':
									enrichmentData.engines = result.data;
									break;
								case 'apu':
									enrichmentData.apu = result.data;
									break;
								case 'avionics':
									enrichmentData.avionics = result.data;
									break;
								case 'features':
									enrichmentData.features = result.data;
									break;
								case 'additionalEquipment':
									enrichmentData.additionalEquipment = result.data;
									break;
								case 'interior':
									enrichmentData.interior = result.data;
									break;
								case 'exterior':
									enrichmentData.exterior = result.data;
									break;
								case 'maintenance':
									enrichmentData.maintenance = result.data;
									break;
								case 'relationships':
									enrichmentData.relationships = result.data;
									break;
							}
						}
					}

					// Fetch images if available
					try {
						const imagesResponse = await fetch(
							`${baseUrl}/Aircraft/getImages/${authData.securityToken}`,
							{
								method: 'POST',
								headers,
								body: JSON.stringify({ aircraftId: aircraft.aircraftId }),
							}
						);

						if (imagesResponse.ok) {
							const imagesData = await imagesResponse.json();
							if (imagesData.images && Array.isArray(imagesData.images)) {
								enrichmentData.images = imagesData.images.map((img: any, index: number) => ({
									url: img.url || img.imageUrl,
									type: img.type || (index === 0 ? 'exterior' : 'other'),
									caption: img.caption || `Aircraft ${aircraft.aircraftId} - Image ${index + 1}`,
									isHero: index === 0,
								}));
							}
						}
					} catch (error) {
						log.warn(
							`Failed to fetch images for aircraft ${aircraft.aircraftId}`,
							{
								requestId,
								aircraftId: aircraft.aircraftId,
							},
							error as Error
						);
					}

					// Update aircraft record with enrichment data
					await prisma.aircraft.update({
						where: { id: aircraft.id },
						data: {
							lastEnrichedAt: new Date(),
							specifications: JSON.stringify({
								...JSON.parse(
									await prisma.aircraft
										.findUnique({
											where: { id: aircraft.id },
											select: { specifications: true },
										})
										.then(r => r?.specifications || '{}')
								),
								...enrichmentData.status,
								...enrichmentData.airframe,
								...enrichmentData.engines,
								...enrichmentData.apu,
								...enrichmentData.avionics,
								...enrichmentData.features,
								...enrichmentData.additionalEquipment,
								...enrichmentData.interior,
								...enrichmentData.exterior,
								...enrichmentData.maintenance,
							}),
							features: JSON.stringify({
								...JSON.parse(
									await prisma.aircraft
										.findUnique({
											where: { id: aircraft.id },
											select: { features: true },
										})
										.then(r => r?.features || '{}')
								),
								relationships: enrichmentData.relationships,
								enrichmentData: {
									status: enrichmentData.status,
									airframe: enrichmentData.airframe,
									engines: enrichmentData.engines,
									apu: enrichmentData.apu,
									avionics: enrichmentData.avionics,
									features: enrichmentData.features,
									additionalEquipment: enrichmentData.additionalEquipment,
									interior: enrichmentData.interior,
									exterior: enrichmentData.exterior,
									maintenance: enrichmentData.maintenance,
								},
							}),
						},
					});

					// Store images if available
					if (enrichmentData.images && enrichmentData.images.length > 0) {
						// Delete existing images
						await prisma.aircraftImage.deleteMany({
							where: { aircraftId: aircraft.id },
						});

						// Create new images
						for (const image of enrichmentData.images) {
							await prisma.aircraftImage.create({
								data: {
									aircraftId: aircraft.id,
									url: image.url,
									type: image.type,
									caption: image.caption,
									isHero: image.isHero,
									order: enrichmentData.images!.indexOf(image),
								},
							});
						}
					}

					enrichedCount++;
					enrichmentResults.push({
						aircraftId: aircraft.aircraftId,
						success: true,
						enrichmentData,
					});

					log.info(`Successfully enriched aircraft ${aircraft.aircraftId}`, {
						requestId,
						aircraftId: aircraft.aircraftId,
					});
				} catch (error) {
					errorCount++;
					enrichmentResults.push({
						aircraftId: aircraft.aircraftId,
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error',
					});

					log.error(
						`Failed to enrich aircraft ${aircraft.aircraftId}`,
						{
							requestId,
							aircraftId: aircraft.aircraftId,
						},
						error as Error
					);
				}
			});

			// Wait for batch to complete
			await Promise.all(batchPromises);

			// Add delay between batches to be respectful to the API
			if (i + batchSize < aircraftToEnrich.length) {
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		}

		// Create sync log
		await prisma.syncLog.create({
			data: {
				syncType: 'jetnet-enrichment',
				status: errorCount === 0 ? 'SUCCESS' : 'COMPLETED_WITH_ERRORS',
				recordsProcessed: aircraftToEnrich.length,
				recordsCreated: 0,
				recordsUpdated: enrichedCount,
				errorMessage: errorCount > 0 ? `${errorCount} aircraft failed to enrich` : null,
				syncDurationMs: Date.now() - startTime,
				completedAt: new Date(),
				metadata: JSON.stringify({
					aircraftCount: aircraftToEnrich.length,
					enrichedCount,
					errorCount,
					enrichmentResults: enrichmentResults.filter(r => r.success),
				}),
			},
		});

		const duration = Date.now() - startTime;

		log.info('JetNet enrichment completed', {
			requestId,
			component: 'api',
			action: 'jetnet_enrichment_complete',
			metadata: {
				aircraftCount: aircraftToEnrich.length,
				enrichedCount,
				errorCount,
				duration,
			},
		});

		return NextResponse.json({
			success: true,
			message: 'JetNet enrichment completed successfully',
			data: {
				processedCount: aircraftToEnrich.length,
				enrichedCount,
				errorCount,
				enrichmentResults: enrichmentResults.filter(r => r.success),
				duration,
			},
			timestamp: new Date().toISOString(),
			requestId,
		});
	} catch (error) {
		const duration = Date.now() - startTime;

		log.error(
			'JetNet enrichment failed',
			{
				requestId,
				component: 'api',
				action: 'jetnet_enrichment_error',
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
		// Get recent enrichment logs
		const recentEnrichments = await prisma.syncLog.findMany({
			where: { syncType: 'jetnet-enrichment' },
			orderBy: { startedAt: 'desc' },
			take: 10,
		});

		// Get enrichment statistics
		const totalAircraft = await prisma.aircraft.count();
		const enrichedAircraft = await prisma.aircraft.count({
			where: { lastEnrichedAt: { not: null } },
		});
		const needsEnrichment = await prisma.aircraft.count({
			where: {
				OR: [
					{ lastEnrichedAt: null },
					{ lastEnrichedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
				],
			},
		});

		return NextResponse.json({
			success: true,
			data: {
				recentEnrichments: recentEnrichments.map(enrichment => ({
					id: enrichment.id,
					status: enrichment.status,
					recordsProcessed: enrichment.recordsProcessed,
					recordsUpdated: enrichment.recordsUpdated,
					startedAt: enrichment.startedAt,
					completedAt: enrichment.completedAt,
					syncDurationMs: enrichment.syncDurationMs,
					metadata: enrichment.metadata ? JSON.parse(enrichment.metadata) : null,
				})),
				statistics: {
					totalAircraft,
					enrichedAircraft,
					needsEnrichment,
					lastEnrichment: recentEnrichments[0]?.completedAt || null,
				},
			},
		});
	} catch (error) {
		console.error('Error getting enrichment status:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to get enrichment status',
			},
			{ status: 500 }
		);
	}
}
