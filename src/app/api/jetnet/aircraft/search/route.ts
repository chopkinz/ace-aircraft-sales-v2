import { NextRequest, NextResponse } from 'next/server';
import { ensureJetNetService } from '@/lib/jetnet-service';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { filters = {}, page = 1, limit = 50, sort } = body;

		console.log('🔍 Searching aircraft with params:', { filters, page, limit, sort });

		// Ensure JetNet service is initialized
		const jetnetService = await ensureJetNetService();

		// Convert filters to JetNet API format
		const searchParams = {
			forsale: filters.forsale || '', // Empty to get ALL aircraft regardless of sale status
			aircraftmake: filters.aircraftmake || '',
			aircraftmodel: filters.aircraftmodel || '',
			basecountry: filters.basecountry || 'United States',
			basestate: filters.basestate || '',
			yearmfr: filters.yearFrom || 0,
			yearTo: filters.yearTo || 0,
			pricelow: filters.pricelow || 0,
			pricehigh: filters.pricehigh || 0,
			limit: limit,
			offset: (page - 1) * limit,
		};

		console.log('📡 Making search request with params:', searchParams);

		// Search aircraft using JetNet API
		const response = await jetnetService.getAPIClient().searchAircraft(searchParams);

		if (!response.success) {
			console.error('❌ Aircraft search failed:', response.error);
			return NextResponse.json(
				{
					success: false,
					error: {
						code: 'JETNET_SEARCH_FAILED',
						message: response.error || 'Aircraft search failed',
					},
					metadata: {
						timestamp: new Date().toISOString(),
						source: 'JetNet API',
					},
				},
				{ status: 503 }
			);
		}

		console.log('✅ Aircraft search successful:', response.data?.length || 0, 'aircraft found');

		return NextResponse.json({
			success: true,
			data: response.data || [],
			pagination: response.pagination || {
				total: response.data?.length || 0,
				limit,
				offset: (page - 1) * limit,
			},
			metadata: {
				timestamp: new Date().toISOString(),
				source: 'JetNet API',
				count: response.data?.length || 0,
			},
		});
	} catch (error) {
		console.error('❌ JetNet API Error:', error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: 'JETNET_SEARCH_ERROR',
					message: error instanceof Error ? error.message : 'JetNet API unavailable',
				},
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'JetNet API',
				},
			},
			{ status: 500 }
		);
	}
}
