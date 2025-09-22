// Enhanced Dynamic Data Service for ACE Aircraft Intelligence Platform
// This service handles all data operations with real API integration

import { prisma } from '@/lib/database';
import { jetNetClient } from '@/lib/jetnet-client';
import { ghlClient } from '@/lib/ghl-client';
import { Aircraft } from '@/types';

export interface Contact {
	id: string;
	name: string;
	email: string;
	phone: string;
	company: string;
	position: string;
	location: string;
	status: 'lead' | 'prospect' | 'customer' | 'inactive';
	notes: string;
	tags: string[];
	lastContact: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface Opportunity {
	id: string;
	title: string;
	description: string;
	value: number;
	stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
	probability: number;
	closeDate: Date;
	contactId: string;
	contact?: Contact;
	createdAt: Date;
	updatedAt: Date;
}

export interface DashboardStats {
	totalAircraft: number;
	totalContacts: number;
	totalOpportunities: number;
	totalRevenue: number;
	monthlyGrowth: number;
	conversionRate: number;
	avgDealSize: number;
	activeListings: number;
}

export interface RecentActivity {
	id: string;
	type: 'aircraft_viewed' | 'contact_added' | 'opportunity_created' | 'deal_closed';
	title: string;
	description: string;
	timestamp: Date;
	userId: string;
	metadata?: Record<string, unknown>;
}

export interface MarketTrend {
	period: string;
	aircraftCount: number;
	avgPrice: number;
	transactions: number;
	marketValue: number;
}

class EnhancedDataService {
	// Aircraft Operations with JetNet Integration
	async getAircraft(filters?: {
		search?: string;
		manufacturer?: string;
		status?: string;
		priceRange?: [number, number];
		yearRange?: [number, number];
		sortBy?: string;
		sortOrder?: 'asc' | 'desc';
		page?: number;
		limit?: number;
	}) {
		try {
			// First try to get from JetNet API
			const jetNetData = await jetNetClient.searchAircraft({
				query: filters?.search || '',
				filters: {
					marketStatus: filters?.status || 'For Sale',
					manufacturer: filters?.manufacturer,
					priceMin: filters?.priceRange?.[0],
					priceMax: filters?.priceRange?.[1],
					yearMin: filters?.yearRange?.[0],
					yearMax: filters?.yearRange?.[1],
				},
				sort: {
					field: filters?.sortBy || 'listdate',
					direction: filters?.sortOrder || 'desc',
				},
				page: filters?.page || 1,
				limit: filters?.limit || 20,
			});

			// Transform JetNet data to our Aircraft interface
			const aircraft: Aircraft[] =
				jetNetData.data?.map((plane: any) => ({
					id: plane.id || plane.registration || `jetnet-${Date.now()}-${Math.random()}`,
					registration: plane.registration || '',
					serialNumber: plane.serialNumber || '',
					make: plane.manufacturer || 'Unknown',
					model: plane.model || 'Unknown',
					category: plane.category || 'business',
					year: plane.year || new Date().getFullYear(),
					askingPrice: plane.price || plane.askingPrice || 0,
					currency: plane.currency || 'USD',
					location: plane.location || plane.base || 'Unknown',
					status: this.mapJetNetStatus(plane.marketStatus),
					image: plane.images?.[0]?.url || '/images/aircraft-placeholder.jpg',
					views: plane.views || Math.floor(Math.random() * 1000),
					likes: plane.likes || Math.floor(Math.random() * 100),
					description: plane.description || `${plane.manufacturer} ${plane.model} aircraft`,
					specifications: JSON.stringify({
						seats: plane.seats || plane.passengerCapacity || 4,
						range: plane.range || plane.maxRange || 1000,
						cruiseSpeed: plane.cruiseSpeed || plane.maxSpeed || 200,
						maxAltitude: plane.maxAltitude || plane.serviceCeiling || 25000,
						fuelCapacity: plane.fuelCapacity || plane.maxFuel || 100,
					}),
					features: JSON.stringify(plane.features || ['GPS', 'Autopilot', 'Weather Radar']),
					contactInfo: JSON.stringify({
						name: plane.contactName || 'Sales Team',
						phone: plane.contactPhone || '+1-800-AIRCRAFT',
						email: plane.contactEmail || 'sales@aceaircraft.com',
					}),
					marketData: JSON.stringify(plane.marketData || {}),
					maintenanceData: JSON.stringify(plane.maintenanceData || {}),
					ownershipData: JSON.stringify(plane.ownershipData || {}),
					lastUpdated: new Date(plane.updatedAt || Date.now()),
					createdAt: new Date(plane.createdAt || Date.now()),
					updatedAt: new Date(),
				})) || [];

			// If no JetNet data, fall back to database
			if (aircraft.length === 0) {
				const dbAircraft = await prisma.aircraft.findMany({
					where: this.buildAircraftWhereClause(filters),
					orderBy: this.buildAircraftOrderBy(filters),
					skip: ((filters?.page || 1) - 1) * (filters?.limit || 20),
					take: filters?.limit || 20,
				});

				return dbAircraft.map(this.mapDbAircraftToInterface);
			}

			return aircraft;
		} catch (error) {
			console.error('Error fetching aircraft:', error);
			// Fallback to database on error
			const dbAircraft = await prisma.aircraft.findMany({
				where: this.buildAircraftWhereClause(filters),
				orderBy: this.buildAircraftOrderBy(filters),
				skip: ((filters?.page || 1) - 1) * (filters?.limit || 20),
				take: filters?.limit || 20,
			});

			return dbAircraft.map(this.mapDbAircraftToInterface);
		}
	}

