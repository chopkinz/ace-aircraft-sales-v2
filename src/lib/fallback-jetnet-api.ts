/**
 * Fallback JetNet API Client
 * Provides error handling when JetNet API is unavailable
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
	constructor() {
		// No mock data generation - only real JetNet API calls
	}

	private generateMockData(): void {
		const makes: string[] = [
			'GULFSTREAM',
			'CESSNA',
			'BOMBARDIER',
			'DASSAULT',
			'EMBRAER',
			'LEARJET',
			'HAWKER',
			'PILATUS',
		];
		const models: Record<string, string[]> = {
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
		console.log('❌ JetNet API unavailable - no fallback data available');

		// Return empty response when JetNet API is unavailable
		return {
			success: false,
			error: 'JetNet API is currently unavailable. Please try again later.',
			data: [],
			total: 0,
			page: 1,
			limit: 0,
		};
	}

	async getAircraftMakes(): Promise<string[]> {
		console.log('❌ JetNet API unavailable - no aircraft makes available');
		return [];
	}

	async getAircraftModels(make?: string): Promise<string[]> {
		console.log('❌ JetNet API unavailable - no aircraft models available');
		return [];
	}

	async getStates(country?: string): Promise<string[]> {
		console.log('❌ JetNet API unavailable - no states available');
		return [];
	}

	async getCountries(): Promise<string[]> {
		console.log('❌ JetNet API unavailable - no countries available');
		return [];
	}
}
