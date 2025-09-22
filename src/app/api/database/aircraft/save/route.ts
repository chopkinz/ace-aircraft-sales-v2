import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function POST(request: NextRequest) {
	try {
		const { aircraft } = await request.json();

		// Save aircraft to database - only use fields that exist in the schema
		const savedAircraft = await prisma.aircraft.create({
			data: {
				id: aircraft.id,
				aircraftId: aircraft.aircraftId,
				name: aircraft.name,
				manufacturer: aircraft.manufacturer,
				model: aircraft.model,
				variant: aircraft.variant,
				year: aircraft.year,
				yearManufactured: aircraft.yearManufactured,
				price: aircraft.price,
				askingPrice: aircraft.askingPrice,
				currency: aircraft.currency,
				location: aircraft.location,
				status: aircraft.status || 'AVAILABLE',
				image: aircraft.image,
				description: aircraft.description,
				specifications: aircraft.specifications
					? JSON.stringify(aircraft.specifications)
					: undefined,
				features: aircraft.features ? JSON.stringify(aircraft.features) : null,
				contactInfo: aircraft.contactInfo ? JSON.stringify(aircraft.contactInfo) : null,
				marketData: aircraft.marketData ? JSON.stringify(aircraft.marketData) : null,
				maintenanceData: aircraft.maintenanceData ? JSON.stringify(aircraft.maintenanceData) : null,
				ownershipData: aircraft.ownershipData ? JSON.stringify(aircraft.ownershipData) : null,
				registration: aircraft.registration,
				make: aircraft.make,
				serialNumber: aircraft.serialNumber,
				forSale: aircraft.forSale,
				totalTimeHours: aircraft.totalTimeHours,
				engineHours: aircraft.engineHours,
				dateListed: aircraft.dateListed ? new Date(aircraft.dateListed) : null,
			},
		});

		return NextResponse.json({
			success: true,
			data: savedAircraft,
		});
	} catch (error) {
		console.error('Error saving aircraft:', error);
		return NextResponse.json({ success: false, error: 'Failed to save aircraft' }, { status: 500 });
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const { id } = await request.json();

		await prisma.aircraft.delete({
			where: { id },
		});

		return NextResponse.json({
			success: true,
			message: 'Aircraft deleted successfully',
		});
	} catch (error) {
		console.error('Error deleting aircraft:', error);
		return NextResponse.json(
			{ success: false, error: 'Failed to delete aircraft' },
			{ status: 500 }
		);
	}
}