	// Contact Operations with GHL Integration
	async getContacts(filters?: {
		search?: string;
		status?: string;
		tags?: string[];
		page?: number;
		limit?: number;
	}) {
		try {
			// Try to get from GHL API first
			const ghlContacts = await ghlClient.getContacts({
				search: filters?.search,
				limit: filters?.limit || 20,
				page: filters?.page || 1,
			});

			// Transform GHL data to our Contact interface
			const contacts: Contact[] =
				ghlContacts.data?.contacts?.map((contact: any) => ({
					id: contact.id,
					name: contact.name || `${contact.firstName} ${contact.lastName}`,
					email: contact.email || '',
					phone: contact.phone || '',
					company: contact.companyName || '',
					position: contact.position || '',
					location: contact.city ? `${contact.city}, ${contact.state}` : '',
					status: this.mapGHLStatus(contact.status),
					notes: contact.notes || '',
					tags: contact.tags || [],
					lastContact: new Date(contact.lastContactedAt || contact.createdAt),
					createdAt: new Date(contact.createdAt),
					updatedAt: new Date(contact.updatedAt),
				})) || [];

			// If no GHL data, fall back to database
			if (contacts.length === 0) {
				const dbContacts = await prisma.contact.findMany({
					where: this.buildContactWhereClause(filters),
					orderBy: { createdAt: 'desc' },
					skip: ((filters?.page || 1) - 1) * (filters?.limit || 20),
					take: filters?.limit || 20,
				});

				return dbContacts.map(this.mapDbContactToInterface);
			}

			return contacts;
		} catch (error) {
			console.error('Error fetching contacts:', error);
			// Fallback to database
			const dbContacts = await prisma.contact.findMany({
				where: this.buildContactWhereClause(filters),
				orderBy: { createdAt: 'desc' },
				skip: ((filters?.page || 1) - 1) * (filters?.limit || 20),
				take: filters?.limit || 20,
			});

			return dbContacts.map(this.mapDbContactToInterface);
		}
	}

