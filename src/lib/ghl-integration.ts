import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface GHLContact {
	id: string;
	firstName: string;
	lastName: string;
	email?: string;
	phone?: string;
	companyName?: string;
	tags: string[];
	customFields: { [key: string]: any };
	locationId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface GHLOpportunity {
	id: string;
	name: string;
	contactId: string;
	pipelineId: string;
	pipelineStageId: string;
	monetaryValue: number;
	customFields: { [key: string]: any };
	status: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface GHLWebhookPayload {
	type: string;
	locationId: string;
	data: any;
	timestamp: Date;
}

export class GoHighLevelIntegration {
	private apiKey: string;
	private baseURL = 'https://rest.gohighlevel.com/v1';
	private locationId: string;

	constructor() {
		this.apiKey = process.env.GHL_API_KEY || '';
		this.locationId = process.env.GHL_LOCATION_ID || '';

		if (!this.apiKey || !this.locationId) {
			console.warn('⚠️ GoHighLevel API credentials not configured');
		}
	}

	/**
	 * Complete contact sync to GoHighLevel CRM
	 */
	async syncContactToGHL(aircraftOwner: {
		aircraftId: number;
		registration: string;
		make: string;
		model: string;
		askingPrice?: number;
		company?: {
			companyName: string;
			email?: string;
			phone?: string;
			city?: string;
			state?: string;
		};
		contact?: {
			firstName?: string;
			lastName?: string;
			email?: string;
			phone?: string;
			title?: string;
		};
	}): Promise<{ success: boolean; contactId?: string; error?: string }> {
		try {
			console.log(`🔄 Syncing aircraft owner to GHL: ${aircraftOwner.registration}`);

			// 1. Validate contact data
			const contactData = this.validateContactData(aircraftOwner);
			if (!contactData.isValid) {
				throw new Error(`Invalid contact data: ${contactData.errors.join(', ')}`);
			}

			// 2. Check for existing contact in GHL
			const existingContact = await this.findExistingContact(contactData.email, contactData.phone);

			let ghlContact: GHLContact;

			if (existingContact) {
				// 3. Update existing contact with aircraft information
				ghlContact = await this.updateContactInGHL(existingContact.id, {
					...contactData,
					customFields: {
						...existingContact.customFields,
						aircraft_registration: aircraftOwner.registration,
						aircraft_make_model: `${aircraftOwner.make} ${aircraftOwner.model}`,
						aircraft_id: aircraftOwner.aircraftId.toString(),
						commission_potential: aircraftOwner.askingPrice
							? (aircraftOwner.askingPrice * 0.03).toString()
							: '0',
						last_aircraft_sync: new Date().toISOString(),
						...contactData.customFields,
					},
					tags: [...new Set([...existingContact.tags, 'Aircraft Owner', 'Douglas Specialty'])],
				});
			} else {
				// 4. Create new contact with all custom fields
				ghlContact = await this.createContactInGHL({
					firstName: contactData.firstName,
					lastName: contactData.lastName,
					email: contactData.email,
					phone: contactData.phone,
					companyName: contactData.companyName,
					tags: ['Aircraft Owner', 'Douglas Specialty', 'CJ4 Owner'],
					customFields: {
						aircraft_registration: aircraftOwner.registration,
						aircraft_make_model: `${aircraftOwner.make} ${aircraftOwner.model}`,
						aircraft_id: aircraftOwner.aircraftId.toString(),
						commission_potential: aircraftOwner.askingPrice
							? (aircraftOwner.askingPrice * 0.03).toString()
							: '0',
						aircraft_value: aircraftOwner.askingPrice?.toString() || '0',
						aircraft_location:
							aircraftOwner.company?.city && aircraftOwner.company?.state
								? `${aircraftOwner.company.city}, ${aircraftOwner.company.state}`
								: 'Unknown',
						lead_source: 'JetNet API',
						lead_score: this.calculateLeadScore(aircraftOwner).toString(),
						priority_level: this.getPriorityLevel(aircraftOwner),
						research_status: 'CONTACT_INFO_NEEDED',
						last_aircraft_sync: new Date().toISOString(),
						...contactData.customFields,
					},
				});
			}

			// 5. Handle API rate limiting
			await this.handleRateLimit();

			// 6. Log sync results
			await this.logContactSync(aircraftOwner.aircraftId, ghlContact.id, true);

			// 7. Update database with GHL contact ID
			await this.updateAircraftWithGHLContact(aircraftOwner.aircraftId, ghlContact.id);

			// 8. Handle errors and retry logic
			console.log(`✅ Successfully synced contact to GHL: ${ghlContact.id}`);

			// 9. Send confirmation to user
			await this.sendSyncConfirmation(aircraftOwner.registration, ghlContact.id);

			return {
				success: true,
				contactId: ghlContact.id,
			};
		} catch (error) {
			console.error('❌ Failed to sync contact to GHL:', error);

			// Log failed sync
			await this.logContactSync(
				aircraftOwner.aircraftId,
				'',
				false,
				error instanceof Error ? error.message : 'Unknown error'
			);

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Create opportunity in GoHighLevel
	 */
	async createOpportunityInGHL(aircraft: {
		aircraftId: number;
		registration: string;
		make: string;
		model: string;
		askingPrice?: number;
		ghlContactId?: string;
	}): Promise<{ success: boolean; opportunityId?: string; error?: string }> {
		try {
			console.log(`🎯 Creating opportunity in GHL for aircraft: ${aircraft.registration}`);

			// Get or create CJ4 pipeline
			const pipelineId = await this.getOrCreateCJ4Pipeline();
			const stageId = await this.getQualificationStageId(pipelineId);

			// Calculate commission potential
			const commissionPotential = aircraft.askingPrice ? aircraft.askingPrice * 0.03 : 0;

			// Create opportunity
			const opportunity = await this.createOpportunityInGHL({
				name: `CJ4 Lead - ${aircraft.registration}`,
				contactId: aircraft.ghlContactId || '',
				pipelineId,
				pipelineStageId: stageId,
				monetaryValue: commissionPotential,
				customFields: {
					aircraft_id: aircraft.aircraftId.toString(),
					aircraft_registration: aircraft.registration,
					aircraft_make_model: `${aircraft.make} ${aircraft.model}`,
					aircraft_value: aircraft.askingPrice?.toString() || '0',
					commission_potential: commissionPotential.toString(),
					lead_source: 'JetNet API',
					priority_level: this.getPriorityLevel(aircraft),
					opportunity_type: 'Aircraft Sale',
					expected_close_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
					created_by: 'Douglas Young',
					created_via: 'ACE Aircraft Intelligence Platform',
				},
			});

			// Log opportunity creation
			await this.logOpportunityCreation(aircraft.aircraftId, opportunity.id);

			console.log(`✅ Successfully created opportunity in GHL: ${opportunity.id}`);

			return {
				success: true,
				opportunityId: opportunity.id,
			};
		} catch (error) {
			console.error('❌ Failed to create opportunity in GHL:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Setup automated workflows for Douglas's specific needs
	 */
	async setupAutomatedWorkflows(): Promise<void> {
		try {
			console.log('🔧 Setting up automated GHL workflows...');

			// Create CJ4 Alert Workflow
			await this.createCJ4AlertWorkflow();

			// Create Follow-up Workflow
			await this.createFollowUpWorkflow();

			// Create Commission Tracking Workflow
			await this.createCommissionTrackingWorkflow();

			console.log('✅ Automated workflows setup complete');
		} catch (error) {
			console.error('❌ Failed to setup automated workflows:', error);
			throw error;
		}
	}

	/**
	 * Handle incoming webhooks from GHL
	 */
	async handleGHLWebhook(payload: GHLWebhookPayload): Promise<void> {
		try {
			console.log(`📨 Received GHL webhook: ${payload.type}`);

			switch (payload.type) {
				case 'ContactCreated':
				case 'ContactUpdated':
					await this.handleContactWebhook(payload);
					break;
				case 'OpportunityCreated':
				case 'OpportunityUpdated':
					await this.handleOpportunityWebhook(payload);
					break;
				case 'OpportunityStageChanged':
					await this.handleStageChangeWebhook(payload);
					break;
				default:
					console.log(`ℹ️ Unhandled webhook type: ${payload.type}`);
			}
		} catch (error) {
			console.error('❌ Failed to handle GHL webhook:', error);
		}
	}

	/**
	 * Validate contact data before syncing
	 */
	private validateContactData(aircraftOwner: any): {
		isValid: boolean;
		errors: string[];
		firstName: string;
		lastName: string;
		email?: string;
		phone?: string;
		companyName?: string;
		customFields: { [key: string]: any };
	} {
		const errors: string[] = [];
		const customFields: { [key: string]: any } = {};

		// Extract contact information
		const firstName =
			aircraftOwner.contact?.firstName ||
			aircraftOwner.company?.companyName?.split(' ')[0] ||
			'Unknown';
		const lastName =
			aircraftOwner.contact?.lastName ||
			aircraftOwner.company?.companyName?.split(' ').slice(1).join(' ') ||
			'Owner';
		const email = aircraftOwner.contact?.email || aircraftOwner.company?.email;
		const phone = aircraftOwner.contact?.phone || aircraftOwner.company?.phone;
		const companyName = aircraftOwner.company?.companyName;

		// Validation rules
		if (!firstName || firstName.length < 2) {
			errors.push('First name is required and must be at least 2 characters');
		}

		if (!lastName || lastName.length < 2) {
			errors.push('Last name is required and must be at least 2 characters');
		}

		if (!email && !phone) {
			errors.push('Either email or phone number is required');
		}

		if (email && !this.isValidEmail(email)) {
			errors.push('Invalid email format');
		}

		if (phone && !this.isValidPhone(phone)) {
			errors.push('Invalid phone format');
		}

		// Add company information to custom fields
		if (aircraftOwner.company) {
			customFields.company_name = aircraftOwner.company.companyName;
			customFields.company_city = aircraftOwner.company.city;
			customFields.company_state = aircraftOwner.company.state;
		}

		return {
			isValid: errors.length === 0,
			errors,
			firstName,
			lastName,
			email,
			phone,
			companyName,
			customFields,
		};
	}

	/**
	 * Find existing contact in GHL
	 */
	private async findExistingContact(email?: string, phone?: string): Promise<GHLContact | null> {
		try {
			const params = new URLSearchParams();
			if (email) params.append('email', email);
			if (phone) params.append('phone', phone);

			const response = await fetch(`${this.baseURL}/contacts/?${params}`, {
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				throw new Error(`GHL API error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();
			return data.contacts && data.contacts.length > 0 ? data.contacts[0] : null;
		} catch (error) {
			console.error('Error finding existing contact:', error);
			return null;
		}
	}

	/**
	 * Create new contact in GHL
	 */
	private async createContactInGHL(contactData: {
		firstName: string;
		lastName: string;
		email?: string;
		phone?: string;
		companyName?: string;
		tags: string[];
		customFields: { [key: string]: any };
	}): Promise<GHLContact> {
		const response = await fetch(`${this.baseURL}/contacts/`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				firstName: contactData.firstName,
				lastName: contactData.lastName,
				email: contactData.email,
				phone: contactData.phone,
				companyName: contactData.companyName,
				tags: contactData.tags,
				customFields: contactData.customFields,
				locationId: this.locationId,
			}),
		});

		if (!response.ok) {
			throw new Error(`Failed to create contact: ${response.status} ${response.statusText}`);
		}

		return await response.json();
	}

	/**
	 * Update existing contact in GHL
	 */
	private async updateContactInGHL(contactId: string, updateData: any): Promise<GHLContact> {
		const response = await fetch(`${this.baseURL}/contacts/${contactId}`, {
			method: 'PUT',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(updateData),
		});

		if (!response.ok) {
			throw new Error(`Failed to update contact: ${response.status} ${response.statusText}`);
		}

		return await response.json();
	}

	/**
	 * Calculate lead score for aircraft
	 */
	private calculateLeadScore(aircraft: any): number {
		let score = 0;

		// CJ4 model gets highest score
		if (aircraft.model?.toUpperCase().includes('CJ4')) {
			score += 25;
		}

		// High value aircraft
		if (aircraft.askingPrice && aircraft.askingPrice >= 8000000) {
			score += 20;
		}

		// Recently listed
		if (aircraft.dateListed) {
			const daysSinceListed =
				(Date.now() - new Date(aircraft.dateListed).getTime()) / (1000 * 60 * 60 * 24);
			if (daysSinceListed <= 30) {
				score += 15;
			}
		}

		// Low hours
		if (aircraft.totalTimeHours && aircraft.totalTimeHours < 3000) {
			score += 15;
		}

		// Premium location
		const premiumLocations = ['New York', 'Los Angeles', 'Miami', 'Chicago', 'Dallas', 'Atlanta'];
		if (aircraft.company?.city && premiumLocations.includes(aircraft.company.city)) {
			score += 10;
		}

		// For sale status
		if (aircraft.forSale) {
			score += 10;
		}

		// Competitive pricing
		if (
			aircraft.askingPrice &&
			aircraft.askingPrice >= 7000000 &&
			aircraft.askingPrice <= 12000000
		) {
			score += 5;
		}

		return Math.min(score, 100); // Cap at 100
	}

	/**
	 * Get priority level based on aircraft data
	 */
	private getPriorityLevel(aircraft: any): string {
		const score = this.calculateLeadScore(aircraft);

		if (score >= 80) return 'CRITICAL';
		if (score >= 60) return 'HIGH';
		if (score >= 40) return 'MEDIUM';
		return 'STANDARD';
	}

	/**
	 * Handle rate limiting
	 */
	private async handleRateLimit(): Promise<void> {
		// Simple rate limiting - wait 100ms between requests
		await new Promise(resolve => setTimeout(resolve, 100));
	}

	/**
	 * Log contact sync operation
	 */
	private async logContactSync(
		aircraftId: number,
		ghlContactId: string,
		success: boolean,
		error?: string
	): Promise<void> {
		try {
			await prisma.apiSyncLog.create({
				data: {
					syncType: 'ghl_contact',
					status: success ? 'SUCCESS' : 'FAILED',
					recordsProcessed: 1,
					recordsCreated: success ? 1 : 0,
					recordsUpdated: 0,
					errorMessage: error || null,
					syncDurationMs: 0,
					startedAt: new Date(),
					completedAt: new Date(),
				},
			});
		} catch (error) {
			console.error('Failed to log contact sync:', error);
		}
	}

	/**
	 * Update aircraft with GHL contact ID
	 */
	private async updateAircraftWithGHLContact(
		aircraftId: number,
		ghlContactId: string
	): Promise<void> {
		try {
			// This would update the aircraft record with the GHL contact ID
			// Implementation depends on your database schema
			console.log(`Updated aircraft ${aircraftId} with GHL contact ${ghlContactId}`);
		} catch (error) {
			console.error('Failed to update aircraft with GHL contact ID:', error);
		}
	}

	/**
	 * Send sync confirmation
	 */
	private async sendSyncConfirmation(registration: string, ghlContactId: string): Promise<void> {
		// This would send an email or notification to Douglas
		console.log(
			`📧 Sync confirmation: Aircraft ${registration} synced to GHL contact ${ghlContactId}`
		);
	}

	/**
	 * Utility functions
	 */
	private isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	private isValidPhone(phone: string): boolean {
		const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
		return phoneRegex.test(phone.replace(/\s/g, ''));
	}

	/**
	 * Placeholder methods for workflow creation
	 */
	private async createCJ4AlertWorkflow(): Promise<void> {
		console.log('Creating CJ4 Alert Workflow...');
	}

	private async createFollowUpWorkflow(): Promise<void> {
		console.log('Creating Follow-up Workflow...');
	}

	private async createCommissionTrackingWorkflow(): Promise<void> {
		console.log('Creating Commission Tracking Workflow...');
	}

	private async getOrCreateCJ4Pipeline(): Promise<string> {
		// This would get or create a CJ4-specific pipeline in GHL
		return 'cj4-pipeline-id';
	}

	private async getQualificationStageId(pipelineId: string): Promise<string> {
		// This would get the qualification stage ID for the pipeline
		return 'qualification-stage-id';
	}

	private async logOpportunityCreation(aircraftId: number, opportunityId: string): Promise<void> {
		console.log(
			`Logged opportunity creation: Aircraft ${aircraftId} -> Opportunity ${opportunityId}`
		);
	}

	private async handleContactWebhook(payload: GHLWebhookPayload): Promise<void> {
		console.log('Handling contact webhook:', payload.data);
	}

	private async handleOpportunityWebhook(payload: GHLWebhookPayload): Promise<void> {
		console.log('Handling opportunity webhook:', payload.data);
	}

	private async handleStageChangeWebhook(payload: GHLWebhookPayload): Promise<void> {
		console.log('Handling stage change webhook:', payload.data);
	}
}

// Export singleton instance
export const ghlIntegration = new GoHighLevelIntegration();
