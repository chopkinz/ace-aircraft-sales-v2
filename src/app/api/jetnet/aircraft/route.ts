import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { ...searchParams } = body;
		console.log('JetNet aircraft search with params:', searchParams);

		// Check for stored aircraft data from n8n first
		const storedAircraftData = (globalThis as Record<string, unknown>).jetnetAircraftData as Record<
			string,
			unknown
		>;

		if (storedAircraftData && storedAircraftData.data && Array.isArray(storedAircraftData.data)) {
			console.log(`📊 Using stored aircraft data: ${storedAircraftData.count} records from n8n`);

			// Filter stored data based on search parameters
			let filteredData = storedAircraftData.data as Record<string, unknown>[];

			// Apply basic filtering - now get ALL aircraft regardless of sale status
			// Only filter if specifically requested
			if (searchParams.forsale === 'True' || searchParams.status === 'For Sale') {
				filteredData = filteredData.filter(
					aircraft => aircraft.forsale === 'Y' || aircraft.forsale === 'True'
				);
			}

			if (searchParams.make) {
				const makeFilter = searchParams.make.toString().toLowerCase();
				filteredData = filteredData.filter(
					aircraft => aircraft.make && aircraft.make.toString().toLowerCase().includes(makeFilter)
				);
			}

			if (searchParams.model) {
				const modelFilter = searchParams.model.toString().toLowerCase();
				filteredData = filteredData.filter(
					aircraft =>
						aircraft.model && aircraft.model.toString().toLowerCase().includes(modelFilter)
				);
			}

			return NextResponse.json({
				success: true,
				data: filteredData,
				total: filteredData.length,
				source: 'n8n_stored_data',
				timestamp: new Date().toISOString(),
				metadata: {
					source: 'n8n stored data',
					originalCount: storedAircraftData.count,
					filteredCount: filteredData.length,
					searchParams,
					receivedAt: storedAircraftData.receivedAt,
					timestamp: new Date().toISOString(),
				},
			});
		}

		// Get authentication data - try global first, then authenticate if needed
		let authData = (globalThis as Record<string, unknown>).jetnetAuthData as Record<
			string,
			unknown
		>;

		if (!authData || !authData.bearerToken || !authData.securityToken) {
			console.log('No stored auth data, triggering n8n workflow...');

			// Trigger n8n workflow to get fresh auth and aircraft data
			try {
				const n8nResponse = await fetch(
					'https://autom8god.app.n8n.cloud/webhook/fbebd708-f17a-4896-91f8-328080362084',
					{
						method: 'GET',
						// timeout: 30000,
					}
				);

				if (n8nResponse.ok) {
					console.log('✅ n8n workflow triggered successfully');
					// Wait a bit for the workflow to complete
					await new Promise(resolve => setTimeout(resolve, 5000));

					// Check again for stored data
					const newStoredData = (globalThis as Record<string, unknown>)
						.jetnetAircraftData as Record<string, unknown>;

					if (newStoredData && newStoredData.data && Array.isArray(newStoredData.data)) {
						console.log(`📊 Using fresh aircraft data from n8n: ${newStoredData.count} records`);
						return NextResponse.json({
							success: true,
							data: newStoredData.data as Record<string, unknown>[],
							total: newStoredData.count as number,
							source: 'n8n_fresh_data',
							timestamp: new Date().toISOString(),
							metadata: {
								source: 'n8n fresh data',
								count: newStoredData.count,
								receivedAt: newStoredData.receivedAt,
								timestamp: new Date().toISOString(),
							},
						});
					}
				}
			} catch (n8nError) {
				console.warn('n8n workflow trigger failed, falling back to direct auth:', n8nError);
			}

			console.log('No stored data available, authenticating directly with JetNet...');

			// Fallback: Authenticate directly with JetNet API
			const loginUrl = 'https://customer.jetnetconnect.com/api/Admin/APILogin';
			const loginResponse = await fetch(loginUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify({
					emailaddress: process.env.JETNET_EMAIL,
					password: process.env.JETNET_PASSWORD,
				}),
			});

			if (!loginResponse.ok) {
				throw new Error(`JetNet login failed: ${loginResponse.statusText}`);
			}

			const loginData = await loginResponse.json();
			let loginResult;
			if (Array.isArray(loginData) && loginData.length > 0) {
				loginResult = loginData[0];
			} else {
				loginResult = loginData;
			}

			// Store the auth data
			authData = loginResult;
			(globalThis as Record<string, unknown>).jetnetAuthData = authData;

			console.log('Authentication successful, proceeding with search...');
		}

		// Use bulk endpoint by default for comprehensive data, allow override to list endpoint
		const useBulkEndpoint = searchParams.endpoint !== 'list';
		const jetnetAircraftUrl = useBulkEndpoint
			? `https://customer.jetnetconnect.com/api/Aircraft/getBulkAircraftExport/${authData.apiToken}`
			: `https://customer.jetnetconnect.com/api/Aircraft/getAircraftList/${authData.apiToken}`;

		// Build search parameters based on endpoint
		let searchBody: Record<string, unknown>;

		if (useBulkEndpoint) {
			// Parameters for getBulkAircraftExport - get ALL data with comprehensive settings
			searchBody = {
				forsale: '', // Empty to get ALL aircraft regardless of sale status
				aircraftchanges: 'true',
				showHistoricalAcRefs: true,
				exactMatchReg: false,
				exactMatchSer: false,
				exactMatchMake: false,
				exactMatchModel: false,
				caseSensitive: false,
				includeInactive: true, // Get inactive aircraft too
				includeDeleted: false, // Don't include deleted
				// Add comprehensive filters to get maximum data
				yearmfr: 0, // Get all years
				yeardlv: 0, // Get all delivery years
				airframetype: 0, // Get all airframe types
				maketype: 0, // Get all make types
				lifecycle: 'None', // Get all lifecycles
				// Remove restrictive filters to get more data
			};
		} else {
			// Parameters for getAircraftList - optimized for maximum data
			searchBody = {
				airframetype: 'None', // Get all airframe types
				maketype: 'None', // Get all make types
				sernbr: '', // No serial number filter
				regnbr: '', // No registration filter
				regnbrlist: [], // No registration list filter
				modelid: 0, // Get all models
				make: '', // No make filter
				forsale: '', // Empty to get ALL aircraft regardless of sale status
				lifecycle: 'None', // Get all lifecycles
				basestate: [], // Get all states
				basestatename: [], // Get all state names
				basecountry: '', // Get all countries
				basecountrylist: [], // Get all countries
				basecode: '', // Get all base codes
				actiondate: '', // No date filter
				enddate: '', // No end date filter
				companyid: 0, // Get all companies
				complist: [], // Get all companies
				contactid: 0, // Get all contacts
				yearmfr: 0, // Get all manufacture years
				yeardlv: 0, // Get all delivery years
				aircraftchanges: 'true', // Include changes
				aclist: [], // Get all aircraft
				modlist: [], // Get all models
				exactMatchReg: false, // Don't require exact matches
			};
		}

		// Handle location parameters
		if (searchParams.basecountry) {
			searchBody.basecountry = searchParams.basecountry;
		}

		if (searchParams.basecountrylist) {
			if (Array.isArray(searchParams.basecountrylist)) {
				searchBody.basecountrylist = searchParams.basecountrylist;
			} else if (typeof searchParams.basecountrylist === 'string') {
				searchBody.basecountrylist = searchParams.basecountrylist
					.split(',')
					.map((s: string) => s.trim());
			}
		}

		if (searchParams.basestate) {
			if (Array.isArray(searchParams.basestate)) {
				searchBody.basestate = searchParams.basestate;
			} else if (typeof searchParams.basestate === 'string') {
				searchBody.basestate = searchParams.basestate.split(',').map((s: string) => s.trim());
			}
		}

		// Handle aircraft type parameters with proper enum mapping
		if (searchParams.airframetype) {
			// Map common values to JetNet enum integer values
			const airframeTypeMap: Record<string, number> = {
				JET: 1,
				jet: 1,
				Jet: 1,
				TURBOPROP: 2,
				turboprop: 2,
				Turboprop: 2,
				PISTON: 3,
				piston: 3,
				Piston: 3,
				HELICOPTER: 4,
				helicopter: 4,
				Helicopter: 4,
			};
			searchBody.airframetype =
				airframeTypeMap[searchParams.airframetype] ||
				parseInt(searchParams.airframetype.toString()) ||
				searchParams.airframetype;
		}

		if (searchParams.maketype) {
			// Map common values to JetNet enum integer values
			const makeTypeMap: Record<string, number> = {
				JET: 1,
				jet: 1,
				Jet: 1,
				TURBOPROP: 2,
				turboprop: 2,
				Turboprop: 2,
				PISTON: 3,
				piston: 3,
				Piston: 3,
				HELICOPTER: 4,
				helicopter: 4,
				Helicopter: 4,
			};
			searchBody.maketype =
				makeTypeMap[searchParams.maketype] ||
				parseInt(searchParams.maketype.toString()) ||
				searchParams.maketype;
		}

		// Handle year parameters
		if (searchParams.yearmfr) {
			searchBody.yearmfr = parseInt(searchParams.yearmfr.toString());
		}

		if (searchParams.yearFrom && searchParams.yearTo) {
			// For year range, use yearFrom as primary year
			searchBody.yearmfr = parseInt(searchParams.yearFrom.toString());
		}

		if (searchParams.year) {
			searchBody.yearmfr = parseInt(searchParams.year.toString());
		}

		// Handle manufacturer/make parameters
		if (searchParams.makelist) {
			if (Array.isArray(searchParams.makelist)) {
				searchBody.makelist = searchParams.makelist;
			} else if (typeof searchParams.makelist === 'string') {
				searchBody.makelist = searchParams.makelist.split(',').map((s: string) => s.trim());
			}
		} else if (searchParams.make || searchParams.manufacturer) {
			const makeValue = searchParams.make || searchParams.manufacturer;
			if (Array.isArray(makeValue)) {
				searchBody.makelist = makeValue;
			} else if (typeof makeValue === 'string') {
				searchBody.makelist = makeValue.split(',').map((s: string) => s.trim());
			}
		}

		// Handle model parameters
		if (searchParams.model) {
			searchBody.model = searchParams.model;
		}

		// Handle specific aircraft identification
		if (searchParams.registration || searchParams.regnumber) {
			searchBody.registration = searchParams.registration || searchParams.regnumber;
		}

		if (searchParams.serialNumber || searchParams.serialnumber) {
			searchBody.serialNumber = searchParams.serialNumber || searchParams.serialnumber;
		}

		// Handle price parameters
		if (searchParams.priceFrom) {
			searchBody.priceFrom = parseFloat(searchParams.priceFrom.toString());
		}

		if (searchParams.priceTo) {
			searchBody.priceTo = parseFloat(searchParams.priceTo.toString());
		}

		// Handle additional filters
		if (searchParams.location) {
			searchBody.location = searchParams.location;
		}

		if (searchParams.basecity) {
			searchBody.basecity = searchParams.basecity;
		}

		// Remove undefined/null values to avoid API issues
		Object.keys(searchBody).forEach(key => {
			if (searchBody[key] === undefined || searchBody[key] === null || searchBody[key] === '') {
				delete searchBody[key];
			}
		});

		console.log('JetNet bulk export request:', {
			url: jetnetAircraftUrl,
			body: searchBody,
			bodySize: JSON.stringify(searchBody).length,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${authData.bearerToken}`,
				Accept: 'application/json',
			},
		});

		const bulkResponse = await fetch(jetnetAircraftUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${authData.bearerToken}`,
				Accept: 'application/json',
			},
			body: JSON.stringify(searchBody),
		});

		if (!bulkResponse.ok) {
			const errorText = await bulkResponse.text();
			console.error('JetNet bulk export failed:', {
				status: bulkResponse.status,
				statusText: bulkResponse.statusText,
				errorText,
				requestBody: searchBody,
			});
			throw new Error(
				`JetNet bulk export failed: ${bulkResponse.status} ${bulkResponse.statusText} - ${errorText}`
			);
		}

		const aircraftResult = await bulkResponse.json();
		console.log(`JetNet ${useBulkEndpoint ? 'bulk export' : 'getAircraftList'} result:`, {
			responsestatus: aircraftResult.responsestatus,
			count: aircraftResult.count || aircraftResult.aircraftcount,
			dataType: Array.isArray(aircraftResult) ? 'array' : typeof aircraftResult,
			hasAircraft: aircraftResult.aircraft ? 'yes' : 'no',
			hasData: aircraftResult.data ? 'yes' : 'no',
			responseKeys: Object.keys(aircraftResult),
		});

		// Transform the JetNet response to our standardized format
		let aircraftData = [];

		if (useBulkEndpoint) {
			// Handle getBulkAircraftExport response format
			if (Array.isArray(aircraftResult)) {
				aircraftData = aircraftResult;
			} else if (aircraftResult.aircraft && Array.isArray(aircraftResult.aircraft)) {
				aircraftData = aircraftResult.aircraft;
			} else if (aircraftResult.data && Array.isArray(aircraftResult.data)) {
				aircraftData = aircraftResult.data;
			} else {
				console.warn('Unexpected bulk export response format:', aircraftResult);
				aircraftData = [];
			}
		} else {
			// Handle getAircraftList response format
			if (aircraftResult.aircraft && Array.isArray(aircraftResult.aircraft)) {
				aircraftData = aircraftResult.aircraft;
			} else {
				console.warn('Unexpected getAircraftList response format:', aircraftResult);
				aircraftData = [];
			}
		}

		// Transform and sync to database
		const transformedData = aircraftData.map(
			(aircraft: Record<string, unknown>, index: number) => ({
				id: `jetnet-${aircraft.aircraftid || Date.now()}-${index}`,
				// Map JetNet field names to standardized format (handles both endpoints)
				make: aircraft.make || 'Unknown',
				model: aircraft.model || 'Unknown',
				year: aircraft.yearmfr || aircraft.yeardlv || aircraft.yeardelivered || '',
				serialNumber: aircraft.sernbr || '',
				registration: aircraft.regnbr || '',
				totalTime: aircraft.aftt || aircraft.achours || '',
				location: aircraft.basecity || aircraft.acbasecity || aircraft.acbasename || '',
				price: aircraft.askingprice || aircraft.asking || '',
				forsale: aircraft.forsale || '',
				marketStatus: aircraft.marketstatus || aircraft.status || '',
				exclusive: aircraft.exclusive || '',
				leased: aircraft.leased || '',
				listDate: aircraft.listdate || '',
				baseState: aircraft.basestate || '',
				baseCountry: aircraft.basecountry || '',
				baseAirportId: aircraft.baseairportid || '',
				baseIcaoCode: aircraft.baseicaocode || '',
				estAftt: aircraft.estaftt || '',
				engineSn1: aircraft.enginesn1 || '',
				engineSn2: aircraft.enginesn2 || '',
				avionics: aircraft.acavionics || '',
				passengers: aircraft.acpassengers || '',
				photos: aircraft.acphotos || '',
				notes: aircraft.acnotes || '',
				// Include all original fields for flexibility
				rawData: aircraft,
				processedAt: new Date().toISOString(),
				dataSource: 'JetNet-BulkExport',
				currency: 'USD',
				priceFormatted: aircraft.priceFormatted || '',
				totalTimeFormatted: aircraft.totalTimeFormatted || '',
				listDateFormatted: aircraft.listDateFormatted || '',
				statusBadge: aircraft.statusBadge || '',
				dataQuality: aircraft.dataQuality || '',
				sourceType: aircraft.sourceType || '',
				...aircraft,
			})
		);

		// Sync to database
		console.log(`🔄 Syncing ${transformedData.length} aircraft records to database...`);
		let createdCount = 0;
		let updatedCount = 0;

		try {
			const { PrismaClient } = await import('@prisma/client');
			const prisma = new PrismaClient();

			for (const aircraft of transformedData) {
				try {
					// Try to find existing aircraft by JetNet ID or registration
					const existingAircraft = await prisma.aircraft.findFirst({
						where: {
							OR: [
								{
									aircraftId: aircraft.aircraftid
										? parseInt(aircraft.aircraftid.toString())
										: undefined,
								},
								{ registration: aircraft.registration?.toString() },
								{ serialNumber: aircraft.serialNumber?.toString() },
							],
						},
					});

					const aircraftData = {
						aircraftId: aircraft.aircraftid ? parseInt(aircraft.aircraftid.toString()) : null,
						manufacturer: aircraft.make?.toString() || 'Unknown',
						model: aircraft.model?.toString() || 'Unknown',
						year: aircraft.year ? parseInt(aircraft.year.toString()) : null,
						yearManufactured: aircraft.yearmfr ? parseInt(aircraft.yearmfr.toString()) : null,
						price: aircraft.price ? parseFloat(aircraft.price.toString()) : null,
						askingPrice: aircraft.askingprice ? parseFloat(aircraft.askingprice.toString()) : null,
						location: aircraft.location?.toString(),
						registration: aircraft.registration?.toString(),
						serialNumber: aircraft.serialNumber?.toString(),
						forSale:
							aircraft.forsale === 'Y' || aircraft.forsale === 'True' || aircraft.forsale === true,
						totalTimeHours: aircraft.totalTime ? parseFloat(aircraft.totalTime.toString()) : null,
						dateListed: aircraft.listdate ? new Date(aircraft.listdate.toString()) : null,
						status: aircraft.forsale === 'Y' || aircraft.forsale === 'True' ? 'AVAILABLE' : 'SOLD',
						description: aircraft.notes?.toString(),
						// Store comprehensive raw data as JSON
						specifications: JSON.stringify({
							avionics: aircraft.avionics,
							passengers: aircraft.passengers,
							engineSn1: aircraft.engineSn1,
							engineSn2: aircraft.engineSn2,
							estAftt: aircraft.estAftt,
							baseState: aircraft.baseState,
							baseCountry: aircraft.baseCountry,
							baseAirportId: aircraft.baseAirportId,
							baseIcaoCode: aircraft.baseIcaoCode,
							exclusive: aircraft.exclusive,
							leased: aircraft.leased,
							marketStatus: aircraft.marketStatus,
						}),
						// Store all raw JetNet data
						marketData: JSON.stringify(aircraft),
						lastUpdated: new Date(),
					};

					if (existingAircraft) {
						await prisma.aircraft.update({
							where: { id: existingAircraft.id },
							data: aircraftData as Prisma.AircraftUpdateInput,
						});
						updatedCount++;
					} else {
						await prisma.aircraft.create({
							data: aircraftData as Prisma.AircraftCreateInput &
								Prisma.AircraftUncheckedCreateInput,
						});
						createdCount++;
					}
				} catch (error) {
					console.error(
						`Error syncing aircraft ${aircraft.registration || aircraft.serialNumber}:`,
						error
					);
				}
			}

			// Log sync results
			await prisma.syncLog.create({
				data: {
					syncType: 'aircraft',
					status: 'SUCCESS',
					recordsProcessed: transformedData.length,
					recordsCreated: createdCount,
					recordsUpdated: updatedCount,
					completedAt: new Date(),
				},
			});

			console.log(`✅ Database sync complete: ${createdCount} created, ${updatedCount} updated`);
			await prisma.$disconnect();
		} catch (error) {
			console.error('❌ Database sync failed:', error);
		}

		return NextResponse.json({
			success: true,
			data: transformedData,
			total: transformedData.length,
			responsestatus: aircraftResult.responsestatus,
			aircraftcount: aircraftResult.aircraftcount,
			timestamp: new Date().toISOString(),
			databaseSync: {
				enabled: true,
				recordsProcessed: transformedData.length,
				createdCount: createdCount || 0,
				updatedCount: updatedCount || 0,
			},
			metadata: {
				source: 'JetNet API',
				endpoint: useBulkEndpoint
					? '/api/Aircraft/getBulkAircraftExport'
					: '/api/Aircraft/getAircraftList',
				searchParams,
				filtersApplied: Object.keys(searchBody),
				requestBody: searchBody,
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error('JetNet aircraft search error:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

// GET endpoint for simple queries
export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);

	// Convert URL search params to the format expected by POST
	const params: Record<string, unknown> = {};

	searchParams.forEach((value, key) => {
		// Handle array parameters
		if (key === 'basestate' || key === 'basecountrylist' || key === 'makelist') {
			params[key] = value.split(',');
		} else {
			params[key] = value;
		}
	});

	return POST(request);
}