	// Opportunity Operations
	async getOpportunities(filters?: {
		search?: string;
		stage?: string;
		contactId?: string;
		page?: number;
		limit?: number;
	}) {
		try {
			const dbOpportunities = await prisma.opportunity.findMany({
				where: this.buildOpportunityWhereClause(filters),
				include: {
					contact: true,
				},
				orderBy: { createdAt: 'desc' },
				skip: ((filters?.page || 1) - 1) * (filters?.limit || 20),
				take: filters?.limit || 20,
			});

			return dbOpportunities.map(this.mapDbOpportunityToInterface);
		} catch (error) {
			console.error('Error fetching opportunities:', error);
			return [];
		}
	}
	async getDashboardStats(): Promise<DashboardStats> {
		try {
			// Get aircraft stats from JetNet
			const aircraftStats = await jetNetClient.getMarketStats();

			// Get contact stats from GHL
			const contactStats = await ghlClient.getContactStats();

			// Get opportunity stats from database
			const opportunityStats = await prisma.opportunity.aggregate({
				_count: { id: true },
				_sum: { value: true },
				_avg: { value: true },
			});

			return {
				totalAircraft: aircraftStats.totalAircraft || 0,
				totalContacts: contactStats.data?.total || 0,
				totalOpportunities: opportunityStats._count.id || 0,
				totalRevenue: Number(opportunityStats._sum.value || 0),
				monthlyGrowth: aircraftStats.monthlyGrowth || 0,
				conversionRate:
					contactStats.data?.total > 0
						? (opportunityStats._count.id / contactStats.data.total) * 100
						: 0,
				avgDealSize: Number(opportunityStats._avg.value || 0),
				activeListings: aircraftStats.activeListings || 0,
			};
		} catch (error) {
			console.error('Error fetching dashboard stats:', error);
			// Return default stats on error
			return {
				totalAircraft: 0,
				totalContacts: 0,
				totalOpportunities: 0,
				totalRevenue: 0,
				monthlyGrowth: 0,
				conversionRate: 0,
				avgDealSize: 0,
				activeListings: 0,
			};
		}
	}

	// Recent Activity
	async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
		try {
			const activities = await prisma.activity.findMany({
				orderBy: { createdAt: 'desc' },
				take: limit,
			});

			return activities.map(activity => ({
				id: activity.id,
				type: activity.type as any,
				title: activity.title,
				description: activity.description || '',
				timestamp: activity.createdAt,
				userId: 'system',
				metadata: activity.metadata as Record<string, unknown>,
			}));
		} catch (error) {
			console.error('Error fetching recent activity:', error);
			return [];
		}
	}

	// Market Trends
	async getMarketTrends(period: string = '30d'): Promise<MarketTrend[]> {
		try {
			const trends = await jetNetClient.getMarketTrends(period);
			return trends.map((trend: any) => ({
				period: trend.period,
				aircraftCount: trend.aircraftCount,
				avgPrice: trend.avgPrice,
				transactions: trend.transactions,
				marketValue: trend.marketValue,
			}));
		} catch (error) {
			console.error('Error fetching market trends:', error);
			return [];
		}
	}

	// Helper Methods
	private mapJetNetStatus(status: string): 'available' | 'pending' | 'sold' | 'maintenance' {
		switch (status?.toLowerCase()) {
			case 'for sale':
			case 'available':
				return 'available';
			case 'pending':
			case 'under contract':
				return 'pending';
			case 'sold':
			case 'sale pending':
				return 'sold';
			case 'maintenance':
			case 'in maintenance':
				return 'maintenance';
			default:
				return 'available';
		}
	}

	private mapGHLStatus(status: string): 'lead' | 'prospect' | 'customer' | 'inactive' {
		switch (status?.toLowerCase()) {
			case 'lead':
				return 'lead';
			case 'prospect':
				return 'prospect';
			case 'customer':
			case 'client':
				return 'customer';
			case 'inactive':
			case 'unsubscribed':
				return 'inactive';
			default:
				return 'lead';
		}
	}

	private buildAircraftWhereClause(filters?: any) {
		const where: any = {};

		if (filters?.search) {
			where.OR = [
				{ name: { contains: filters.search, mode: 'insensitive' } },
				{ manufacturer: { contains: filters.search, mode: 'insensitive' } },
				{ model: { contains: filters.search, mode: 'insensitive' } },
				{ location: { contains: filters.search, mode: 'insensitive' } },
			];
		}

		if (filters?.manufacturer) {
			where.manufacturer = filters.manufacturer;
		}

		if (filters?.status) {
			where.status = filters.status;
		}

		if (filters?.priceRange) {
			where.price = {
				gte: filters.priceRange[0],
				lte: filters.priceRange[1],
			};
		}

		if (filters?.yearRange) {
			where.year = {
				gte: filters.yearRange[0],
				lte: filters.yearRange[1],
			};
		}

		return where;
	}

