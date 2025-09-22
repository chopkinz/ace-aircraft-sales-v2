import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { log } from '@/lib/logging/logger';

export async function POST(request: NextRequest) {
	try {
		log.info('Seeding test aircraft data');

		const sampleAircraft = [
			{
				aircraftId: 'TEST001',
				manufacturer: 'Cessna',
				model: 'Citation Mustang',
				year: 2015,
				yearManufactured: 2015,
				price: 2500000,
				askingPrice: 2500000,
				currency: 'USD',
				location: 'Van Nuys, CA',
				status: 'AVAILABLE',
				forSale: true,
				registration: 'N123CE',
				serialNumber: 'CE-001',
				totalTimeHours: 1250.5,
				dateListed: new Date(),
				lastUpdated: new Date(),
			},
			{
				aircraftId: 'TEST002',
				manufacturer: 'Bombardier',
				model: 'Challenger 350',
				year: 2018,
				yearManufactured: 2018,
				price: 18500000,
				askingPrice: 18500000,
				currency: 'USD',
				location: 'Teterboro, NJ',
				status: 'AVAILABLE',
				forSale: true,
				registration: 'N456BD',
				serialNumber: 'BD-002',
				totalTimeHours: 890.2,
				dateListed: new Date(),
				lastUpdated: new Date(),
			},
			{
				aircraftId: 'TEST003',
				manufacturer: 'Gulfstream',
				model: 'G650ER',
				year: 2020,
				yearManufactured: 2020,
				price: 65000000,
				askingPrice: 65000000,
				currency: 'USD',
				location: 'Dallas, TX',
				status: 'AVAILABLE',
				forSale: true,
				registration: 'N789GS',
				serialNumber: 'GS-003',
				totalTimeHours: 456.8,
				dateListed: new Date(),
				lastUpdated: new Date(),
			},
			{
				aircraftId: 'TEST004',
				manufacturer: 'Embraer',
				model: 'Phenom 300',
				year: 2019,
				yearManufactured: 2019,
				price: 12000000,
				askingPrice: 12000000,
				currency: 'USD',
				location: 'Miami, FL',
				status: 'SOLD',
				forSale: false,
				registration: 'N321EM',
				serialNumber: 'EM-004',
				totalTimeHours: 2100.3,
				dateListed: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
				lastUpdated: new Date(),
			},
			{
				aircraftId: 'TEST005',
				manufacturer: 'Cessna',
				model: 'Citation CJ4',
				year: 2021,
				yearManufactured: 2021,
				price: 9800000,
				askingPrice: 9800000,
				currency: 'USD',
				location: 'Phoenix, AZ',
				status: 'AVAILABLE',
				forSale: true,
				registration: 'N654CJ',
				serialNumber: 'CJ-005',
				totalTimeHours: 320.7,
				dateListed: new Date(),
				lastUpdated: new Date(),
			},
		];

		let created = 0;
		let errors = 0;

		for (const aircraftData of sampleAircraft) {
			try {
				await prisma.aircraft.create({
					data: aircraftData,
				});
				created++;
			} catch (error) {
				log.error(`Error creating aircraft ${aircraftData.aircraftId}`, {}, error as Error);
				errors++;
			}
		}

		log.info('Test aircraft seeding completed', { created, errors });

		return NextResponse.json({
			success: true,
			message: 'Test aircraft data seeded successfully',
			data: {
				created,
				errors,
				totalProcessed: sampleAircraft.length,
			},
		});
	} catch (error) {
		log.error('Test aircraft seeding failed', {}, error as Error);
		return NextResponse.json(
			{
				error: 'Failed to seed test aircraft data',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}
