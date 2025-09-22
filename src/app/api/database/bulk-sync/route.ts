import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const {
			syncType = 'full',
			tableName,
			filters = {},
			batchSize = 1000,
			forceRefresh = false,
		} = body;

		// Create sync log entry
		const syncLog = await prisma.syncLog.create({
			data: {
				syncType,
				status: 'STARTED',
				metadata: JSON.stringify({ tableName, filters, batchSize }),
			},
		});

		try {
			let result: { totalProcessed?: number; created?: number; updated?: number } = {};

			switch (syncType) {
				case 'aircraft':
					result = await syncAircraftData(filters, batchSize, forceRefresh);
					break;
				case 'companies':
					result = await syncCompanyData(filters, batchSize, forceRefresh);
					break;
				case 'contacts':
					result = await syncContactData(filters, batchSize, forceRefresh);
					break;
				case 'market_data':
					result = await syncMarketData(filters, batchSize, forceRefresh);
					break;
				case 'full':
					result = await performFullSync(batchSize, forceRefresh);
					break;
				default:
					throw new Error(`Unknown sync type: ${syncType}`);
			}

			// Update sync log with success
			await prisma.syncLog.update({
				where: { id: syncLog.id },
				data: {
					status: 'COMPLETED',
					recordsProcessed: result.totalProcessed || 0,
					recordsCreated: result.created || 0,
					recordsUpdated: result.updated || 0,
					syncDurationMs: Date.now() - syncLog.startedAt.getTime(),
					completedAt: new Date(),
				},
			});

			return NextResponse.json({
				success: true,
				syncId: syncLog.id,
				...result,
			});
		} catch (error) {
			// Update sync log with error
			await prisma.syncLog.update({
				where: { id: syncLog.id },
				data: {
					status: 'FAILED',
					errorMessage: error instanceof Error ? error.message : 'Unknown error',
					syncDurationMs: Date.now() - syncLog.startedAt.getTime(),
					completedAt: new Date(),
				},
			});

			throw error;
		}
	} catch (error) {
		console.error('Bulk sync error:', error);
		return NextResponse.json(
			{
				error: 'Sync failed',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

export async function GET() {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const limit = parseInt(searchParams.get('limit') || '100');
		const offset = parseInt(searchParams.get('offset') || '0');
		const status = searchParams.get('status');

		const where = status ? { status } : {};

		const [logs, total] = await Promise.all([
			prisma.syncLog.findMany({
				where,
				orderBy: { startedAt: 'desc' },
				take: limit,
				skip: offset,
			}),
			prisma.syncLog.count({ where }),
		]);

		return NextResponse.json({
			logs,
			pagination: {
				total,
				limit,
				offset,
				hasMore: offset + limit < total,
			},
		});
	} catch (error) {
		console.error('Get sync logs error:', error);
		return NextResponse.json({ error: 'Failed to fetch sync logs' }, { status: 500 });
	}
}

async function syncAircraftData(
	filters: Record<string, unknown>,
	batchSize: number,
	forceRefresh: boolean
) {
	const jetnetApi = await getJetNetApiClient();

	let totalProcessed = 0;
	let created = 0;
	let updated = 0;
	let offset = 0;

	while (true) {
		const aircraftData = await jetnetApi.searchAircraft({
			...filters,
			limit: batchSize,
			offset,
		});

		if (!aircraftData?.aircraft || aircraftData.aircraft.length === 0) {
			break;
		}

		for (const aircraft of aircraftData.aircraft) {
			try {
				const aircraftRecord = aircraft as Record<string, unknown>;
				const existingAircraft = await prisma.aircraft.findUnique({
					where: { aircraftId: aircraftRecord.id as string },
				});

				const aircraftData = {
					aircraftId: aircraftRecord.id,
					name: aircraftRecord.name,
					manufacturer: aircraftRecord.make,
					model: aircraftRecord.model,
					variant: aircraftRecord.variant,
					year: aircraftRecord.year,
					yearManufactured: aircraftRecord.yearManufactured,
					price: aircraftRecord.price,
					askingPrice: aircraftRecord.askingPrice,
					currency: aircraftRecord.currency || 'USD',
					location: aircraftRecord.location,
					status: mapAircraftStatus(aircraftRecord.status as string),
					image: aircraftRecord.image,
					description: aircraftRecord.description,
					specifications: aircraftRecord.specifications,
					features: aircraftRecord.features,
					contactInfo: aircraftRecord.contactInfo,
					marketData: aircraftRecord.marketData,
					maintenanceData: aircraftRecord.maintenanceData,
					ownershipData: aircraftRecord.ownershipData,
					registration: aircraftRecord.registration,
					make: aircraftRecord.make,
					serialNumber: aircraftRecord.serialNumber,
					forSale: aircraftRecord.forSale,
					totalTimeHours: aircraftRecord.totalTimeHours,
					engineHours: aircraftRecord.engineHours,
					dateListed: aircraftRecord.dateListed
						? new Date(aircraftRecord.dateListed as string)
						: null,
					lastUpdated: new Date(),
				};

				if (existingAircraft) {
					if (
						forceRefresh ||
						isDataNewer(aircraftRecord.lastUpdated as string, existingAircraft.lastUpdated)
					) {
						await prisma.aircraft.update({
							where: { id: existingAircraft.id },
							data: aircraftData,
						});
						updated++;
					}
				} else {
					await prisma.aircraft.create({
						data: aircraftData,
					});
					created++;
				}

				totalProcessed++;
			} catch (error) {
				console.error(`Error processing aircraft ${aircraft.id}:`, error);
			}
		}

		offset += batchSize;
	}

	return { totalProcessed, created, updated };
}

async function syncCompanyData(filters: any, batchSize: number, forceRefresh: boolean) {
	const jetnetApi = await getJetNetApiClient();

	let totalProcessed = 0;
	let created = 0;
	let updated = 0;
	let offset = 0;

	while (true) {
		const companyData = await jetnetApi.searchCompanies({
			...filters,
			limit: batchSize,
			offset,
		});

		if (!companyData?.companies || companyData.companies.length === 0) {
			break;
		}

		for (const company of companyData.companies) {
			try {
				const companyRecord = company as Record<string, unknown>;
				const existingCompany = await prisma.company.findUnique({
					where: { companyId: companyRecord.id as string },
				});

				const companyData = {
					companyId: companyRecord.id,
					companyName: companyRecord.name,
					businessType: companyRecord.businessType,
					address1: companyRecord.address1,
					address2: companyRecord.address2,
					city: companyRecord.city,
					state: companyRecord.state,
					zipCode: companyRecord.zipCode,
					country: companyRecord.country,
					phone: companyRecord.phone,
					email: companyRecord.email,
					website: companyRecord.website,
					lastUpdated: new Date(),
				};

				if (existingCompany) {
					if (
						forceRefresh ||
						isDataNewer(companyRecord.lastUpdated as string, existingCompany.updatedAt)
					) {
						await prisma.company.update({
							where: { id: existingCompany.id },
							data: companyData,
						});
						updated++;
					}
				} else {
					await prisma.company.create({
						data: companyData,
					});
					created++;
				}

				totalProcessed++;
			} catch (error) {
				console.error(`Error processing company ${company.id}:`, error);
			}
		}

		offset += batchSize;
	}

	return { totalProcessed, created, updated };
}

async function syncContactData(filters: any, batchSize: number, forceRefresh: boolean) {
	const jetnetApi = await getJetNetApiClient();

	let totalProcessed = 0;
	let created = 0;
	let updated = 0;
	let offset = 0;

	while (true) {
		const contactData = await jetnetApi.searchContacts({
			...filters,
			limit: batchSize,
			offset,
		});

		if (!contactData?.contacts || contactData.contacts.length === 0) {
			break;
		}

		for (const contact of contactData.contacts) {
			try {
				const contactRecord = contact as Record<string, unknown>;
				const existingContact = await prisma.contact.findUnique({
					where: { contactId: contactRecord.id as string },
				});

				const contactData = {
					contactId: contactRecord.id,
					companyId: contactRecord.companyId,
					firstName: contactRecord.firstName,
					lastName: contactRecord.lastName,
					title: contactRecord.title,
					email: contactRecord.email,
					phone: contactRecord.phone,
					mobile: contactRecord.mobile,
					name: contactRecord.name,
					company: contactRecord.company,
					position: contactRecord.position,
					status: mapContactStatus(contactRecord.status as string),
					lastContact: contactRecord.lastContact
						? new Date(contactRecord.lastContact as string)
						: null,
					lastUpdated: new Date(),
				};

				if (existingContact) {
					if (
						forceRefresh ||
						isDataNewer(contactRecord.lastUpdated as string, existingContact.updatedAt)
					) {
						await prisma.contact.update({
							where: { id: existingContact.id },
							data: contactData,
						});
						updated++;
					}
				} else {
					await prisma.contact.create({
						data: contactData,
					});
					created++;
				}

				totalProcessed++;
			} catch (error) {
				console.error(`Error processing contact ${contact.id}:`, error);
			}
		}

		offset += batchSize;
	}

	return { totalProcessed, created, updated };
}

async function syncMarketData(
	filters: Record<string, unknown>,
	batchSize: number,
	forceRefresh: boolean
) {
	const jetnetApi = await getJetNetApiClient();

	let totalProcessed = 0;
	let created = 0;
	let updated = 0;
	let offset = 0;

	while (true) {
		const marketData = await jetnetApi.getMarketData({
			...filters,
			limit: batchSize,
			offset,
		});

		if (!marketData?.data || marketData.data.length === 0) {
			break;
		}

		for (const data of marketData.data) {
			try {
				const dataRecord = data as Record<string, unknown>;
				const existingData = await prisma.marketData.findFirst({
					where: {
						make: dataRecord.make as string,
						model: dataRecord.model as string,
						category: dataRecord.category as string,
						dataDate: new Date(dataRecord.dataDate as string),
					},
				});

				const marketDataRecord = {
					make: dataRecord.make,
					model: dataRecord.model,
					category: dataRecord.category,
					avgPrice: dataRecord.avgPrice,
					minPrice: dataRecord.minPrice,
					maxPrice: dataRecord.maxPrice,
					totalListings: dataRecord.totalListings,
					avgDaysOnMarket: dataRecord.avgDaysOnMarket,
					priceTrend: mapPriceTrend(dataRecord.priceTrend as string),
					marketTrend: mapMarketTrend(dataRecord.marketTrend as string),
					dataDate: new Date(dataRecord.dataDate as string),
					source: dataRecord.source || 'JetNet',
					rawData: JSON.stringify(dataRecord.rawData),
				};

				if (existingData) {
					if (forceRefresh) {
						await prisma.marketData.update({
							where: { id: existingData.id },
							data: marketDataRecord,
						});
						updated++;
					}
				} else {
					await prisma.marketData.create({
						data: marketDataRecord,
					});
					created++;
				}

				totalProcessed++;
			} catch (error) {
				console.error(`Error processing market data:`, error);
			}
		}

		offset += batchSize;
	}

	return { totalProcessed, created, updated };
}

async function performFullSync(batchSize: number, forceRefresh: boolean) {
	const results = await Promise.all([
		syncAircraftData({}, batchSize, forceRefresh),
		syncCompanyData({}, batchSize, forceRefresh),
		syncContactData({}, batchSize, forceRefresh),
		syncMarketData({}, batchSize, forceRefresh),
	]);

	return {
		totalProcessed: results.reduce((sum, r) => sum + r.totalProcessed, 0),
		created: results.reduce((sum, r) => sum + r.created, 0),
		updated: results.reduce((sum, r) => sum + r.updated, 0),
		details: {
			aircraft: results[0],
			companies: results[1],
			contacts: results[2],
			marketData: results[3],
		},
	};
}

// Helper functions
function mapAircraftStatus(status: string) {
	const statusMap: Record<string, string> = {
		'For Sale': 'AVAILABLE',
		Sold: 'SOLD',
		'Under Contract': 'UNDER_CONTRACT',
		Maintenance: 'MAINTENANCE',
		Inspection: 'INSPECTION',
		Withdrawn: 'WITHDRAWN',
	};
	return statusMap[status] || 'AVAILABLE';
}

function mapContactStatus(status: string) {
	const statusMap: Record<string, string> = {
		Lead: 'LEAD',
		Prospect: 'PROSPECT',
		Customer: 'CUSTOMER',
		Inactive: 'INACTIVE',
	};
	return statusMap[status] || 'LEAD';
}

function mapPriceTrend(trend: string) {
	const trendMap: Record<string, string> = {
		Rising: 'RISING',
		Falling: 'FALLING',
		Stable: 'STABLE',
		Volatile: 'VOLATILE',
	};
	return trendMap[trend] || 'STABLE';
}

function mapMarketTrend(trend: string) {
	const trendMap: Record<string, string> = {
		Hot: 'HOT',
		Warm: 'WARM',
		Cool: 'COOL',
		Cold: 'COLD',
	};
	return trendMap[trend] || 'WARM';
}

function isDataNewer(newDate: string | Date, existingDate: Date): boolean {
	const newTimestamp = new Date(newDate).getTime();
	const existingTimestamp = existingDate.getTime();
	return newTimestamp > existingTimestamp;
}

async function getJetNetApiClient() {
	// This would be your actual JetNet API client implementation
	// For now, returning a mock implementation
	return {
		searchAircraft: async (params: any) => {
			// Mock implementation - replace with actual JetNet API call
			return { aircraft: [] };
		},
		searchCompanies: async (params: any) => {
			return { companies: [] };
		},
		searchContacts: async (params: any) => {
			return { contacts: [] };
		},
		getMarketData: async (params: any) => {
			return { data: [] };
		},
	};
}
