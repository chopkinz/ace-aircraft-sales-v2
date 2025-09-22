import { prisma } from '@/lib/database';
import { cacheManager } from '@/lib/cache-manager';
import { logger } from '@/lib/logger';
import {
	UserRole,
	AircraftStatus,
	ContactStatus,
	OpportunityStage,
	ActivityType,
	PriceTrend,
	MarketTrend,
	AlertType,
	AlertPriority,
	AlertStatus,
} from '@prisma/client';

// Base service class with common functionality
export abstract class BaseService {
	protected prisma = prisma;
	protected cache = cacheManager;
	protected logger = logger;

	protected async withCache<T>(key: string, fn: () => Promise<T>, ttl: number = 300): Promise<T> {
		return this.cache.cache(key, fn, ttl);
	}

	protected async logActivity(
		userId: string,
		action: string,
		resource: string,
		resourceId?: string,
		metadata?: Record<string, any>
	): Promise<void> {
		try {
			await this.prisma.userActivity.create({
				data: {
					userId,
					action,
					resource,
					resourceId,
					details: metadata,
				},
			});

			this.logger.logUserActivity(userId, action, {
				resource,
				resourceId,
				...metadata,
			});
		} catch (error) {
			this.logger.error('Failed to log user activity', error as Error, {
				userId,
				action,
				resource,
				resourceId,
			});
		}
	}
}

// Aircraft Service
export class AircraftService extends BaseService {
	async getAllAircraft(
		filters: {
			status?: AircraftStatus;
			make?: string;
			model?: string;
			minPrice?: number;
			maxPrice?: number;
			limit?: number;
			offset?: number;
		} = {}
	) {
		const cacheKey = `aircraft:all:${JSON.stringify(filters)}`;

		return this.withCache(
			cacheKey,
			async () => {
				const where: any = {};

				if (filters.status) where.status = filters.status;
				if (filters.make) where.manufacturer = { contains: filters.make, mode: 'insensitive' };
				if (filters.model) where.model = { contains: filters.model, mode: 'insensitive' };
				if (filters.minPrice || filters.maxPrice) {
					where.price = {};
					if (filters.minPrice) where.price.gte = filters.minPrice;
					if (filters.maxPrice) where.price.lte = filters.maxPrice;
				}

				const [aircraft, total] = await Promise.all([
					this.prisma.aircraft.findMany({
						where,
						take: filters.limit || 50,
						skip: filters.offset || 0,
						orderBy: { createdAt: 'desc' },
						include: {
							contacts: true,
							opportunities: true,
							marketData: {
								orderBy: { dataDate: 'desc' },
								take: 1,
							},
						},
					}),
					this.prisma.aircraft.count({ where }),
				]);

				return { aircraft, total };
			},
			300
		);
	}

	async getAircraftById(id: string) {
		const cacheKey = `aircraft:${id}`;

		return this.withCache(
			cacheKey,
			async () => {
				return this.prisma.aircraft.findUnique({
					where: { id },
					include: {
						contacts: true,
						opportunities: true,
						marketData: {
							orderBy: { dataDate: 'desc' },
							take: 10,
						},
						alerts: {
							where: { status: 'ACTIVE' },
							orderBy: { createdAt: 'desc' },
						},
					},
				});
			},
			600
		);
	}

	async createAircraft(
		data: {
			tailNumber: string;
			manufacturer: string;
			model: string;
			year: number;
			price: number;
			location?: string;
			description?: string;
			specifications?: any;
		},
		userId: string
	) {
		const aircraft = await this.prisma.aircraft.create({
			data: {
				...data,
				status: AircraftStatus.AVAILABLE,
				currency: 'USD',
			},
		});

		await this.logActivity(userId, 'CREATE_AIRCRAFT', 'aircraft', aircraft.id, {
			tailNumber: aircraft.tailNumber,
			manufacturer: aircraft.manufacturer,
			model: aircraft.model,
		});

		// Invalidate cache
		await this.cache.invalidatePattern('aircraft:*');

		return aircraft;
	}

	async updateAircraft(id: string, data: any, userId: string) {
		const aircraft = await this.prisma.aircraft.update({
			where: { id },
			data: { ...data, updatedAt: new Date() },
		});

		await this.logActivity(userId, 'UPDATE_AIRCRAFT', 'aircraft', id, data);

		// Invalidate cache
		await this.cache.del(`aircraft:${id}`);
		await this.cache.invalidatePattern('aircraft:*');

		return aircraft;
	}

	async deleteAircraft(id: string, userId: string) {
		await this.prisma.aircraft.delete({
			where: { id },
		});

		await this.logActivity(userId, 'DELETE_AIRCRAFT', 'aircraft', id);

		// Invalidate cache
		await this.cache.del(`aircraft:${id}`);
		await this.cache.invalidatePattern('aircraft:*');
	}
}

