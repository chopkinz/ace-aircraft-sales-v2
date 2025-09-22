import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
	try {
		console.log('🔄 Manual database sync initiated');

		const body = await request.json();
		const { aircraftData, source = 'manual-sync', workflowId } = body;

		if (!aircraftData || !Array.isArray(aircraftData)) {
			return NextResponse.json(
				{ success: false, error: 'Invalid aircraft data provided' },
				{ status: 400 }
			);
		}

		console.log(`📊 Processing ${aircraftData.length} aircraft records for manual sync`);

		let createdCount = 0;
		let updatedCount = 0;
		let skippedCount = 0;
		const errors: Array<{ aircraft: string; error: string }> = [];

		// Process aircraft data in batches for better performance
		const batchSize = 50;
		const batches = [];
		for (let i = 0; i < aircraftData.length; i += batchSize) {
			batches.push(aircraftData.slice(i, i + batchSize));
		}

		console.log(`📦 Processing ${batches.length} batches of ${batchSize} aircraft each`);

		for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
			const batch = batches[batchIndex];
			console.log(
				`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} aircraft)`
			);

			for (const aircraft of batch) {
				try {
					// Try to find existing aircraft by JetNet ID, registration, or serial number
					const existingAircraft = await prisma.aircraft.findFirst({
						where: {
							OR: [
								{
									aircraftId: aircraft.aircraftId
										? parseInt(aircraft.aircraftId.toString())
										: undefined,
								},
								{ registration: aircraft.registration?.toString() },
								{ serialNumber: aircraft.serialNumber?.toString() },
							],
						},
					});

					const aircraftDataToStore = {
						aircraftId: aircraft.aircraftId ? parseInt(aircraft.aircraftId.toString()) : null,
						manufacturer: aircraft.make?.toString() || 'Unknown',
						model: aircraft.model?.toString() || 'Unknown',
						year: aircraft.year ? parseInt(aircraft.year.toString()) : null,
						yearManufactured: aircraft.yearManufactured
							? parseInt(aircraft.yearManufactured.toString())
							: null,
						price: aircraft.price ? parseFloat(aircraft.price.toString()) : null,
						askingPrice: aircraft.askingPrice ? parseFloat(aircraft.askingPrice.toString()) : null,
						location: aircraft.location?.toString(),
						registration: aircraft.registration?.toString(),
						serialNumber: aircraft.serialNumber?.toString(),
						forSale:
							aircraft.forsale === 'Y' || aircraft.forsale === 'True' || aircraft.forsale === true,
						totalTimeHours: aircraft.totalTimeHours
							? parseFloat(aircraft.totalTimeHours.toString())
							: null,
						dateListed: aircraft.listDate ? new Date(aircraft.listDate) : null,
						status: (aircraft.forsale === 'Y' || aircraft.forsale === 'True'
							? 'AVAILABLE'
							: 'SOLD') as 'AVAILABLE' | 'SOLD',
						description: aircraft.notes?.toString(),
						// Store enhanced comprehensive raw data as JSON
						specifications: JSON.stringify({
							avionics: aircraft.avionics,
							passengers: aircraft.passengers,
							engineSn1: aircraft.engineSn1,
							engineSn2: aircraft.engineSn2,
							estimatedAftt: aircraft.estimatedAftt,
							baseCity: aircraft.baseCity,
							baseState: aircraft.baseState,
							baseCountry: aircraft.baseCountry,
							baseAirportId: aircraft.baseAirportId,
							baseIcaoCode: aircraft.baseIcaoCode,
							baseIataCode: aircraft.baseIataCode,
							exclusive: aircraft.exclusive,
							leased: aircraft.leased,
							marketStatus: aircraft.marketStatus,
							// Enhanced fields
							priceFormatted: aircraft.priceFormatted,
							totalTimeFormatted: aircraft.totalTimeFormatted,
							listDateFormatted: aircraft.listDateFormatted,
							statusBadge: aircraft.statusBadge,
							dataQuality: aircraft.dataQuality,
							sourceType: aircraft.sourceType,
							currency: aircraft.currency,
							processedAt: aircraft.processedAt,
							dataSource: aircraft.dataSource,
						}),
						// Store all enhanced raw JetNet data
						marketData: JSON.stringify(aircraft),
						lastUpdated: new Date(),
					};

					if (existingAircraft) {
						await prisma.aircraft.update({
							where: { id: existingAircraft.id },
							data: aircraftDataToStore,
						});
						updatedCount++;
					} else {
						await prisma.aircraft.create({
							data: aircraftDataToStore,
						});
						createdCount++;
					}
				} catch (error) {
					skippedCount++;
					const errorMessage = error instanceof Error ? error.message : 'Unknown error';
					errors.push({
						aircraft: aircraft.registration || aircraft.serialNumber || 'Unknown',
						error: errorMessage,
					});
					console.error(
						`Error syncing aircraft ${aircraft.registration || aircraft.serialNumber}:`,
						error
					);
				}
			}

			// Small delay between batches to avoid overwhelming the database
			if (batchIndex < batches.length - 1) {
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		}

		// Calculate data quality metrics
		const dataQuality = {
			recordsWithPrice: aircraftData.filter((a: any) => a.price).length,
			recordsWithLocation: aircraftData.filter((a: any) => a.location).length,
			recordsWithPhotos: aircraftData.filter((a: any) => a.photos).length,
			recordsComplete: aircraftData.filter((a: any) => a.price && a.location && a.make && a.model)
				.length,
		};

		// Enhanced sync logging with comprehensive metrics
		const syncMetrics = {
			totalProcessed: aircraftData.length,
			created: createdCount,
			updated: updatedCount,
			skipped: skippedCount,
			dataQuality,
			source,
			workflowId,
			enhancedData: true,
			errors: errors.length,
		};

		await prisma.syncLog.create({
			data: {
				syncType: 'aircraft-manual',
				status: errors.length === 0 ? 'SUCCESS' : 'COMPLETED_WITH_ERRORS',
				recordsProcessed: aircraftData.length,
				recordsCreated: createdCount,
				recordsUpdated: updatedCount,
				completedAt: new Date(),
				metadata: JSON.stringify(syncMetrics),
			},
		});

		console.log(
			`✅ Manual database sync complete: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped`
		);

		return NextResponse.json({
			success: true,
			message: 'Manual database sync completed successfully',
			results: {
				created: createdCount,
				updated: updatedCount,
				skipped: skippedCount,
				totalProcessed: aircraftData.length,
				dataQuality,
				errors: errors.length > 0 ? errors : undefined,
			},
			syncMetrics,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('❌ Manual database sync failed:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	} finally {
		await prisma.$disconnect();
	}
}

export async function GET() {
	try {
		console.log('📊 Getting database sync statistics');

		// Get recent sync logs
		const recentSyncs = await prisma.syncLog.findMany({
			orderBy: { completedAt: 'desc' },
			take: 10,
		});

		// Get aircraft statistics
		const aircraftStats = await prisma.aircraft.aggregate({
			_count: {
				id: true,
			},
		});

		const forSaleStats = await prisma.aircraft.count({
			where: { forSale: true },
		});

		const soldStats = await prisma.aircraft.count({
			where: { forSale: false },
		});

		// Get data quality metrics
		const withPrice = await prisma.aircraft.count({
			where: { price: { not: null } },
		});

		const withLocation = await prisma.aircraft.count({
			where: { location: { not: null } },
		});

		return NextResponse.json({
			success: true,
			statistics: {
				totalAircraft: aircraftStats._count.id,
				forSale: forSaleStats,
				sold: soldStats,
				dataQuality: {
					withPrice,
					withLocation,
					completenessScore:
						aircraftStats._count.id > 0
							? (((withPrice + withLocation) / (aircraftStats._count.id * 2)) * 100).toFixed(2)
							: '0.00',
				},
			},
			recentSyncs: recentSyncs.map(sync => ({
				id: sync.id,
				syncType: sync.syncType,
				status: sync.status,
				recordsProcessed: sync.recordsProcessed,
				recordsCreated: sync.recordsCreated,
				recordsUpdated: sync.recordsUpdated,
				completedAt: sync.completedAt,
				metadata: sync.metadata ? JSON.parse(sync.metadata) : null,
			})),
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('❌ Failed to get database sync statistics:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	} finally {
		await prisma.$disconnect();
	}
}
