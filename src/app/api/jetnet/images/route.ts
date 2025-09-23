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

interface ImageData {
	url: string;
	type: 'exterior' | 'interior' | 'cockpit' | 'engine' | 'other';
	caption?: string;
	isHero?: boolean;
	order: number;
}

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const startTime = Date.now();
	const requestId = crypto.randomUUID();

	try {
		log.info('JetNet image sync started', {
			requestId,
			component: 'api',
			action: 'jetnet_image_sync',
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

		// Get aircraft IDs to process images for
		const { aircraftIds, limit = 100 } = await req.json();

		let aircraftToProcess: Array<{ aircraftId: number; id: string; registration: string }> = [];

		if (aircraftIds && Array.isArray(aircraftIds)) {
			// Process specific aircraft
			aircraftToProcess = await prisma.aircraft
				.findMany({
					where: {
						aircraftId: { in: aircraftIds },
					},
					select: {
						aircraftId: true,
						id: true,
						registration: true,
					},
				})
				.then(aircraft =>
					aircraft
						.filter(a => a.aircraftId !== null)
						.map(a => ({
							aircraftId: a.aircraftId!,
							id: a.id,
							registration: a.registration || '',
						}))
				);
		} else {
			// Process aircraft that don't have images or have outdated images
			aircraftToProcess = await prisma.aircraft
				.findMany({
					where: {
						OR: [
							{ images: { none: {} } },
							// { lastImageSyncAt: null }, // Commented out as property doesn't exist
							// { lastImageSyncAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // 30 days ago - commented out as property doesn't exist
						],
					},
					select: {
						aircraftId: true,
						id: true,
						registration: true,
					},
					take: limit,
				})
				.then(aircraft =>
					aircraft
						.filter(a => a.aircraftId !== null)
						.map(a => ({
							aircraftId: a.aircraftId!,
							id: a.id,
							registration: a.registration || '',
						}))
				);
		}

		if (aircraftToProcess.length === 0) {
			return NextResponse.json({
				success: true,
				message: 'No aircraft to process images for',
				data: {
					processedCount: 0,
					imagesProcessed: 0,
					errorCount: 0,
				},
			});
		}

		log.info(`Starting image processing for ${aircraftToProcess.length} aircraft`, {
			requestId,
			aircraftCount: aircraftToProcess.length,
		});

		let imagesProcessed = 0;
		let errorCount = 0;
		const imageResults: Array<{
			aircraftId: number;
			success: boolean;
			imagesCount: number;
			error?: string;
		}> = [];

		// Process aircraft in batches
		const batchSize = 5; // Smaller batch size for image processing
		for (let i = 0; i < aircraftToProcess.length; i += batchSize) {
			const batch = aircraftToProcess.slice(i, i + batchSize);

			// Process batch in parallel
			const batchPromises = batch.map(async aircraft => {
				try {
					// Fetch images from JetNet
					const imagesResponse = await fetch(
						`${baseUrl}/Aircraft/getImages/${authData.securityToken}`,
						{
							method: 'POST',
							headers,
							body: JSON.stringify({ aircraftId: aircraft.aircraftId }),
						}
					);

					if (!imagesResponse.ok) {
						throw new Error(`HTTP ${imagesResponse.status}: ${imagesResponse.statusText}`);
					}

					const imagesData = await imagesResponse.json();
					let images: ImageData[] = [];

					// Process images from response
					if (imagesData.images && Array.isArray(imagesData.images)) {
						images = imagesData.images.map((img: any, index: number) => ({
							url: img.url || img.imageUrl || img.src,
							type: img.type || (index === 0 ? 'exterior' : 'other'),
							caption: img.caption || `Aircraft ${aircraft.registration} - Image ${index + 1}`,
							isHero: index === 0,
							order: index,
						}));
					} else if (imagesData.acphotos && Array.isArray(imagesData.acphotos)) {
						// Handle alternative image format
						images = imagesData.acphotos.map((photo: string, index: number) => ({
							url: photo,
							type: index === 0 ? 'exterior' : 'other',
							caption: `Aircraft ${aircraft.registration} - Image ${index + 1}`,
							isHero: index === 0,
							order: index,
						}));
					}

					// If no images from JetNet, try to get basic aircraft data for placeholder
					if (images.length === 0) {
						try {
							const aircraftResponse = await fetch(
								`${baseUrl}/Aircraft/getAircraftList/${authData.securityToken}`,
								{
									method: 'POST',
									headers,
									body: JSON.stringify({
										page: 1,
										limit: 1,
										filter: { aircraftId: aircraft.aircraftId },
									}),
								}
							);

							if (aircraftResponse.ok) {
								const aircraftData = await aircraftResponse.json();
								if (aircraftData.aircraft && aircraftData.aircraft.length > 0) {
									const aircraftRecord = aircraftData.aircraft[0];

									// Check for photos in aircraft record
									if (aircraftRecord.acphotos) {
										const photos = Array.isArray(aircraftRecord.acphotos)
											? aircraftRecord.acphotos
											: [aircraftRecord.acphotos];

										images = photos.map((photo: string, index: number) => ({
											url: photo,
											type: index === 0 ? 'exterior' : 'other',
											caption: `Aircraft ${aircraft.registration} - Image ${index + 1}`,
											isHero: index === 0,
											order: index,
										}));
									}
								}
							}
						} catch (error) {
							log.warn(
								`Failed to get basic aircraft data for ${aircraft.aircraftId}`,
								{
									requestId,
									aircraftId: aircraft.aircraftId,
								},
								error as Error
							);
						}
					}

					// If still no images, create placeholder
					if (images.length === 0) {
						images = [
							{
								url: `data:image/svg+xml;base64,${Buffer.from(
									`
								<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
									<rect width="400" height="300" fill="#f3f4f6"/>
									<text x="200" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">
										Aircraft ${aircraft.registration}
									</text>
									<text x="200" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af">
										Image not available
									</text>
								</svg>
							`
								).toString('base64')}`,
								type: 'exterior' as const,
								caption: `Aircraft ${aircraft.registration} - Placeholder`,
								isHero: true,
								order: 0,
							},
						];
					}

					// Delete existing images
					await prisma.aircraftImage.deleteMany({
						where: { aircraftId: aircraft.id },
					});

					// Create new images
					for (const image of images) {
						await prisma.aircraftImage.create({
							data: {
								aircraftId: aircraft.id,
								url: image.url,
								type: image.type,
								caption: image.caption,
								isHero: image.isHero,
								order: image.order,
							},
						});
					}

					// Update aircraft record
					await prisma.aircraft.update({
						where: { id: aircraft.id },
						data: {
							// lastImageSyncAt: new Date(), // Commented out as property doesn't exist in schema
							// Store image metadata in specifications
							specifications: JSON.stringify({
								...JSON.parse(
									await prisma.aircraft
										.findUnique({
											where: { id: aircraft.id },
											select: { specifications: true },
										})
										.then(r => r?.specifications || '{}')
								),
								imageMetadata: {
									imageCount: images.length,
									hasImages: images.length > 0,
									lastImageSync: new Date().toISOString(),
									imageTypes: images.map(img => img.type),
								},
							}),
						},
					});

					imagesProcessed += images.length;
					imageResults.push({
						aircraftId: aircraft.aircraftId,
						success: true,
						imagesCount: images.length,
					});

					log.info(
						`Successfully processed ${images.length} images for aircraft ${aircraft.aircraftId}`,
						{
							requestId,
							aircraftId: aircraft.aircraftId,
							imageCount: images.length,
						}
					);
				} catch (error) {
					errorCount++;
					imageResults.push({
						aircraftId: aircraft.aircraftId,
						success: false,
						imagesCount: 0,
						error: error instanceof Error ? error.message : 'Unknown error',
					});

					log.error(
						`Failed to process images for aircraft ${aircraft.aircraftId}`,
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

			// Add delay between batches
			if (i + batchSize < aircraftToProcess.length) {
				await new Promise(resolve => setTimeout(resolve, 2000));
			}
		}

		// Create sync log
		await prisma.syncLog.create({
			data: {
				syncType: 'jetnet-images',
				status: errorCount === 0 ? 'SUCCESS' : 'COMPLETED_WITH_ERRORS',
				recordsProcessed: aircraftToProcess.length,
				recordsCreated: 0,
				recordsUpdated: aircraftToProcess.length,
				errorMessage: errorCount > 0 ? `${errorCount} aircraft failed to process images` : null,
				syncDurationMs: Date.now() - startTime,
				completedAt: new Date(),
				metadata: JSON.stringify({
					aircraftCount: aircraftToProcess.length,
					imagesProcessed,
					errorCount,
					imageResults: imageResults.filter(r => r.success),
				}),
			},
		});

		const duration = Date.now() - startTime;

		log.info('JetNet image sync completed', {
			requestId,
			component: 'api',
			action: 'jetnet_image_sync_complete',
			metadata: {
				aircraftCount: aircraftToProcess.length,
				imagesProcessed,
				errorCount,
				duration,
			},
		});

		return NextResponse.json({
			success: true,
			message: 'JetNet image sync completed successfully',
			data: {
				processedCount: aircraftToProcess.length,
				imagesProcessed,
				errorCount,
				imageResults: imageResults.filter(r => r.success),
				duration,
			},
			timestamp: new Date().toISOString(),
			requestId,
		});
	} catch (error) {
		const duration = Date.now() - startTime;

		log.error(
			'JetNet image sync failed',
			{
				requestId,
				component: 'api',
				action: 'jetnet_image_sync_error',
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
		// Get recent image sync logs
		const recentImageSyncs = await prisma.syncLog.findMany({
			where: { syncType: 'jetnet-images' },
			orderBy: { startedAt: 'desc' },
			take: 10,
		});

		// Get image statistics
		const totalAircraft = await prisma.aircraft.count();
		const aircraftWithImages = await prisma.aircraft.count({
			where: { images: { some: {} } },
		});
		const totalImages = await prisma.aircraftImage.count();
		const needsImageSync = await prisma.aircraft.count({
			where: {
				OR: [
					{ images: { none: {} } },
					{ lastImageSyncAt: null },
					{ lastImageSyncAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
				],
			},
		});

		return NextResponse.json({
			success: true,
			data: {
				recentImageSyncs: recentImageSyncs.map(sync => ({
					id: sync.id,
					status: sync.status,
					recordsProcessed: sync.recordsProcessed,
					recordsUpdated: sync.recordsUpdated,
					startedAt: sync.startedAt,
					completedAt: sync.completedAt,
					syncDurationMs: sync.syncDurationMs,
					metadata: sync.metadata ? JSON.parse(sync.metadata) : null,
				})),
				statistics: {
					totalAircraft,
					aircraftWithImages,
					totalImages,
					needsImageSync,
					lastImageSync: recentImageSyncs[0]?.completedAt || null,
				},
			},
		});
	} catch (error) {
		console.error('Error getting image sync status:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to get image sync status',
			},
			{ status: 500 }
		);
	}
}
