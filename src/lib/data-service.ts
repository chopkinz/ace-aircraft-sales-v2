// Dynamic Data Service for ACE Aircraft Intelligence Platform
// This service handles all data operations with real API integration

import { prisma } from '@/lib/database';
import { jetNetClient } from '@/lib/jetnet-client';
import { ghlClient } from '@/lib/ghl-client';
import { ActivityType, AircraftStatus, ContactStatus } from '@prisma/client';

export interface Aircraft {
	id: string;
	name: string;
	manufacturer: string;
	model: string;
	year: number;
	price: number;
	location: string;
	status: 'available' | 'pending' | 'sold' | 'maintenance';
	image: string;
	views: number;
	likes: number;
	description: string;
	specifications: {
		seats: number;
		range: number;
		cruiseSpeed: number;
		maxAltitude: number;
		fuelCapacity: number;
	};
	features: string[];
	contactInfo: {
		name: string;
		phone: string;
		email: string;
	};
	lastUpdated: string;
	createdAt: Date;
	updatedAt: Date;
}

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
	stage: 'LEAD' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
	probability: number;
	expectedCloseDate: Date;
	contactId: string;
	aircraftId?: string;
	assignedTo: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface DashboardStats {
	totalAircraft: number;
	totalContacts: number;
	totalOpportunities: number;
	totalRevenue: number;
	monthlyGrowth: number;
	quarterlyGrowth: number;
	yearlyGrowth: number;
	conversionRate: number;
	averageDealSize: number;
	marketShare: number;
}

export interface RecentActivity {
	id: string;
	type: 'aircraft' | 'contact' | 'opportunity' | 'deal';
	title: string;
	description: string;
	timestamp: string;
	status: 'success' | 'warning' | 'error' | 'info';
	value?: number;
	userId: string;
	createdAt: Date;
}

export interface MarketTrend {
	period: string;
	value: number;
	change: number;
	trend: 'up' | 'down' | 'stable';
}

class DataService {
	// Aircraft Operations
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

			const orderBy: any = {}; // fix this
			if (filters?.sortBy) {
				orderBy[filters.sortBy] = filters.sortOrder || 'asc';
			} else {
				orderBy.createdAt = 'desc';
			}

			const skip = filters?.page ? (filters.page - 1) * (filters.limit || 10) : 0;
			const take = filters?.limit || 10;

			const [aircraft, total] = await Promise.all([
				prisma.aircraft.findMany({
					where,
					orderBy,
					skip,
					take,
				}),
				prisma.aircraft.count({ where }),
			]);

