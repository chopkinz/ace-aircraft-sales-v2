import { PrismaClient, Prisma } from '@prisma/client';
import { jetNetClient } from './jetnet-client';

const prisma = new PrismaClient();

export interface SyncResult {
	success: boolean;
	recordsProcessed: number;
	recordsCreated: number;
	recordsUpdated: number;
	errors: string[];
	duration: number;
	lastSyncAt: Date;
}

export interface AircraftSyncData {
	aircraftId: number;
	serialNumber: string;
	registration: string;
	make: string;
	model: string;
	yearManufactured?: number;
	askingPrice?: number;
	forSale: boolean;
	totalTimeHours?: number;
	engineHours?: number;
	apuHours?: number;
	baseCity?: string;
	baseState?: string;
	baseCountry?: string;
	dateListed?: Date;
	lastUpdated: Date;
}

export interface CompanySyncData {
	companyId: number;
	companyName: string;
	businessType?: string;
	address1?: string;
	address2?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	country?: string;
	phone?: string;
	email?: string;
	website?: string;
}

export interface ContactSyncData {
	contactId: number;
	companyId?: number;
	firstName?: string;
	lastName?: string;
	title?: string;
	email?: string;
	phone?: string;
	mobile?: string;
}

export class JetNetDataManager {
	private isSyncing = false;
	private syncInterval?: NodeJS.Timeout;

	/**
	 * Complete aircraft data sync from JetNet API
	 */
	async syncAllAircraftData(): Promise<SyncResult> {
		if (this.isSyncing) {
			throw new Error('Sync already in progress');
		}

		const startTime = Date.now();
		this.isSyncing = true;

		try {
			console.log('🚀 Starting JetNet aircraft data sync...');

			// 1. Authenticate with JetNet API
			const authSuccess = await jetNetClient.ensureAuthenticated();
			if (!authSuccess) {
				throw new Error('Failed to authenticate with JetNet API');
			}

			// 2. Fetch bulk aircraft records
			const aircraftData = await jetNetClient.getAircraft({
				page: 1,
				limit: 1000, // Adjust based on API limits
				includeImages: true,
				includeMarketData: true,
			});

			console.log(`📊 Fetched ${aircraftData.length} aircraft records from JetNet`);

			// 3. Process and validate data
			const processedData = this.processAircraftData(aircraftData);
			console.log(`✅ Processed ${processedData.length} valid aircraft records`);

			// 4. Handle duplicates intelligently and update database
			const syncResult = await this.updateAircraftDatabase(processedData);

			// 5. Log all operations
			await this.logSyncOperation('aircraft', syncResult);

			// 6. Send success notification
			await this.sendSyncNotification('aircraft', syncResult);

			const duration = Date.now() - startTime;
			console.log(`🎉 Aircraft sync completed in ${duration}ms`);

			return {
				success: true,
				recordsProcessed: processedData.length,
				recordsCreated: syncResult.created,
				recordsUpdated: syncResult.updated,
				errors: syncResult.errors,
				duration,
				lastSyncAt: new Date(),
			};
		} catch (error) {
			console.error('❌ Aircraft sync failed:', error);
			const duration = Date.now() - startTime;

			await this.logSyncOperation('aircraft', {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				duration,
			});

			return {
				success: false,
				recordsProcessed: 0,
				recordsCreated: 0,
				recordsUpdated: 0,
				errors: [error instanceof Error ? error.message : 'Unknown error'],
				duration,
				lastSyncAt: new Date(),
			};
		} finally {
			this.isSyncing = false;
		}
	}

	/**
	 * Sync companies and contacts from JetNet API
	 */
	async syncCompaniesAndContacts(): Promise<SyncResult> {
		const startTime = Date.now();
		this.isSyncing = true;

		try {
			console.log('🏢 Starting JetNet companies and contacts sync...');

			// Authenticate
			const authSuccess = await jetNetClient.ensureAuthenticated();
			if (!authSuccess) {
				throw new Error('Failed to authenticate with JetNet API');
			}

			// Fetch companies data
			const companiesData = await jetNetClient.getCompanies({
				page: 1,
				limit: 1000,
			});

			// Fetch contacts data
			const contactsData = await jetNetClient.getContacts({
				page: 1,
				limit: 1000,
			});

			console.log(
				`📊 Fetched ${companiesData.length} companies and ${contactsData.length} contacts`
			);

			// Process and sync companies
			const companiesResult = await this.updateCompaniesDatabase(companiesData);

			// Process and sync contacts
			const contactsResult = await this.updateContactsDatabase(contactsData);

			const totalProcessed = companiesData.length + contactsData.length;
			const totalCreated = companiesResult.created + contactsResult.created;
			const totalUpdated = companiesResult.updated + contactsResult.updated;
			const allErrors = [...companiesResult.errors, ...contactsResult.errors];

			// Log operations
			await this.logSyncOperation('companies', companiesResult);
			await this.logSyncOperation('contacts', contactsResult);

			const duration = Date.now() - startTime;
			console.log(`🎉 Companies and contacts sync completed in ${duration}ms`);

			return {
				success: true,
				recordsProcessed: totalProcessed,
				recordsCreated: totalCreated,
				recordsUpdated: totalUpdated,
				errors: allErrors,
				duration,
				lastSyncAt: new Date(),
			};
		} catch (error) {
			console.error('❌ Companies and contacts sync failed:', error);
			const duration = Date.now() - startTime;

			await this.logSyncOperation('companies', {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				duration,
			});

			return {
				success: false,
				recordsProcessed: 0,
				recordsCreated: 0,
				recordsUpdated: 0,
				errors: [error instanceof Error ? error.message : 'Unknown error'],
				duration,
				lastSyncAt: new Date(),
			};
		} finally {
			this.isSyncing = false;
		}
	}

