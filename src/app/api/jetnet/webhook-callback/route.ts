import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jetnetSync } from '@/lib/jetnet-sync';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		console.log('📥 Received JetNet webhook callback:', {
			dataType: body.dataType,
			timestamp: body.timestamp,
			aircraftCount: body.aircraftData?.length || 0,
		});

		// Handle different data types from N8N workflows
		switch (body.dataType) {
			case 'comprehensive_workflow_result': {
				const { workflowState, aircraftData, reports } = body;

				// Process aircraft data if provided
				if (aircraftData && Array.isArray(aircraftData)) {
					console.log(`🔄 Processing ${aircraftData.length} aircraft records from workflow`);

					// Transform and sync aircraft data
					const transformedAircraft = aircraftData.map((aircraft: any, index: number) => ({
						// Core identification
						id: `jetnet-${aircraft.aircraftid || Date.now()}-${index}`,
						aircraftId: aircraft.aircraftid,

						// Basic aircraft info
						make: aircraft.make || 'Unknown',
						model: aircraft.model || 'Unknown',
						year: aircraft.yearmfr || aircraft.yeardlv || aircraft.yeardelivered || null,
						yearManufactured: aircraft.yearmfr || null,
						yearDelivered: aircraft.yeardlv || null,

						// Registration and serial
						registration: aircraft.regnbr || '',
						serialNumber: aircraft.sernbr || '',

						// Pricing
						price: aircraft.askingprice || aircraft.asking || null,
						askingPrice: aircraft.askingprice || null,
						currency: 'USD',

						// Location and base
						location: aircraft.basecity || aircraft.acbasecity || aircraft.acbasename || '',
						baseCity: aircraft.basecity || '',
						baseState: aircraft.basestate || '',
						baseCountry: aircraft.basecountry || '',
						baseAirportId: aircraft.baseairportid || '',
						baseIcaoCode: aircraft.baseicaocode || '',
						baseIataCode: aircraft.baseiata || '',

						// Flight hours
						totalTime: aircraft.aftt || aircraft.achours || null,
						totalTimeHours: aircraft.aftt ? parseFloat(aircraft.aftt) : null,
						estimatedAftt: aircraft.estaftt || null,

						// Engine information
						engineSn1: aircraft.enginesn1 || '',
						engineSn2: aircraft.enginesn2 || '',

						// Aircraft specifications
						avionics: aircraft.acavionics || '',
						passengers: aircraft.acpassengers || '',
						photos: aircraft.acphotos || '',
						notes: aircraft.acnotes || '',

						// Market status
						forsale:
							aircraft.forsale === 'Y' || aircraft.forsale === 'True' || aircraft.forsale === true,
						marketStatus: aircraft.marketstatus || '',
						exclusive: aircraft.exclusive || '',
						leased: aircraft.leased || '',

						// Dates
						listDate: aircraft.listdate ? new Date(aircraft.listdate) : null,

						// Status
						status: aircraft.forsale === 'Y' || aircraft.forsale === 'True' ? 'AVAILABLE' : 'SOLD',

						// Store all original data for flexibility
						rawData: aircraft,

						// Processing metadata
						processedAt: new Date().toISOString(),
						dataSource: 'JetNet-N8N-Workflow',
					}));

					// Sync aircraft data to database
					await syncAircraftData(transformedAircraft);
				}

				// Store workflow reports if provided
				if (reports) {
					await storeWorkflowReports(reports, workflowState?.workflowId);
				}

				break;
			}

			case 'aircraft_bulk_export': {
				const { aircraftData } = body;

				if (aircraftData && Array.isArray(aircraftData)) {
					console.log(`🔄 Processing bulk export: ${aircraftData.length} aircraft records`);
					await syncAircraftData(aircraftData);
				}
				break;
			}

			case 'workflow_error': {
				const { error, workflowId, nodeName } = body;
				console.error(`❌ Workflow error from ${workflowId}:`, error);

				// Log error to database
				await prisma.userActivity.create({
					data: {
						userId: 'system',
						action: 'WORKFLOW_ERROR',
						resource: 'jetnet-workflow',
						resourceId: workflowId || 'unknown',
						details: `Workflow error in node ${nodeName}: ${error}`,
					},
				});
				break;
			}

			default:
				console.log('📥 Unknown data type received:', body.dataType);
		}

		return NextResponse.json({
			success: true,
			message: 'Webhook processed successfully',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('❌ Error processing JetNet webhook:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to process webhook',
			},
			{ status: 500 }
		);
	}
}

/**
 * Sync aircraft data to database
 */
async function syncAircraftData(aircraftData: any[]): Promise<void> {
	let created = 0;
	let updated = 0;
	let errors = 0;

	for (const aircraft of aircraftData) {
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

			if (existingAircraft) {
				// Update existing aircraft
				await prisma.aircraft.update({
					where: { id: existingAircraft.id },
					data: {
						...aircraft,
						updatedAt: new Date(),
						// Preserve some local data
						createdAt: existingAircraft.createdAt,
						// Update market data
						marketData: {
							...existingAircraft.marketData,
							lastJetNetSync: new Date().toISOString(),
							jetNetData: aircraft.rawData,
						},
					},
				});
				updated++;
			} else {
				// Create new aircraft
				await prisma.aircraft.create({
					data: {
						...aircraft,
						createdAt: new Date(),
						updatedAt: new Date(),
						// Add market data
						marketData: {
							lastJetNetSync: new Date().toISOString(),
							jetNetData: aircraft.rawData,
							dataSource: 'JetNet-N8N-Workflow',
						},
					},
				});
				created++;
			}
		} catch (error) {
			errors++;
			console.error(
				`Error syncing aircraft ${aircraft.registration || aircraft.serialNumber}:`,
				error
			);
		}
	}

	console.log(`📊 Sync results: ${created} created, ${updated} updated, ${errors} errors`);
}

/**
 * Store workflow reports
 */
async function storeWorkflowReports(reports: any, workflowId?: string): Promise<void> {
	try {
		// Create a comprehensive report record
		await prisma.report.create({
			data: {
				type: 'comprehensive',
				title: `JetNet Workflow Report - ${workflowId || 'Unknown'}`,
				description: 'Comprehensive aircraft market analysis from JetNet workflow',
				data: JSON.stringify(reports),
				status: 'COMPLETED',
				generatedAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});

		console.log('📊 Workflow reports stored successfully');
	} catch (error) {
		console.error('Error storing workflow reports:', error);
	}
}
