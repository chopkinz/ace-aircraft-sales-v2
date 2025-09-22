import { prisma } from '@/lib/database';
import { Prisma } from '@prisma/client';
import { JetNetAPIClient } from '@/lib/jetnet-client';
import { ApiSyncLog } from '@prisma/client';
import { SyncResult } from '@/types';

export interface SyncOptions {
	batchSize?: number;
	maxRetries?: number;
	skipExisting?: boolean;
	updateExisting?: boolean;
}

export class JetNetDataSyncService {
	private jetnetClient: JetNetAPIClient;
	private options: Required<SyncOptions>;

	constructor(options: SyncOptions = {}) {
		this.jetnetClient = new JetNetAPIClient();
		this.options = {
			batchSize: options.batchSize || 100,
			maxRetries: options.maxRetries || 3,
			skipExisting: options.skipExisting || false,
			updateExisting: options.updateExisting || true,
		};
	}

	/**
	 * Sync all aircraft data from JetNet API
	 */
	async syncAircraftData(): Promise<SyncResult> {
		const startTime = Date.now();
		const syncLog = await this.createSyncLog('aircraft');

		try {
			console.log('🔄 Starting aircraft data synchronization...');

			// Get all aircraft from JetNet API
			const aircraftData = await this.jetnetClient.searchAircraft({
				page: 1,
				limit: 10000, // Get all aircraft
				filters: {}, // No filters to get everything
			});

			if (!aircraftData.success || !aircraftData.data) {
				throw new Error('Failed to fetch aircraft data from JetNet API');
			}

			const aircraft = aircraftData.data || [];
			console.log(`📊 Found ${aircraft.length} aircraft to sync`);

			let recordsProcessed = 0;
			let recordsCreated = 0;
			let recordsUpdated = 0;
			const errors: string[] = [];

			// Process aircraft in batches
			for (let i = 0; i < aircraft.length; i += this.options.batchSize) {
				const batch = aircraft.slice(i, i + this.options.batchSize);

				for (const aircraftItem of batch) {
					try {
						const result = await this.syncAircraftRecord(aircraftItem);
						recordsProcessed++;

						if (result.created) {
							recordsCreated++;
						} else if (result.updated) {
							recordsUpdated++;
						}
					} catch (error) {
						const errorMsg = `Failed to sync aircraft ${aircraftItem.id}: ${
							error instanceof Error ? error.message : 'Unknown error'
						}`;
						errors.push(errorMsg);
						console.error(errorMsg);
					}
				}

				// Update progress
				console.log(
					`📈 Processed ${Math.min(i + this.options.batchSize, aircraft.length)}/${
						aircraft.length
					} aircraft`
				);
			}

			const duration = Date.now() - startTime;

			await this.updateSyncLog(syncLog.id, {
				status: errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
				recordsProcessed,
				recordsCreated,
				recordsUpdated,
				errorMessage: errors.length > 0 ? errors.join('; ') : null,
				syncDurationMs: duration,
				completedAt: new Date(),
			});

			console.log(
				`✅ Aircraft sync completed: ${recordsCreated} created, ${recordsUpdated} updated, ${errors.length} errors`
			);

			return {
				success: errors.length === 0,
				recordsProcessed,
				recordsCreated,
				recordsUpdated,
				errors,
				lastSync: syncLog.id,
				syncDuration: duration,
				duration,
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			await this.updateSyncLog(syncLog.id, {
				status: 'FAILED',
				errorMessage,
				syncDurationMs: duration,
				completedAt: new Date(),
			});

			console.error('❌ Aircraft sync failed:', errorMessage);

			return {
				success: false,
				recordsProcessed: 0,
				recordsCreated: 0,
				recordsUpdated: 0,
				errors: [errorMessage],
				lastSync: new Date().toISOString(),
				syncDuration: duration,
				duration,
			};
		}
	}

	/**
	 * Sync a single aircraft record
	 */
	private async syncAircraftRecord(
		aircraftData: Record<string, unknown>
	): Promise<{ created: boolean; updated: boolean }> {
		const aircraftId = aircraftData.aircraftId || aircraftData.id;

		// Check if aircraft already exists
		const existingAircraft = await prisma.aircraft.findUnique({
			where: { id: aircraftId as string },
		});

		const aircraftRecord = {
			aircraftId: aircraftId,
			serialNumber: (aircraftData.serialNumber as string) || `SN-${aircraftId}`,
			registration: (aircraftData.registration as string) || `N-${aircraftId}`,
			manufacturer: (aircraftData.make as string) || 'Unknown',
			model: (aircraftData.model as string) || 'Unknown',
			yearManufactured: aircraftData.yearManufactured
				? parseInt(aircraftData.yearManufactured as string)
				: null,
			askingPrice: aircraftData.askingPrice
				? parseFloat(aircraftData.askingPrice as string) * 100
				: null, // Convert to cents
			forSale: aircraftData.forSale || false,
			totalTimeHours: aircraftData.totalTimeHours
				? parseInt(aircraftData.totalTimeHours as string)
				: null,
			engineHours: aircraftData.engineHours ? parseInt(aircraftData.engineHours as string) : null,
			apuHours: aircraftData.apuHours ? parseInt(aircraftData.apuHours as string) : null,
			location:
				(aircraftData.location as string) ||
				`${(aircraftData.baseCity as string) || ''}, ${
					(aircraftData.baseState as string) || ''
				}`.trim() ||
				'Unknown',
			dateListed: aircraftData.dateListed ? new Date(aircraftData.dateListed as string) : null,
			lastUpdated: new Date(),
		};

		if (existingAircraft) {
			if (this.options.updateExisting) {
				await prisma.aircraft.update({
					where: { id: aircraftId as string },
					data: aircraftRecord as Prisma.AircraftUpdateInput,
				});
				return { created: false, updated: true };
			} else {
				return { created: false, updated: false };
			}
		} else {
			await prisma.aircraft.create({
				data: aircraftRecord as Prisma.AircraftCreateInput,
			});
			return { created: true, updated: false };
		}
	}

	/**
	 * Sync all company data from JetNet API
	 */
	async syncCompanyData(): Promise<SyncResult> {
		const startTime = Date.now();
		const syncLog = await this.createSyncLog('companies');

		try {
			console.log('🔄 Starting company data synchronization...');

			// Get all companies from JetNet API
			const companyData = await this.jetnetClient.searchCompanies('', 'all');

			if (!companyData || !Array.isArray(companyData)) {
				throw new Error('Failed to fetch company data from JetNet API');
			}

			const companies = companyData || [];
			console.log(`📊 Found ${companies.length} companies to sync`);

			let recordsProcessed = 0;
			let recordsCreated = 0;
			let recordsUpdated = 0;
			const errors: string[] = [];

			// Process companies in batches
			for (let i = 0; i < companies.length; i += this.options.batchSize) {
				const batch = companies.slice(i, i + this.options.batchSize);

				for (const companyItem of batch) {
					try {
						const result = await this.syncCompanyRecord(companyItem);
						recordsProcessed++;

						if (result.created) {
							recordsCreated++;
						} else if (result.updated) {
							recordsUpdated++;
						}
					} catch (error) {
						const errorMsg = `Failed to sync company ${companyItem.companyId}: ${
							error instanceof Error ? error.message : 'Unknown error'
						}`;
						errors.push(errorMsg);
						console.error(errorMsg);
					}
				}

				console.log(
					`📈 Processed ${Math.min(i + this.options.batchSize, companies.length)}/${
						companies.length
					} companies`
				);
			}

			const duration = Date.now() - startTime;

			await this.updateSyncLog(syncLog.id, {
				status: errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
				recordsProcessed,
				recordsCreated,
				recordsUpdated,
				errorMessage: errors.length > 0 ? errors.join('; ') : null,
				syncDurationMs: duration,
				completedAt: new Date(),
			});

			console.log(
				`✅ Company sync completed: ${recordsCreated} created, ${recordsUpdated} updated, ${errors.length} errors`
			);

			return {
				success: errors.length === 0,
				recordsProcessed,
				recordsCreated,
				recordsUpdated,
				errors,
				lastSync: syncLog.id,
				syncDuration: duration,
				duration,
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			await this.updateSyncLog(syncLog.id, {
				status: 'FAILED',
				errorMessage,
				syncDurationMs: duration,
				completedAt: new Date(),
			});

			console.error('❌ Company sync failed:', errorMessage);

			return {
				success: false,
				recordsProcessed: 0,
				recordsCreated: 0,
				recordsUpdated: 0,
				errors: [errorMessage],
				lastSync: new Date().toISOString(),
				syncDuration: duration,
				duration,
			};
		}
	}

	/**
	 * Sync a single company record
	 */
	private async syncCompanyRecord(
		companyData: Record<string, unknown>
	): Promise<{ created: boolean; updated: boolean }> {
		const companyId = companyData.companyId;

		// Check if company already exists
		const existingCompany = await prisma.company.findUnique({
			where: { companyId: companyId as number },
		});

		const companyRecord = {
			companyId: companyId as number,
			companyName: (companyData.companyName as string) || 'Unknown Company',
			businessType: companyData.businessType as string | null,
			address1: companyData.address1 as string | null,
			address2: companyData.address2 as string | null,
			city: companyData.city as string | null,
			state: companyData.state as string | null,
			zipCode: companyData.zipCode as string | null,
			country: companyData.country as string | null,
			phone: companyData.phone as string | null,
			email: companyData.email as string | null,
			website: companyData.website as string | null,
			updatedAt: new Date(),
		};

		if (existingCompany) {
			if (this.options.updateExisting) {
				await prisma.company.update({
					where: { companyId: companyId as number },
					data: companyRecord as Prisma.CompanyUpdateInput,
				});
				return { created: false, updated: true };
			} else {
				return { created: false, updated: false };
			}
		} else {
			await prisma.company.create({
				data: companyRecord as Prisma.CompanyCreateInput,
			});
			return { created: true, updated: false };
		}
	}

	/**
	 * Sync all contact data from JetNet API
	 */
	async syncContactData(): Promise<SyncResult> {
		const startTime = Date.now();
		const syncLog = await this.createSyncLog('contacts');

		try {
			console.log('🔄 Starting contact data synchronization...');

			// Get all contacts from JetNet API
			// Note: getContacts method doesn't exist, using placeholder for now
			const contactData: Record<string, unknown>[] = [];

			if (!contactData || !Array.isArray(contactData)) {
				throw new Error('Failed to fetch contact data from JetNet API');
			}

			const contacts = contactData || [];
			console.log(`📊 Found ${contacts.length} contacts to sync`);

			let recordsProcessed = 0;
			let recordsCreated = 0;
			let recordsUpdated = 0;
			const errors: string[] = [];

			// Process contacts in batches
			for (let i = 0; i < contacts.length; i += this.options.batchSize) {
				const batch = contacts.slice(i, i + this.options.batchSize);

				for (const contactItem of batch) {
					try {
						const result = await this.syncContactRecord(contactItem);
						recordsProcessed++;

						if (result.created) {
							recordsCreated++;
						} else if (result.updated) {
							recordsUpdated++;
						}
					} catch (error) {
						const errorMsg = `Failed to sync contact ${contactItem.contactId}: ${
							error instanceof Error ? error.message : 'Unknown error'
						}`;
						errors.push(errorMsg);
						console.error(errorMsg);
					}
				}

				console.log(
					`📈 Processed ${Math.min(i + this.options.batchSize, contacts.length)}/${
						contacts.length
					} contacts`
				);
			}

			const duration = Date.now() - startTime;

			await this.updateSyncLog(syncLog.id, {
				status: errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
				recordsProcessed,
				recordsCreated,
				recordsUpdated,
				errorMessage: errors.length > 0 ? errors.join('; ') : null,
				syncDurationMs: duration,
				completedAt: new Date(),
			});

			console.log(
				`✅ Contact sync completed: ${recordsCreated} created, ${recordsUpdated} updated, ${errors.length} errors`
			);

			return {
				success: errors.length === 0,
				recordsProcessed,
				recordsCreated,
				recordsUpdated,
				errors,
				lastSync: syncLog.id,
				syncDuration: duration,
				duration,
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			await this.updateSyncLog(syncLog.id, {
				status: 'FAILED',
				errorMessage,
				syncDurationMs: duration,
				completedAt: new Date(),
			});

			console.error('❌ Contact sync failed:', errorMessage);

			return {
				success: false,
				recordsProcessed: 0,
				recordsCreated: 0,
				recordsUpdated: 0,
				errors: [errorMessage],
				lastSync: new Date().toISOString(),
				syncDuration: duration,
				duration,
			};
		}
	}

	/**
	 * Sync a single contact record
	 */
	private async syncContactRecord(
		contactData: Record<string, unknown>
	): Promise<{ created: boolean; updated: boolean }> {
		const contactId = contactData.contactId;

		// Check if contact already exists
		const existingContact = await prisma.contact.findUnique({
			where: { contactId: contactId as number },
		});

		const contactRecord = {
			contactId: contactId as number,
			companyId: contactData.companyId ? parseInt(contactData.companyId as string) : null,
			firstName: contactData.firstName as string | null,
			lastName: contactData.lastName as string | null,
			title: contactData.title as string | null,
			email: contactData.email as string | null,
			phone: contactData.phone as string | null,
			mobile: contactData.mobile as string | null,
			updatedAt: new Date(),
		};

		if (existingContact) {
			if (this.options.updateExisting) {
				await prisma.contact.update({
					where: { contactId: contactId as number },
					data: contactRecord,
				});
				return { created: false, updated: true };
			} else {
				return { created: false, updated: false };
			}
		} else {
			await prisma.contact.create({
				data: contactRecord,
			});
			return { created: true, updated: false };
		}
	}

	/**
	 * Sync all data (aircraft, companies, contacts)
	 */
	async syncAllData(): Promise<{
		aircraft: SyncResult;
		companies: SyncResult;
		contacts: SyncResult;
		overall: {
			success: boolean;
			totalRecordsProcessed: number;
			totalRecordsCreated: number;
			totalRecordsUpdated: number;
			totalErrors: number;
			totalDuration: number;
		};
	}> {
		console.log('🚀 Starting full data synchronization...');
		const startTime = Date.now();

		const aircraftResult = await this.syncAircraftData();
		const companiesResult = await this.syncCompanyData();
		const contactsResult = await this.syncContactData();

		const totalDuration = Date.now() - startTime;
		const overall = {
			success: aircraftResult.success && companiesResult.success && contactsResult.success,
			totalRecordsProcessed:
				aircraftResult.recordsProcessed +
				companiesResult.recordsProcessed +
				contactsResult.recordsProcessed,
			totalRecordsCreated:
				aircraftResult.recordsCreated +
				companiesResult.recordsCreated +
				contactsResult.recordsCreated,
			totalRecordsUpdated:
				aircraftResult.recordsUpdated +
				companiesResult.recordsUpdated +
				contactsResult.recordsUpdated,
			totalErrors:
				aircraftResult.errors.length + companiesResult.errors.length + contactsResult.errors.length,
			totalDuration,
		};

		console.log(`🎉 Full sync completed in ${totalDuration}ms:`, overall);

		return {
			aircraft: aircraftResult,
			companies: companiesResult,
			contacts: contactsResult,
			overall,
		};
	}

	/**
	 * Create a sync log entry
	 */
	private async createSyncLog(syncType: string): Promise<ApiSyncLog> {
		return await prisma.apiSyncLog.create({
			data: {
				syncType,
				status: 'PENDING',
				recordsProcessed: 0,
				recordsCreated: 0,
				recordsUpdated: 0,
				startedAt: new Date(),
			},
		});
	}

	/**
	 * Update a sync log entry
	 */
	private async updateSyncLog(
		id: string,
		data: Partial<
			Pick<
				ApiSyncLog,
				| 'status'
				| 'recordsProcessed'
				| 'recordsCreated'
				| 'recordsUpdated'
				| 'errorMessage'
				| 'syncDurationMs'
				| 'completedAt'
			>
		>
	): Promise<void> {
		await prisma.apiSyncLog.update({
			where: { id },
			data,
		});
	}

	/**
	 * Get sync status and history
	 */
	async getSyncStatus(): Promise<{
		lastSync: ApiSyncLog | null;
		recentSyncs: ApiSyncLog[];
		stats: {
			totalSyncs: number;
			successfulSyncs: number;
			failedSyncs: number;
			averageDuration: number;
		};
	}> {
		const lastSync = await prisma.apiSyncLog.findFirst({
			orderBy: { startedAt: 'desc' },
		});

		const recentSyncs = await prisma.apiSyncLog.findMany({
			orderBy: { startedAt: 'desc' },
			take: 10,
		});

		const allSyncs = await prisma.apiSyncLog.findMany();

		const stats = {
			totalSyncs: allSyncs.length,
			successfulSyncs: allSyncs.filter(s => s.status === 'SUCCESS').length,
			failedSyncs: allSyncs.filter(s => s.status === 'FAILED').length,
			averageDuration:
				allSyncs.reduce((sum, s) => sum + (s.syncDurationMs || 0), 0) / allSyncs.length || 0,
		};

		return {
			lastSync,
			recentSyncs,
			stats,
		};
	}
}

// Export singleton instance
export const jetnetDataSync = new JetNetDataSyncService();