	/**
	 * Schedule automatic sync every 6 hours
	 */
	async scheduleAutomaticSync(): Promise<void> {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
		}

		// Run initial sync
		await this.syncAllAircraftData();
		await this.syncCompaniesAndContacts();

		// Schedule recurring sync every 6 hours
		this.syncInterval = setInterval(async () => {
			try {
				console.log('⏰ Running scheduled sync...');
				await this.syncAllAircraftData();
				await this.syncCompaniesAndContacts();
			} catch (error) {
				console.error('❌ Scheduled sync failed:', error);
			}
		}, 6 * 60 * 60 * 1000); // 6 hours

		console.log('📅 Automatic sync scheduled every 6 hours');
	}

	/**
	 * Process raw aircraft data from JetNet API
	 */
	private processAircraftData(rawData: Record<string, unknown>[]): AircraftSyncData[] {
		return rawData
			.map(item => ({
				aircraftId: item.id || item.aircraftId,
				serialNumber: item.serialNumber || item.serial || '',
				registration: item.registration || item.tailNumber || '',
				make: item.make || item.manufacturer || '',
				model: item.model || '',
				yearManufactured: item.yearManufactured || item.year || undefined,
				askingPrice: item.askingPrice || item.price || undefined,
				forSale: item.forSale || item.status === 'For Sale' || false,
				totalTimeHours: item.totalTimeHours || item.totalHours || undefined,
				engineHours: item.engineHours || undefined,
				apuHours: item.apuHours || undefined,
				baseCity: item.baseCity || item.location?.city || undefined,
				baseState: item.baseState || item.location?.state || undefined,
				baseCountry: item.baseCountry || item.location?.country || 'US',
				dateListed: item.dateListed ? new Date(item.dateListed) : undefined,
				lastUpdated: new Date(),
			}))
			.filter(
				item => item.aircraftId && item.serialNumber && item.registration && item.make && item.model
			);
	}

	/**
	 * Update aircraft database with processed data
	 */
	private async updateAircraftDatabase(data: AircraftSyncData[]): Promise<{
		created: number;
		updated: number;
		errors: string[];
	}> {
		let created = 0;
		let updated = 0;
		const errors: string[] = [];

		for (const aircraft of data) {
			try {
				const existing = await prisma.aircraft.findUnique({
					where: { aircraftId: aircraft.aircraftId },
				});

				if (existing) {
					// Update existing record
					await prisma.aircraft.update({
						where: { aircraftId: aircraft.aircraftId },
						data: {
							serialNumber: aircraft.serialNumber,
							registration: aircraft.registration,
							make: aircraft.make,
							model: aircraft.model,
							yearManufactured: aircraft.yearManufactured,
							askingPrice: aircraft.askingPrice,
							forSale: aircraft.forSale,
							totalTimeHours: aircraft.totalTimeHours,
							engineHours: aircraft.engineHours,
							apuHours: aircraft.apuHours,
							baseCity: aircraft.baseCity,
							baseState: aircraft.baseState,
							baseCountry: aircraft.baseCountry,
							dateListed: aircraft.dateListed,
							lastUpdated: aircraft.lastUpdated,
						},
					});
					updated++;
				} else {
					// Create new record
					await prisma.aircraft.create({
						data: {
							aircraftId: aircraft.aircraftId,
							serialNumber: aircraft.serialNumber,
							registration: aircraft.registration,
							make: aircraft.make,
							model: aircraft.model,
							yearManufactured: aircraft.yearManufactured,
							askingPrice: aircraft.askingPrice,
							forSale: aircraft.forSale,
							totalTimeHours: aircraft.totalTimeHours,
							engineHours: aircraft.engineHours,
							apuHours: aircraft.apuHours,
							baseCity: aircraft.baseCity,
							baseState: aircraft.baseState,
							baseCountry: aircraft.baseCountry,
							dateListed: aircraft.dateListed,
							lastUpdated: aircraft.lastUpdated,
						},
					});
					created++;
				}
			} catch (error) {
				const errorMsg = `Failed to sync aircraft ${aircraft.aircraftId}: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`;
				errors.push(errorMsg);
				console.error(errorMsg);
			}
		}

		return { created, updated, errors };
	}

	/**
	 * Update companies database
	 */
	private async updateCompaniesDatabase(data: CompanySyncData[]): Promise<{
		created: number;
		updated: number;
		errors: string[];
	}> {
		let created = 0;
		let updated = 0;
		const errors: string[] = [];

		for (const company of data) {
			try {
				const existing = await prisma.company.findUnique({
					where: { companyId: company.companyId },
				});

				if (existing) {
					await prisma.company.update({
						where: { companyId: company.companyId },
						data: {
							companyName: company.companyName,
							businessType: company.businessType,
							address1: company.address1,
							address2: company.address2,
							city: company.city,
							state: company.state,
							zipCode: company.zipCode,
							country: company.country,
							phone: company.phone,
							email: company.email,
							website: company.website,
							updatedAt: new Date(),
						},
					});
					updated++;
				} else {
					await prisma.company.create({
						data: {
							companyId: company.companyId,
							companyName: company.companyName,
							businessType: company.businessType,
							address1: company.address1,
							address2: company.address2,
							city: company.city,
							state: company.state,
							zipCode: company.zipCode,
							country: company.country,
							phone: company.phone,
							email: company.email,
							website: company.website,
						},
					});
					created++;
				}
			} catch (error) {
				const errorMsg = `Failed to sync company ${company.companyId}: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`;
				errors.push(errorMsg);
				console.error(errorMsg);
			}
		}

		return { created, updated, errors };
	}

	/**
	 * Update contacts database
	 */
	private async updateContactsDatabase(data: ContactSyncData[]): Promise<{
		created: number;
		updated: number;
		errors: string[];
	}> {
		let created = 0;
		let updated = 0;
		const errors: string[] = [];

		for (const contact of data) {
			try {
				const existing = await prisma.contact.findUnique({
					where: { contactId: contact.contactId },
				});

				if (existing) {
					await prisma.contact.update({
						where: { contactId: contact.contactId },
						data: {
							companyId: contact.companyId,
							firstName: contact.firstName,
							lastName: contact.lastName,
							title: contact.title,
							email: contact.email,
							phone: contact.phone,
							mobile: contact.mobile,
							updatedAt: new Date(),
						},
					});
					updated++;
				} else {
					await prisma.contact.create({
						data: {
							contactId: contact.contactId,
							companyId: contact.companyId,
							firstName: contact.firstName,
							lastName: contact.lastName,
							title: contact.title,
							email: contact.email,
							phone: contact.phone,
							mobile: contact.mobile,
						},
					});
					created++;
				}
			} catch (error) {
				const errorMsg = `Failed to sync contact ${contact.contactId}: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`;
				errors.push(errorMsg);
				console.error(errorMsg);
			}
		}

		return { created, updated, errors };
	}

	/**
	 * Log sync operation to database
	 */
	private async logSyncOperation(type: string, result: Record<string, unknown>): Promise<void> {
		try {
			await prisma.apiSyncLog.create({
				data: {
					syncType: type,
					status: result.success ? 'SUCCESS' : 'FAILED',
					recordsProcessed: result.recordsProcessed || 0,
					recordsCreated: result.created || result.recordsCreated || 0,
					recordsUpdated: result.updated || result.recordsUpdated || 0,
					errorMessage:
						result.error ||
						(result.errors && result.errors.length > 0 ? result.errors.join('; ') : null),
					syncDurationMs: result.duration || 0,
					startedAt: new Date(),
					completedAt: new Date(),
				},
			});
		} catch (error) {
			console.error('Failed to log sync operation:', error);
		}
	}

	/**
	 * Send sync notification
	 */
	private async sendSyncNotification(type: string, result: SyncResult): Promise<void> {
		// This would integrate with email service to notify Douglas
		console.log(`📧 Sync notification for ${type}:`, {
			success: result.success,
			processed: result.recordsProcessed,
			created: result.recordsCreated,
			updated: result.recordsUpdated,
			errors: result.errors.length,
		});
	}

	/**
	 * Get sync status
	 */
	async getSyncStatus(): Promise<{
		isRunning: boolean;
		lastSync?: Date;
		nextSync?: Date;
	}> {
		const lastLog = await prisma.apiSyncLog.findFirst({
			orderBy: { startedAt: 'desc' },
		});

		return {
			isRunning: this.isSyncing,
			lastSync: lastLog?.startedAt,
			nextSync: this.syncInterval ? new Date(Date.now() + 6 * 60 * 60 * 1000) : undefined,
		};
	}

	/**
	 * Stop automatic sync
	 */
	stopAutomaticSync(): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = undefined;
			console.log('🛑 Automatic sync stopped');
		}
	}
}

// Export singleton instance
export const jetNetDataManager = new JetNetDataManager();