	private buildContactWhereClause(filters?: any) {
		const where: any = {}; // fix this

		if (filters?.search) {
			where.OR = [
				{ name: { contains: filters.search, mode: 'insensitive' } },
				{ email: { contains: filters.search, mode: 'insensitive' } },
				{ company: { contains: filters.search, mode: 'insensitive' } },
			];
		}

		if (filters?.status) {
			where.status = filters.status;
		}

		if (filters?.tags && filters.tags.length > 0) {
			where.tags = {
				hasSome: filters.tags,
			};
		}

		return where;
	}

	private buildAircraftOrderBy(filters?: any) {
		const sortBy = filters?.sortBy || 'createdAt';
		const sortOrder = filters?.sortOrder || 'desc';

		return { [sortBy]: sortOrder };
	}

	private mapDbAircraftToInterface(dbAircraft: any): Aircraft {
		return {
			id: dbAircraft.id,
			registration: dbAircraft.registration || '',
			serialNumber: dbAircraft.serialNumber || '',
			make: dbAircraft.make || dbAircraft.manufacturer || 'Unknown',
			model: dbAircraft.model || 'Unknown',
			category: dbAircraft.category || 'business',
			year: dbAircraft.year || new Date().getFullYear(),
			askingPrice: dbAircraft.askingPrice || dbAircraft.price || 0,
			currency: dbAircraft.currency || 'USD',
			location: dbAircraft.location || 'Unknown',
			status: dbAircraft.status || 'available',
			image: dbAircraft.image || '/images/aircraft-placeholder.jpg',
			views: dbAircraft.views || 0,
			likes: dbAircraft.likes || 0,
			description: dbAircraft.description || '',
			specifications:
				dbAircraft.specifications ||
				JSON.stringify({
					seats: 4, // needs to be dynamic
					range: 1000, // needs to be dynamic
					cruiseSpeed: 200, // needs to be dynamic
					maxAltitude: 25000, // needs to be dynamic
					fuelCapacity: 100, // needs to be dynamic
				}),
			features: dbAircraft.features || JSON.stringify([]),
			contactInfo:
				dbAircraft.contactInfo ||
				JSON.stringify({
					name: 'Sales Team', // needs to be dynamic
					phone: '+1-800-AIRCRAFT', // needs to be dynamic
					email: 'sales@aceaircraft.com', // needs to be dynamic
				}),
			lastUpdated: dbAircraft.updatedAt,
			createdAt: dbAircraft.createdAt,
			updatedAt: dbAircraft.updatedAt,
		};
	}

	private buildOpportunityWhereClause(filters?: any) {
		const where: any = {}; // fix this

		if (filters?.search) {
			where.OR = [
				{ title: { contains: filters.search, mode: 'insensitive' } },
				{ description: { contains: filters.search, mode: 'insensitive' } },
			];
		}

		if (filters?.stage) {
			where.stage = filters.stage; // fix this
		}

		if (filters?.contactId) {
			where.contactId = filters.contactId; // fix this
		}

		return where;
	}

	private mapDbOpportunityToInterface(dbOpportunity: any): Opportunity {
		return {
			id: dbOpportunity.id,
			title: dbOpportunity.title,
			description: dbOpportunity.description,
			value: dbOpportunity.value,
			stage: dbOpportunity.stage,
			probability: dbOpportunity.probability,
			closeDate: dbOpportunity.closeDate,
			contactId: dbOpportunity.contactId,
			contact: dbOpportunity.contact
				? this.mapDbContactToInterface(dbOpportunity.contact)
				: undefined,
			createdAt: dbOpportunity.createdAt,
			updatedAt: dbOpportunity.updatedAt,
		};
	}

	private mapDbContactToInterface(dbContact: any): Contact {
		return {
			id: dbContact.id,
			name: dbContact.name,
			email: dbContact.email,
			phone: dbContact.phone,
			company: dbContact.company,
			position: dbContact.position,
			location: dbContact.location,
			status: dbContact.status,
			notes: dbContact.notes,
			tags: dbContact.tags,
			lastContact: dbContact.lastContact,
			createdAt: dbContact.createdAt,
			updatedAt: dbContact.updatedAt,
		};
	}
}

export const enhancedDataService = new EnhancedDataService();
