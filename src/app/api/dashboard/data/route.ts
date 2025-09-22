import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
	return NextResponse.json({
		success: true,
		message: 'Dashboard data API endpoint',
		data: {
			totalAircraft: 0,
			totalValue: 0,
			avgPrice: 0,
			recentActivity: [],
		},
	});
}