			return {
				data: aircraft,
				total,
				page: filters?.page || 1,
				limit: filters?.limit || 10,
				totalPages: Math.ceil(total / (filters?.limit || 10)),
			};
		} catch (error) {
			console.error('Error fetching aircraft:', error);
			throw new Error('Failed to fetch aircraft data');
		}
	}

	async getAircraftById(id: string) {
		try {
			const aircraft = await prisma.aircraft.findUnique({
				where: { id },
				include: {
					opportunities: true,
				},
			});

			if (!aircraft) {
				throw new Error('Aircraft not found');
			}

			// Note: views tracking removed as field doesn't exist in schema

			return aircraft;
		} catch (error) {
			console.error('Error fetching aircraft:', error);
			throw new Error('Failed to fetch aircraft details');
		}
	}

	async createAircraft(data: Omit<Aircraft, 'id' | 'createdAt' | 'updatedAt'>) {
		try {
			// Transform specifications object to JSON string if it exists
			const transformedData = {
				...data,
				specifications: data.specifications ? JSON.stringify(data.specifications) : null,
				features: data.features ? JSON.stringify(data.features) : null,
				contactInfo: data.contactInfo ? JSON.stringify(data.contactInfo) : null,
				marketData: data.marketData ? JSON.stringify(data.marketData) : null,
				maintenanceData: data.maintenanceData ? JSON.stringify(data.maintenanceData) : null,
				ownershipData: data.ownershipData ? JSON.stringify(data.ownershipData) : null,
				status: data.status as AircraftStatus,
				lastUpdated: new Date().toISOString(),
			};

			const aircraft = await prisma.aircraft.create({
				data: transformedData,
			});

			// Log activity
			await this.logActivity({
				type: 'aircraft',
				title: 'New Aircraft Added',
				description: `${data.name} added to inventory`,
				status: 'success',
				value: data.price,
			});

			return aircraft;
		} catch (error) {
			console.error('Error creating aircraft:', error);
			throw new Error('Failed to create aircraft');
		}
	}

	async updateAircraft(id: string, data: Partial<Aircraft>) {
		try {
			// Transform object fields to JSON strings if they exist
			const transformedData = {
				...data,
				specifications: data.specifications ? JSON.stringify(data.specifications) : undefined,
				features: data.features ? JSON.stringify(data.features) : undefined,
				contactInfo: data.contactInfo ? JSON.stringify(data.contactInfo) : undefined,
				marketData: data.marketData ? JSON.stringify(data.marketData) : undefined,
				maintenanceData: data.maintenanceData ? JSON.stringify(data.maintenanceData) : undefined,
				ownershipData: data.ownershipData ? JSON.stringify(data.ownershipData) : undefined,
				lastUpdated: new Date().toISOString(),
				updatedAt: new Date(),
				status: data.status as AircraftStatus,
			};

			const aircraft = await prisma.aircraft.update({
				where: { id },
				data: transformedData,
			});

			// Log activity
			await this.logActivity({
				type: 'aircraft',
				title: 'Aircraft Updated',
				description: `${aircraft.name} information updated`,
				status: 'info',
			});

			return aircraft;
		} catch (error) {
			console.error('Error updating aircraft:', error);
			throw new Error('Failed to update aircraft');
		}
	}

	async deleteAircraft(id: string) {
		try {
			const aircraft = await prisma.aircraft.delete({
				where: { id },
			});

			// Log activity
			await this.logActivity({
				type: 'aircraft',
				title: 'Aircraft Removed',
				description: `${aircraft.name} removed from inventory`,
				status: 'warning',
			});

			return aircraft;
		} catch (error) {
			console.error('Error deleting aircraft:', error);
			throw new Error('Failed to delete aircraft');
		}
	}

	// Contact Operations
	async getContacts(filters?: {
		search?: string;
		status?: string;
		company?: string;
		sortBy?: string;
		sortOrder?: 'asc' | 'desc';
		page?: number;
		limit?: number;
	}) {
		try {
			const where: any = {};

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

			if (filters?.company) {
				where.company = { contains: filters.company, mode: 'insensitive' };
			}

			const orderBy: any = {}; // fix this
			if (filters?.sortBy) {
				orderBy[filters.sortBy] = filters.sortOrder || 'asc';
			} else {
				orderBy.createdAt = 'desc';
			}

			const skip = filters?.page ? (filters.page - 1) * (filters.limit || 10) : 0;
			const take = filters?.limit || 10;

			const [contacts, total] = await Promise.all([
				prisma.contact.findMany({
					where,
					orderBy,
					skip,
					take,
					include: {
						opportunities: true,
					},
				}),
				prisma.contact.count({ where }),
			]);

			return {
				data: contacts,
				total,
				page: filters?.page || 1,
				limit: filters?.limit || 10,
				totalPages: Math.ceil(total / (filters?.limit || 10)),
			};
		} catch (error) {
			console.error('Error fetching contacts:', error);
			throw new Error('Failed to fetch contacts data');
		}
	}

	async getContactById(id: string) {
		try {
			const contact = await prisma.contact.findUnique({
				where: { id },
				include: {
					opportunities: {
						include: {
							aircraft: true,
						},
					},
					activities: true,
				},
			});

			if (!contact) {
				throw new Error('Contact not found');
			}

			return contact;
		} catch (error) {
			console.error('Error fetching contact:', error);
			throw new Error('Failed to fetch contact details');
		}
	}

	async createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) {
		try {
			const contact = await prisma.contact.create({
				data: {
					...data,
					contactId: Math.floor(Math.random() * 1000000), // Generate a unique contactId
					lastContact: new Date(),
					status: data.status as ContactStatus,
				},
			});

			// Log activity
			await this.logActivity({
				type: 'contact',
				title: 'New Contact Added',
				description: `${data.name} added to contacts`,
				status: 'success',
			});

			return contact;
		} catch (error) {
			console.error('Error creating contact:', error);
			throw new Error('Failed to create contact');
		}
	}

	async updateContact(id: string, data: Partial<Contact>) {
		try {
			const contact = await prisma.contact.update({
				where: { id },
				data: {
					...data,
					updatedAt: new Date(),
					status: data.status as ContactStatus,
				},
			});

			// Log activity
			await this.logActivity({
				type: 'contact',
				title: 'Contact Updated',
				description: `${contact.name} information updated`,
				status: 'info',
			});

			return contact;
		} catch (error) {
			console.error('Error updating contact:', error);
			throw new Error('Failed to update contact');
		}
	}

	// Opportunity Operations
	async getOpportunities(filters?: {
		search?: string;
		stage?: string;
		assignedTo?: string;
		sortBy?: string;
		sortOrder?: 'asc' | 'desc';
		page?: number;
		limit?: number;
	}) {
		try {
			const where: any = {};

			if (filters?.search) {
				where.OR = [
					{ title: { contains: filters.search, mode: 'insensitive' } },
					{ description: { contains: filters.search, mode: 'insensitive' } },
				];
			}

			if (filters?.stage) {
				where.stage = filters.stage;
			}

			if (filters?.assignedTo) {
				where.assignedTo = filters.assignedTo;
			}

			const orderBy: any = {}; // fix this
			if (filters?.sortBy) {
				orderBy[filters.sortBy] = filters.sortOrder || 'asc';
			} else {
				orderBy.createdAt = 'desc';
			}

			const skip = filters?.page ? (filters.page - 1) * (filters.limit || 10) : 0;
			const take = filters?.limit || 10;

			const [opportunities, total] = await Promise.all([
				prisma.opportunity.findMany({
					where,
					orderBy,
					skip,
					take,
					include: {
						contact: true,
						aircraft: true,
					},
				}),
				prisma.opportunity.count({ where }),
			]);

			return {
				data: opportunities,
				total,
				page: filters?.page || 1,
				limit: filters?.limit || 10,
				totalPages: Math.ceil(total / (filters?.limit || 10)),
			};
		} catch (error) {
			console.error('Error fetching opportunities:', error);
			throw new Error('Failed to fetch opportunities data');
		}
	}

	async createOpportunity(data: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'>) {
		try {
			// Transform stage values to match Prisma enum
			const transformedData = {
				...data,
				stage: data.stage?.toUpperCase() as any,
			};

			const opportunity = await prisma.opportunity.create({
				data: transformedData,
			});

			// Log activity
			await this.logActivity({
				type: 'opportunity',
				title: 'New Opportunity Created',
				description: `${data.title} opportunity created`,
				status: 'success',
				value: data.value,
			});

			return opportunity;
		} catch (error) {
			console.error('Error creating opportunity:', error);
			throw new Error('Failed to create opportunity');
		}
	}

	async updateOpportunity(id: string, data: Partial<Opportunity>) {
		try {
			const opportunity = await prisma.opportunity.update({
				where: { id },
				data: {
					...data,
					updatedAt: new Date(),
					stage: data.stage?.toUpperCase() as any,
				},
			});

			// Log activity
			await this.logActivity({
				type: 'opportunity',
				title: 'Opportunity Updated',
				description: `${opportunity.title} opportunity updated`,
				status: 'info',
				value: opportunity.value?.toNumber() || 0, // fix this
			});

			return opportunity;
		} catch (error) {
			console.error('Error updating opportunity:', error);
			throw new Error('Failed to update opportunity');
		}
	}

	// Dashboard Statistics
	async getDashboardStats(timeRange: string = '30d') {
		try {
			const now = new Date();
			let startDate: Date;

			switch (timeRange) {
				case '7d':
					startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					break;
				case '30d':
					startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
					break;
				case '90d':
					startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
					break;
				case '1y':
					startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
					break;
				default:
					startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			}

			const [
				totalAircraft,
				totalContacts,
				totalOpportunities,
				totalRevenue,
				monthlyGrowth,
				quarterlyGrowth,
				yearlyGrowth,
				conversionRate,
				averageDealSize,
				marketShare,
			] = await Promise.all([
				prisma.aircraft.count(),
				prisma.contact.count(),
				prisma.opportunity.count(),
				prisma.opportunity.aggregate({
					_sum: { value: true },
					where: { stage: 'CLOSED_WON' },
				}),
				this.calculateGrowthRate('monthly'),
				this.calculateGrowthRate('quarterly'),
				this.calculateGrowthRate('yearly'),
				this.calculateConversionRate(),
				this.calculateAverageDealSize(),
				this.calculateMarketShare(),
			]);

			return {
				totalAircraft,
				totalContacts,
				totalOpportunities,
				totalRevenue: totalRevenue._sum?.value?.toNumber() || 0,
				monthlyGrowth,
				quarterlyGrowth,
				yearlyGrowth,
				conversionRate,
				averageDealSize,
				marketShare,
			};
		} catch (error) {
			console.error('Error fetching dashboard stats:', error);
			throw new Error('Failed to fetch dashboard statistics');
		}
	}

	async getRecentActivity(limit: number = 10) {
		try {
			const activities = await prisma.activity.findMany({
				take: limit,
				orderBy: { createdAt: 'desc' },
			});

			return activities.map(activity => ({
				id: activity.id,
				type: activity.type,
				title: activity.title,
				description: activity.description,
				timestamp: this.formatTimestamp(activity.createdAt),
				status: 'info', // Default status since it doesn't exist in Activity model
				value: 0, // Default value since it doesn't exist in Activity model
			}));
		} catch (error) {
			console.error('Error fetching recent activity:', error);
			throw new Error('Failed to fetch recent activity');
		}
	}

	async getMarketTrends(period: string = 'monthly') {
		try {
			// This would typically integrate with external market data APIs
			// For now, we'll generate trends based on our data
			const trends = await prisma.opportunity.groupBy({
				by: ['createdAt'],
				_sum: { value: true }, // fix this
				where: {
					stage: 'CLOSED_WON',
					createdAt: {
						gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // Last 6 months
					},
				},
				orderBy: { createdAt: 'asc' },
			});

			return trends.map((trend, index) => ({
				period: new Date(trend.createdAt).toLocaleDateString('en-US', { month: 'short' }),
				value: Number(trend._sum.value || 0) / 1000000, // Convert to millions
				change:
					index > 0
						? this.calculatePercentageChange(
								Number(trends[index - 1]._sum.value || 0),
								Number(trend._sum.value || 0)
							)
						: 0,
				trend:
					index > 0
						? Number(trend._sum.value || 0) > Number(trends[index - 1]._sum.value || 0)
							? 'up'
							: 'down'
						: 'stable',
			}));
		} catch (error) {
			console.error('Error fetching market trends:', error);
			throw new Error('Failed to fetch market trends');
		}
	}

	// Helper Methods
	private async calculateGrowthRate(period: 'monthly' | 'quarterly' | 'yearly') {
		try {
			const now = new Date();
			let previousStart: Date;
			let currentStart: Date;

			switch (period) {
				case 'monthly':
					currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
					previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
					break;
				case 'quarterly':
					const currentQuarter = Math.floor(now.getMonth() / 3);
					currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
					previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
					break;
				case 'yearly':
					currentStart = new Date(now.getFullYear(), 0, 1);
					previousStart = new Date(now.getFullYear() - 1, 0, 1);
					break;
			}

			const [current, previous] = await Promise.all([
				prisma.opportunity.count({
					where: {
						createdAt: { gte: currentStart },
						stage: 'CLOSED_WON',
					},
				}),
				prisma.opportunity.count({
					where: {
						createdAt: { gte: previousStart, lt: currentStart },
						stage: 'CLOSED_WON',
					},
				}),
			]);

			return previous > 0 ? ((current - previous) / previous) * 100 : 0;
		} catch (error) {
			console.error('Error calculating growth rate:', error);
			return 0;
		}
	}

	private async calculateConversionRate() {
		try {
			const [totalOpportunities, wonOpportunities] = await Promise.all([
				prisma.opportunity.count(),
				prisma.opportunity.count({ where: { stage: 'CLOSED_WON' } }),
			]);

			return totalOpportunities > 0 ? (wonOpportunities / totalOpportunities) * 100 : 0;
		} catch (error) {
			console.error('Error calculating conversion rate:', error);
			return 0;
		}
	}

	private async calculateAverageDealSize() {
		try {
			const result = await prisma.opportunity.aggregate({
				_avg: { value: true }, // fix this
				where: { stage: 'CLOSED_WON' }, // fix this
			});

			return result._avg.value || 0; // fix this
		} catch (error) {
			console.error('Error calculating average deal size:', error);
			return 0;
		}
	}

	private async calculateMarketShare() {
		try {
			// This would typically integrate with external market data
			// For now, return a calculated percentage based on our data
			const ourRevenue = await prisma.opportunity.aggregate({
				_sum: { value: true }, // fix this
				where: { stage: 'CLOSED_WON' },
			});

			// Assume total market is 10x our revenue (this would come from external data)
			const totalMarketRevenue = Number(ourRevenue._sum.value || 0) * 10;

			return totalMarketRevenue > 0
				? (Number(ourRevenue._sum.value || 0) / totalMarketRevenue) * 100
				: 0;
		} catch (error) {
			console.error('Error calculating market share:', error);
			return 0;
		}
	}

	private calculatePercentageChange(previous: number, current: number) {
		return previous > 0 ? ((current - previous) / previous) * 100 : 0;
	}

	private formatTimestamp(date: Date) {
		const now = new Date();
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diffInSeconds < 60) return 'Just now';
		if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
		if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
		if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
		return date.toLocaleDateString();
	}

	private async logActivity(data: {
		type: 'aircraft' | 'contact' | 'opportunity' | 'deal';
		title: string;
		description: string;
		status: 'success' | 'warning' | 'error' | 'info';
		value?: number;
	}) {
		try {
			await prisma.activity.create({
				data: {
					...data,
					date: new Date(),
					type: data.type as ActivityType,
					duration: 0,
					outcome: data.status,
					title: data.title,
					description: data.description,
					metadata: {},
				},
			});
		} catch (error) {
			console.error('Error logging activity:', error);
		}
	}
}

export const dataService = new DataService();
