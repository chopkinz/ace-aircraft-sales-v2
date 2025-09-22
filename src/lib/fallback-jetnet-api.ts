/**
 * Fallback JetNet API Client
 * Uses mock data when webhook authentication fails
 */

import { JetNetAPIResponse, SearchParams } from './jetnet-api-client';

export interface MockAircraft {
	aircraftId: string;
	registration: string;
	aircraftMake: string;
	aircraftModel: string;
	yearMfr: number;
	baseCountry: string;
	baseState: string;
	baseCity: string;
	price: number;
	currency: string;
	forSale: boolean;
	aircraftType: string;
	engineType: string;
	engineCount: number;
	seats: number;
	range: number;
	speed: number;
	imageUrl?: string;
	description?: string;
	lastUpdated: string;
}

export class FallbackJetNetAPIClient {
	private mockData: MockAircraft[] = [];

	constructor() {
		this.generateMockData();
	}

	private generateMockData(): void {
		const makes = [
			'GULFSTREAM',
			'CESSNA',
			'BOMBARDIER',
			'DASSAULT',
			'EMBRAER',
			'LEARJET',
			'HAWKER',
			'PILATUS',
		];
		const models = {
			GULFSTREAM: ['G650', 'G550', 'G450', 'G350', 'G280'],
			CESSNA: [
				'Citation X',
				'Citation CJ4',
				'Citation Latitude',
				'Citation M2',
				'Citation Mustang',
			],
			BOMBARDIER: ['Global 7500', 'Challenger 650', 'Challenger 350', 'Learjet 75'],
			DASSAULT: ['Falcon 8X', 'Falcon 7X', 'Falcon 2000', 'Falcon 900'],
			EMBRAER: ['Phenom 300', 'Legacy 500', 'Legacy 450', 'Phenom 100'],
			LEARJET: ['75', '60', '45', '40'],
			HAWKER: ['4000', '900XP', '800XP', '750'],
			PILATUS: ['PC-24', 'PC-12'],
		};

		const countries = [
			'United States',
			'Canada',
			'Mexico',
			'Brazil',
			'United Kingdom',
			'France',
			'Germany',
			'Switzerland',
		];
		const states = ['CA', 'TX', 'FL', 'NY', 'IL', 'GA', 'NV', 'CO', 'WA', 'AZ'];

		for (let i = 0; i < 1000; i++) {
			const make = makes[Math.floor(Math.random() * makes.length)];
			const model = models[make][Math.floor(Math.random() * models[make].length)];
			const year = 2010 + Math.floor(Math.random() * 14);
			const country = countries[Math.floor(Math.random() * countries.length)];
			const state = states[Math.floor(Math.random() * states.length)];

			this.mockData.push({
				aircraftId: `MOCK-${String(i + 1).padStart(4, '0')}`,
				registration: `N${String(Math.floor(Math.random() * 900000) + 100000)}`,
				aircraftMake: make,
				aircraftModel: model,
				yearMfr: year,
				baseCountry: country,
				baseState: state,
				baseCity: `City ${i + 1}`,
				price: Math.floor(Math.random() * 50000000) + 5000000, // $5M - $55M
				currency: 'USD',
				forSale: Math.random() > 0.3, // 70% for sale
				aircraftType: 'JET',
				engineType: 'TURBOFAN',
				engineCount: 2,
				seats: 8 + Math.floor(Math.random() * 12), // 8-20 seats
				range: 2000 + Math.floor(Math.random() * 4000), // 2000-6000 nm
				speed: 400 + Math.floor(Math.random() * 200), // 400-600 mph
				imageUrl: `https://via.placeholder.com/400x300/0066cc/ffffff?text=${make}+${model}`,
				description: `Beautiful ${year} ${make} ${model} in excellent condition. Well maintained with recent inspections.`,
				lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
			});
		}
	}

	async searchAircraft(params: SearchParams = {}): Promise<JetNetAPIResponse> {
		console.log('🔍 Using fallback mock data for aircraft search:', params);

		try {
			let filteredData = [...this.mockData];

			// Apply filters
			if (params.aircraftmake) {
				filteredData = filteredData.filter(aircraft =>
					aircraft.aircraftMake.toLowerCase().includes(params.aircraftmake.toLowerCase())
				);
			}

			if (params.aircraftmodel) {
				filteredData = filteredData.filter(aircraft =>
					aircraft.aircraftModel.toLowerCase().includes(params.aircraftmodel.toLowerCase())
				);
			}

			if (params.basecountry) {
				filteredData = filteredData.filter(aircraft =>
					aircraft.baseCountry.toLowerCase().includes(params.basecountry.toLowerCase())
				);
			}

			if (params.basestate) {
				filteredData = filteredData.filter(aircraft =>
					aircraft.baseState.toLowerCase().includes(params.basestate.toLowerCase())
				);
			}

			if (params.yearFrom) {
				filteredData = filteredData.filter(aircraft => aircraft.yearMfr >= params.yearFrom);
			}

			if (params.yearTo) {
				filteredData = filteredData.filter(aircraft => aircraft.yearMfr <= params.yearTo);
			}

			if (params.pricelow) {
				filteredData = filteredData.filter(aircraft => aircraft.price >= params.pricelow);
			}

			if (params.pricehigh) {
				filteredData = filteredData.filter(aircraft => aircraft.price <= params.pricehigh);
			}

			if (params.forsale !== undefined) {
				const forSale = params.forsale === 'true' || params.forsale === true;
				filteredData = filteredData.filter(aircraft => aircraft.forSale === forSale);
			}

			// Pagination
			const page = params.page || 1;
			const limit = params.limit || 20;
			const offset = (page - 1) * limit;

			const paginatedData = filteredData.slice(offset, offset + limit);

			return {
				success: true,
				data: paginatedData,
				pagination: {
					total: filteredData.length,
					limit,
					offset,
					hasMore: offset + limit < filteredData.length,
				},
			};
		} catch (error) {
			console.error('❌ Mock data search failed:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	async getAircraftMakes(): Promise<string[]> {
		const makes = [...new Set(this.mockData.map(aircraft => aircraft.aircraftMake))];
		return makes.sort();
	}

	async getAircraftModels(make?: string): Promise<string[]> {
		let models = this.mockData.map(aircraft => aircraft.aircraftModel);

		if (make) {
			models = this.mockData
				.filter(aircraft => aircraft.aircraftMake.toLowerCase() === make.toLowerCase())
				.map(aircraft => aircraft.aircraftModel);
		}

		const uniqueModels = [...new Set(models)];
		return uniqueModels.sort();
	}

	async getStates(country?: string): Promise<string[]> {
		let states = this.mockData.map(aircraft => aircraft.baseState);

		if (country) {
			states = this.mockData
				.filter(aircraft => aircraft.baseCountry.toLowerCase() === country.toLowerCase())
				.map(aircraft => aircraft.baseState);
		}

		const uniqueStates = [...new Set(states)];
		return uniqueStates.sort();
	}

	async getCountries(): Promise<string[]> {
		const countries = [...new Set(this.mockData.map(aircraft => aircraft.baseCountry))];
		return countries.sort();
	}
}
