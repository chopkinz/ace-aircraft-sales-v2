import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { UserRole } from '@prisma/client';

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

export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);

	if (!session || session.user.role !== UserRole.ADMIN) {
		return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { aircraftData } = await req.json();
		console.log('aircraftData', aircraftData);
		console.log('aircraftData length', aircraftData.length);
		console.log('aircraftData type', typeof aircraftData);
		console.log('aircraftData keys', Object.keys(aircraftData));
		console.log('aircraftData first', aircraftData[0]);
		console.log('aircraftData last', aircraftData[aircraftData.length - 1]);
		console.log('aircraftData first keys', Object.keys(aircraftData[0]));
		console.log('aircraftData last keys', Object.keys(aircraftData[aircraftData.length - 1]));

		if (!aircraftData || !Array.isArray(aircraftData)) {
			return NextResponse.json({ message: 'Invalid aircraft data provided' }, { status: 400 });
		}

		console.log(`🚀 Starting comprehensive sync for ${aircraftData.length} aircraft`);

		let processedCount = 0;
		let createdCount = 0;
		let updatedCount = 0;
		let errorCount = 0;
		const errors: string[] = [];

		// Process each aircraft
		for (const aircraft of aircraftData) {
			try {
				processedCount++;

				// Transform JetNet data to our schema with ALL endpoint data
				const aircraftData = {
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
					status: aircraft.forsale
						? 'AVAILABLE'
						: aircraft.marketStatus === 'Sold'
						? 'SOLD'
						: aircraft.marketStatus === 'Under Contract'
						? 'UNDER_CONTRACT'
						: aircraft.marketStatus === 'Maintenance'
						? 'MAINTENANCE'
						: aircraft.marketStatus === 'Inspection'
						? 'INSPECTION'
						: aircraft.marketStatus === 'Withdrawn'
						? 'WITHDRAWN'
						: 'AVAILABLE',
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
						data: {
							...aircraftData,
							updatedAt: new Date(),
						},
					});
					updatedCount++;
				} else {
					// Create new aircraft
					await prisma.aircraft.create({
						data: {
							...aircraftData,
							createdAt: new Date(),
							updatedAt: new Date(),
						},
					});
					createdCount++;
				}

				console.log(
					`✅ Processed aircraft ${processedCount}/${aircraftData.length}: ${aircraft.make} ${aircraft.model}`
				);
			} catch (error) {
				errorCount++;
				const errorMessage = `Error processing aircraft ${aircraft.aircraftId}: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`;
				errors.push(errorMessage);
				console.error(errorMessage);
			}
		}

		// Create sync log
		await prisma.apiSyncLog.create({
			data: {
				syncType: 'COMPREHENSIVE_JETNET_SYNC',
				status: errorCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
				recordsProcessed: processedCount,
				recordsCreated: createdCount,
				recordsUpdated: updatedCount,
				syncDurationMs: 0, // Will be calculated by n8n
				startedAt: new Date(),
				completedAt: new Date(),
				errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
			},
		});

		// Get updated database stats for response
		const [totalAircraft, activeListings, priceStats] = await Promise.all([
			prisma.aircraft.count(),
			prisma.aircraft.count({ where: { forSale: true } }),
			prisma.aircraft.aggregate({
				_sum: { price: true },
				where: { price: { not: null } },
			}),
		]);

		const result = {
			message: 'Comprehensive JetNet sync completed',
			summary: {
				totalProcessed: processedCount,
				created: createdCount,
				updated: updatedCount,
				errors: errorCount,
				successRate:
					processedCount > 0
						? (((processedCount - errorCount) / processedCount) * 100).toFixed(1)
						: 0,
			},
			databaseStats: {
				totalAircraft,
				activeListings,
				totalValue: priceStats._sum.price || 0,
			},
			errors: errors.slice(0, 10), // Return first 10 errors
		};

		console.log('🎉 Comprehensive sync completed:', result.summary);

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error('❌ Comprehensive sync error:', error);

		// Log the error
		await prisma.apiSyncLog.create({
			data: {
				syncType: 'COMPREHENSIVE_JETNET_SYNC',
				status: 'FAILED',
				recordsProcessed: 0,
				recordsCreated: 0,
				recordsUpdated: 0,
				syncDurationMs: 0,
				startedAt: new Date(),
				completedAt: new Date(),
				errorMessage: error instanceof Error ? error.message : 'Unknown error',
			},
		});

		return NextResponse.json(
			{
				message: 'Comprehensive sync failed',
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}