// Contact Service
export class ContactService extends BaseService {
	async getAllContacts(
		filters: {
			status?: ContactStatus;
			search?: string;
			userId?: string;
			limit?: number;
			offset?: number;
		} = {}
	) {
		const cacheKey = `contacts:all:${JSON.stringify(filters)}`;

		return this.withCache(
			cacheKey,
			async () => {
				const where: any = {};

				if (filters.status) where.status = filters.status;
				if (filters.userId) where.userId = filters.userId;
				if (filters.search) {
					where.OR = [
						{ firstName: { contains: filters.search, mode: 'insensitive' } },
						{ lastName: { contains: filters.search, mode: 'insensitive' } },
						{ email: { contains: filters.search, mode: 'insensitive' } },
						{ company: { contains: filters.search, mode: 'insensitive' } },
					];
				}

				const [contacts, total] = await Promise.all([
					this.prisma.contact.findMany({
						where,
						take: filters.limit || 50,
						skip: filters.offset || 0,
						orderBy: { createdAt: 'desc' },
						include: {
							user: true,
							aircraft: true,
							opportunities: true,
							activities: {
								orderBy: { date: 'desc' },
								take: 5,
							},
						},
					}),
					this.prisma.contact.count({ where }),
				]);

				return { contacts, total };
			},
			300
		);
	}

	async getContactById(id: string) {
		const cacheKey = `contact:${id}`;

		return this.withCache(
			cacheKey,
			async () => {
				return this.prisma.contact.findUnique({
					where: { id },
					include: {
						user: true,
						aircraft: true,
						opportunities: {
							orderBy: { createdAt: 'desc' },
						},
						activities: {
							orderBy: { date: 'desc' },
						},
						alerts: {
							where: { status: 'ACTIVE' },
							orderBy: { createdAt: 'desc' },
						},
					},
				});
			},
			600
		);
	}

	async createContact(
		data: {
			firstName: string;
			lastName: string;
			email?: string;
			phone?: string;
			company?: string;
			userId?: string;
		},
		userId: string
	) {
		const contact = await this.prisma.contact.create({
			data: {
				...data,
				status: ContactStatus.LEAD,
			},
		});

		await this.logActivity(userId, 'CREATE_CONTACT', 'contact', contact.id, {
			firstName: contact.firstName,
			lastName: contact.lastName,
			email: contact.email,
		});

		// Invalidate cache
		await this.cache.invalidatePattern('contacts:*');

		return contact;
	}

	async updateContact(id: string, data: any, userId: string) {
		const contact = await this.prisma.contact.update({
			where: { id },
			data: { ...data, updatedAt: new Date() },
		});

		await this.logActivity(userId, 'UPDATE_CONTACT', 'contact', id, data);

		// Invalidate cache
		await this.cache.del(`contact:${id}`);
		await this.cache.invalidatePattern('contacts:*');

		return contact;
	}

	async addContactActivity(
		contactId: string,
		data: {
			type: string;
			title: string;
			description?: string;
			date: Date;
			duration?: number;
			outcome?: string;
		},
		userId: string
	) {
		const activity = await this.prisma.contactActivity.create({
			data: {
				contactId,
				type: data.type as ActivityType,
				title: data.title,
				description: data.description,
				date: data.date,
				duration: data.duration,
				outcome: data.outcome,
			},
		});

		await this.logActivity(userId, 'ADD_CONTACT_ACTIVITY', 'contact_activity', activity.id, {
			contactId,
			type: data.type,
		});

		// Invalidate cache
		await this.cache.del(`contact:${contactId}`);

		return activity;
	}
}

// Opportunity Service
export class OpportunityService extends BaseService {
	async getAllOpportunities(
		filters: {
			stage?: OpportunityStage;
			status?: string;
			userId?: string;
			limit?: number;
			offset?: number;
		} = {}
	) {
		const cacheKey = `opportunities:all:${JSON.stringify(filters)}`;

		return this.withCache(
			cacheKey,
			async () => {
				const where: any = {};

				if (filters.stage) where.stage = filters.stage;
				if (filters.status) where.status = filters.status;
				if (filters.userId) where.userId = filters.userId;

				const [opportunities, total] = await Promise.all([
					this.prisma.opportunity.findMany({
						where,
						take: filters.limit || 50,
						skip: filters.offset || 0,
						orderBy: { createdAt: 'desc' },
						include: {
							user: true,
							contact: true,
							aircraft: true,
							activities: {
								orderBy: { date: 'desc' },
								take: 5,
							},
						},
					}),
					this.prisma.opportunity.count({ where }),
				]);

				return { opportunities, total };
			},
			300
		);
	}

	async getOpportunityById(id: string) {
		const cacheKey = `opportunity:${id}`;

		return this.withCache(
			cacheKey,
			async () => {
				return this.prisma.opportunity.findUnique({
					where: { id },
					include: {
						user: true,
						contact: true,
						aircraft: true,
						activities: {
							orderBy: { date: 'desc' },
						},
					},
				});
			},
			600
		);
	}

