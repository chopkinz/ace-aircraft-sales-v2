import { ApiResponse } from '@/types';
import { PaginationInfo } from 'packages/types/src';

export interface GHLContact {
	id: string;
	firstName?: string;
	lastName?: string;
	fullName?: string;
	email?: string;
	phone?: string;
	tags?: string[];
	customFields?: Record<string, unknown>;
	source?: string;
	dateAdded?: string;
	lastActivity?: string;
	status?: 'active' | 'inactive' | 'lead' | 'customer';
	assignedTo?: string;
	companyName?: string;
	website?: string;
	leadValue?: number;
	aircraftInterest?: {
		make?: string;
		model?: string;
		type?: string;
		timeframe?: string;
		purpose?: string;
		priceRange?: [number, number];
	};
	address?: {
		line1?: string;
		city?: string;
		state?: string;
		postalCode?: string;
		country?: string;
	};
}

export interface GHLContactFilters {
	page?: number;
	limit?: number;
	status?: string;
	search?: string;
	tags?: string[];
}

export interface GHLContactStats {
	total: number;
	active: number;
	leads: number;
	customers: number;
	recentlyAdded: number;
	bySource: Record<string, number>;
	byTag: Record<string, number>;
}

export class GHLClient {
	private apiKey: string;
	private baseURL: string;
	private locationId: string;

	constructor(apiKey?: string, locationId?: string) {
		this.apiKey = apiKey || process.env.GHL_API_KEY || '';
		this.locationId = locationId || process.env.GHL_LOCATION_ID || '';
		this.baseURL = 'https://rest.gohighlevel.com/v1';
	}

	private async makeRequest<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<ApiResponse<T>> {
		if (!this.apiKey || !this.locationId) {
			throw new Error('GHL API credentials not configured');
		}

		try {
			const url = `${this.baseURL}${endpoint}`;
			const response = await fetch(url, {
				...options,
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json',
					...options.headers,
				},
			});

			if (!response.ok) {
				throw new Error(`GHL API Error: ${response.status} ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			console.error('GHL API Request failed:', error);
			throw error;
		}
	}

	async getContacts(
		options: {
			page?: number;
			limit?: number;
			status?: string;
			search?: string;
			tags?: string[];
		} = {}
	): Promise<ApiResponse<{ contacts: GHLContact[]; pagination: PaginationInfo }>> {
		try {
			// Build query parameters
			const queryParams = new URLSearchParams();
			if (options.page) queryParams.append('page', options.page.toString());
			if (options.limit) queryParams.append('limit', options.limit.toString());
			if (options.status) queryParams.append('status', options.status);
			if (options.search) queryParams.append('search', options.search);
			if (options.tags) queryParams.append('tags', options.tags.join(','));

			const endpoint = `/contacts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
			const response = await this.makeRequest(endpoint, {
				method: 'GET',
			});

			return {
				success: true,
				data: response.data as { contacts: GHLContact[]; pagination: PaginationInfo },
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'GoHighLevel API',
					requestId: `req_${Date.now()}`,
					duration: response.metadata?.duration || 0,
					version: '1.0.0',
				},
			};
		} catch (error) {
			console.error('GHL getContacts error:', error);
			return {
				success: false,
				error: {
					code: 'GHL_CONTACTS_ERROR',
					message: error instanceof Error ? error.message : 'Failed to fetch contacts',
				},
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'GoHighLevel API',
					requestId: `req_${Date.now()}`,
					duration: 0,
					version: '1.0.0',
				},
			};
		}
	}

	async getContactStats(dateRange?: {
		startDate: string;
		endDate: string;
	}): Promise<ApiResponse<GHLContactStats>> {
		try {
			// Build query parameters
			const queryParams = new URLSearchParams();
			if (dateRange) {
				queryParams.append('startDate', dateRange.startDate);
				queryParams.append('endDate', dateRange.endDate);
			}

			const endpoint = `/contacts/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
			const response = await this.makeRequest(endpoint, {
				method: 'GET',
			});

			return {
				success: true,
				data: response.data as GHLContactStats,
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'GoHighLevel API',
					requestId: `req_${Date.now()}`,
					duration: response.metadata?.duration || 0,
					version: '1.0.0',
				},
			};
		} catch (error) {
			console.error('GHL getContactStats error:', error);
			return {
				success: false,
				error: {
					code: 'GHL_STATS_ERROR',
					message: error instanceof Error ? error.message : 'Failed to fetch contact stats',
				},
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'GoHighLevel API',
					requestId: `req_${Date.now()}`,
					duration: 0,
					version: '1.0.0',
				},
			};
		}
	}

	async getPipelines(): Promise<ApiResponse<unknown[]>> {
		// eslint-disable-line @typescript-eslint/no-explicit-any
		try {
			const response = await this.makeRequest('/pipelines', {
				method: 'GET',
			});

			return {
				success: true,
				data: response.data as unknown[],
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'GoHighLevel API',
					requestId: `req_${Date.now()}`,
					duration: response.metadata?.duration || 0,
					version: '1.0.0',
				},
			};
		} catch (error) {
			console.error('GHL getPipelines error:', error);
			return {
				success: false,
				error: {
					code: 'GHL_PIPELINES_ERROR',
					message: error instanceof Error ? error.message : 'Failed to fetch pipelines',
				},
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'GoHighLevel API',
					requestId: `req_${Date.now()}`,
					duration: 0,
					version: '1.0.0',
				},
			};
		}
	}

	async getContact(contactId: string): Promise<ApiResponse<GHLContact>> {
		const endpoint = `/locations/${this.locationId}/contacts/${contactId}`;
		return this.makeRequest<GHLContact>(endpoint);
	}

	async createContact(contact: Partial<GHLContact>): Promise<ApiResponse<GHLContact>> {
		const endpoint = `/locations/${this.locationId}/contacts`;
		return this.makeRequest<GHLContact>(endpoint, {
			method: 'POST',
			body: JSON.stringify(contact),
		});
	}

	async updateContact(
		contactId: string,
		contact: Partial<GHLContact>
	): Promise<ApiResponse<GHLContact>> {
		const endpoint = `/locations/${this.locationId}/contacts/${contactId}`;
		return this.makeRequest<GHLContact>(endpoint, {
			method: 'PUT',
			body: JSON.stringify(contact),
		});
	}

	async deleteContact(contactId: string): Promise<ApiResponse<void>> {
		const endpoint = `/locations/${this.locationId}/contacts/${contactId}`;
		return this.makeRequest<void>(endpoint, {
			method: 'DELETE',
		});
	}

	// Health check method
	async getApiStatus(): Promise<ApiResponse<{ status: string; version: string }>> {
		try {
			if (!this.apiKey || !this.locationId) {
				return {
					success: false,
					data: undefined,
					error: {
						code: 'GHL_CREDENTIALS_MISSING',
						message: 'GHL API credentials not configured',
					},
					metadata: {
						timestamp: new Date().toISOString(),
						source: 'GHL Client',
						requestId: `error_${Date.now()}`,
						duration: 0,
						version: '1.0.0',
					},
				};
			}

			const endpoint = '/ping';
			return this.makeRequest<{ status: string; version: string }>(endpoint);
		} catch (error) {
			return {
				success: false,
				data: undefined,
				error: {
					code: 'GHL_API_ERROR',
					message: error instanceof Error ? error.message : 'Unknown error',
				},
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'GHL Client',
					requestId: `error_${Date.now()}`,
					duration: 0,
					version: '1.0.0',
				},
			};
		}
	}
}

// Export singleton instance
export const ghlClient = new GHLClient();
