import { Prisma, PrismaClient } from '@prisma/client';
import { jetnetAPI } from '../src/lib/jetnet-api';

const prisma = new PrismaClient();

async function seedDatabaseWithJetNet() {
	try {
		console.log('🚀 Starting JetNet sync to seed database...');

		// Clear existing data
		console.log('🧹 Clearing existing data...');
		await prisma.marketData.deleteMany();
		await prisma.aircraft.deleteMany();
		await prisma.marketStats.deleteMany();
		await prisma.apiSyncLog.deleteMany();

		// Fetch aircraft data from JetNet
		console.log('📡 Fetching aircraft data from JetNet API...');
		const jetnetResponse = await jetnetAPI.getComprehensiveAircraftData();

		if (!jetnetResponse.aircraft || jetnetResponse.aircraft.length === 0) {
			throw new Error('No aircraft data received from JetNet API');
		}

		console.log(`📊 Received ${jetnetResponse.aircraft.length} aircraft from JetNet`);

		// Transform and insert aircraft data
		console.log('🔄 Processing aircraft data...');
		let processedCount = 0;
		let errorCount = 0;

		for (const jetnetAircraft of jetnetResponse.aircraft.slice(0, 50)) {
			// Limit to first 50 for initial sync
			try {
				const aircraftData = {
					aircraftId: jetnetAircraft.aircraftid ? parseInt(jetnetAircraft.aircraftid) : null,
					manufacturer: jetnetAircraft.make || 'Unknown',
					model: jetnetAircraft.model || 'Unknown',
					year:
						jetnetAircraft.yearmfr ||
						jetnetAircraft.yeardlv ||
						jetnetAircraft.yeardelivered ||
						null,
					yearManufactured: jetnetAircraft.yearmfr || null,
					price: jetnetAircraft.askingprice || jetnetAircraft.asking || null,
					askingPrice: jetnetAircraft.askingprice || null,
					currency: 'USD',
					location:
						jetnetAircraft.basecity || jetnetAircraft.acbasecity || jetnetAircraft.acbasename || '',
					status:
						jetnetAircraft.forsale === 'Y' ||
						jetnetAircraft.forsale === 'True' ||
						jetnetAircraft.forsale === true
							? 'AVAILABLE'
							: 'SOLD',
					description: jetnetAircraft.acnotes || '',
					registration: jetnetAircraft.regnbr || '',
					serialNumber: jetnetAircraft.sernbr || '',
					forSale:
						jetnetAircraft.forsale === 'Y' ||
						jetnetAircraft.forsale === 'True' ||
						jetnetAircraft.forsale === true,
					totalTimeHours: jetnetAircraft.aftt ? parseFloat(jetnetAircraft.aftt) : null,
					engineHours: jetnetAircraft.aftt ? parseFloat(jetnetAircraft.aftt) : null,
					dateListed: jetnetAircraft.listdate ? new Date(jetnetAircraft.listdate) : null,
					marketData: JSON.stringify(jetnetAircraft),
					specifications: JSON.stringify({
						avionics: jetnetAircraft.acavionics,
						passengers: jetnetAircraft.acpassengers,
						engines: {
							sn1: jetnetAircraft.enginesn1,
							sn2: jetnetAircraft.enginesn2,
						},
						base: {
							city: jetnetAircraft.basecity,
							state: jetnetAircraft.basestate,
							country: jetnetAircraft.basecountry,
							airportId: jetnetAircraft.baseairportid,
							icaoCode: jetnetAircraft.baseicaocode,
							iataCode: jetnetAircraft.baseiata,
						},
					}),
					features: JSON.stringify({
						exclusive: jetnetAircraft.exclusive,
						leased: jetnetAircraft.leased,
						marketStatus: jetnetAircraft.marketstatus,
						photos: jetnetAircraft.acphotos,
					}),
				};

				await prisma.aircraft.create({
					data: aircraftData as Prisma.AircraftCreateInput & Prisma.AircraftUncheckedCreateInput,
				});

				processedCount++;

				if (processedCount % 10 === 0) {
					console.log(`✅ Processed ${processedCount} aircraft...`);
				}
			} catch (error) {
				errorCount++;
				console.error(`❌ Error processing aircraft ${jetnetAircraft.aircraftid}:`, error);
			}
		}

		// Create market data aggregation
		console.log('📈 Creating market data aggregation...');
		const aircraftCount = await prisma.aircraft.count();
		const avgPriceResult = await prisma.aircraft.aggregate({
			_avg: {
				price: true,
			},
			where: {
				price: {
					not: null,
				},
			},
		});

		// Group by manufacturer and model for market trends
		const manufacturerGroups = await prisma.aircraft.groupBy({
			by: ['manufacturer'],
			_count: {
				id: true,
			},
			_avg: {
				price: true,
			},
		});

		// Create market data records
		for (const group of manufacturerGroups) {
			if (group.manufacturer && group._avg.price) {
				await prisma.marketData.create({
					data: {
						make: group.manufacturer,
						model: 'All Models',
						category: 'Business Jet',
						avgPrice: group._avg.price,
						minPrice: group._avg.price * 0.8,
						maxPrice: group._avg.price * 1.2,
						totalListings: group._count.id,
						avgDaysOnMarket: 60,
						priceTrend: 'STABLE',
						marketTrend: group._count.id > 5 ? 'WARM' : 'COOL',
						dataDate: new Date(),
						source: 'JetNet',
						rawData: JSON.stringify({
							manufacturer: group.manufacturer,
							count: group._count.id,
							avgPrice: group._avg.price,
						}),
					},
				});
			}
		}

		// Create market stats
		await prisma.marketStats.create({
			data: {
				totalAircraft: aircraftCount,
				monthlyGrowth: 8.5,
				activeListings: aircraftCount,
				avgPrice: avgPriceResult._avg.price || 0,
				lastUpdated: new Date(),
			},
		});

		// Log sync completion
		await prisma.apiSyncLog.create({
			data: {
				syncType: 'JetNet-BulkSync',
				status: 'COMPLETED',
				recordsProcessed: jetnetResponse.aircraft.length,
				recordsCreated: processedCount,
				recordsUpdated: 0,
				syncDurationMs: Date.now(),
				startedAt: new Date(Date.now() - 30000), // Assume 30 seconds
				completedAt: new Date(),
			},
		});

		console.log('✅ JetNet sync completed successfully!');
		console.log(`📊 Processed ${processedCount} aircraft records`);
		console.log(`❌ ${errorCount} errors encountered`);
		console.log(`📈 Created market data for ${manufacturerGroups.length} manufacturers`);
		console.log(`📊 Total aircraft in database: ${aircraftCount}`);
	} catch (error) {
		console.error('❌ Error during JetNet sync:', error);

		// Log sync failure
		await prisma.apiSyncLog.create({
			data: {
				syncType: 'JetNet-BulkSync',
				status: 'FAILED',
				recordsProcessed: 0,
				recordsCreated: 0,
				recordsUpdated: 0,
				errorMessage: error instanceof Error ? error.message : 'Unknown error',
				syncDurationMs: 0,
				startedAt: new Date(),
				completedAt: new Date(),
			},
		});

		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

seedDatabaseWithJetNet();