	async createOpportunity(
		data: {
			title: string;
			description?: string;
			value?: number;
			stage: OpportunityStage;
			contactId?: string;
			aircraftId?: string;
			userId?: string;
		},
		userId: string
	) {
		const opportunity = await this.prisma.opportunity.create({
			data: {
				...data,
				status: 'OPEN',
				probability: 50,
			},
		});

		await this.logActivity(userId, 'CREATE_OPPORTUNITY', 'opportunity', opportunity.id, {
			title: opportunity.title,
			stage: opportunity.stage,
			value: opportunity.value,
		});

		// Invalidate cache
		await this.cache.invalidatePattern('opportunities:*');

		return opportunity;
	}

	async updateOpportunity(id: string, data: any, userId: string) {
		const opportunity = await this.prisma.opportunity.update({
			where: { id },
			data: { ...data, updatedAt: new Date() },
		});

		await this.logActivity(userId, 'UPDATE_OPPORTUNITY', 'opportunity', id, data);

		// Invalidate cache
		await this.cache.del(`opportunity:${id}`);
		await this.cache.invalidatePattern('opportunities:*');

		return opportunity;
	}
}

// Market Data Service
export class MarketDataService extends BaseService {
	async getMarketTrends(category?: string, limit: number = 10) {
		const cacheKey = `market_trends:${category || 'all'}:${limit}`;

		return this.withCache(
			cacheKey,
			async () => {
				const where: any = {};
				if (category) where.category = category;

				return this.prisma.marketData.findMany({
					where,
					orderBy: { dataDate: 'desc' },
					take: limit,
					include: {
						aircraft: true,
					},
				});
			},
			1800
		); // Cache for 30 minutes
	}

	async createMarketData(data: {
		aircraftId?: string;
		make: string;
		model: string;
		category: string;
		avgPrice: number;
		minPrice: number;
		maxPrice: number;
		totalListings: number;
		avgDaysOnMarket: number;
		priceTrend: string;
		marketTrend: string;
		rawData?: any;
	}) {
		const marketData = await this.prisma.marketData.create({
			data: {
				make: data.make,
				model: data.model,
				category: data.category,
				avgPrice: data.avgPrice,
				minPrice: data.minPrice,
				maxPrice: data.maxPrice,
				totalListings: data.totalListings,
				avgDaysOnMarket: data.avgDaysOnMarket,
				priceTrend: Object.values(PriceTrend).includes(data.priceTrend as PriceTrend)
					? (data.priceTrend as PriceTrend)
					: PriceTrend.STABLE,
				marketTrend: Object.values(MarketTrend).includes(data.marketTrend as MarketTrend)
					? (data.marketTrend as MarketTrend)
					: MarketTrend.COOL,
				dataDate: new Date(),
				source: 'JetNet',
				rawData: data.rawData,
				...(data.aircraftId && { aircraftId: data.aircraftId }),
			},
		});

		// Invalidate cache
		await this.cache.invalidatePattern('market_trends:*');

		return marketData;
	}
}

// Alert Service
export class AlertService extends BaseService {
	async getActiveAlerts(userId?: string) {
		const cacheKey = `alerts:active:${userId || 'all'}`;

		return this.withCache(
			cacheKey,
			async () => {
				const where: any = { status: 'ACTIVE' };
				if (userId) where.userId = userId;

				return this.prisma.alert.findMany({
					where,
					orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
					include: {
						user: true,
						contact: true,
						aircraft: true,
					},
				});
			},
			60
		); // Cache for 1 minute
	}

	async createAlert(data: {
		title: string;
		message: string;
		type: string;
		priority: string;
		userId?: string;
		contactId?: string;
		aircraftId?: string;
		actionUrl?: string;
		metadata?: any;
	}) {
		const alert = await this.prisma.alert.create({
			data: {
				title: data.title,
				message: data.message,
				type: Object.values(AlertType).includes(data.type as AlertType)
					? (data.type as AlertType)
					: AlertType.SYSTEM,
				priority: Object.values(AlertPriority).includes(data.priority as AlertPriority)
					? (data.priority as AlertPriority)
					: AlertPriority.MEDIUM,
				status: AlertStatus.ACTIVE,
				actionUrl: data.actionUrl,
				metadata: data.metadata,
				...(data.userId && { userId: data.userId }),
				...(data.contactId && { contactId: data.contactId }),
				...(data.aircraftId && { aircraftId: data.aircraftId }),
			},
		});

		// Invalidate cache
		await this.cache.invalidatePattern('alerts:*');

		return alert;
	}

	async markAlertAsRead(id: string, userId: string) {
		const alert = await this.prisma.alert.update({
			where: { id },
			data: { isRead: true },
		});

		await this.logActivity(userId, 'READ_ALERT', 'alert', id);

		// Invalidate cache
		await this.cache.invalidatePattern('alerts:*');

		return alert;
	}
}

// Service instances
export const aircraftService = new AircraftService();
export const contactService = new ContactService();
export const opportunityService = new OpportunityService();
export const marketDataService = new MarketDataService();
export const alertService = new AlertService();
