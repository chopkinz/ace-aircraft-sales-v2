import { Aircraft, Contact } from '@prisma/client';
import { ghlClient } from './ghl-client';

// Define interfaces for missing types
interface Company {
	id: string;
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
	createdAt: Date;
	updatedAt: Date;
}

interface LeadScore {
	id: string;
	aircraftId: number;
	companyId?: number;
	priorityLevel: string;
	commissionPotential?: number;
	tags: string[];
	ghlContactId?: string;
	ghlOpportunityId?: string;
	researchStatus: string;
	notes?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface LeadScoringCriteria {
	id: string;
	name: string;
	weight: number;
	conditions: {
		field: string;
		operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range';
		value: any; // eslint-disable-line @typescript-eslint/no-explicit-any
	}[];
}

export interface LeadScoreResult {
	aircraftId: number;
	companyId?: number;
	contactId?: number;
	totalScore: number;
	priorityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'STANDARD';
	commissionPotential: number;
	tags: string[];
	researchStatus:
		| 'CONTACT_INFO_NEEDED'
		| 'RESEARCH_COMPLETE'
		| 'CONTACT_MADE'
		| 'OPPORTUNITY_CREATED';
	notes?: string;
	ghlContactId?: string;
	ghlOpportunityId?: string;
}

export class SmartLeadScoringSystem {
	private criteria: LeadScoringCriteria[] = [];

	constructor() {
		this.initializeDefaultCriteria();
	}

	/**
	 * Initialize default lead scoring criteria for Douglas's CJ4 specialty
	 */
	private initializeDefaultCriteria(): void {
		this.criteria = [
			{
				id: 'cj4-model',
				name: 'CJ4 Model Match',
				weight: 25,
				conditions: [
					{
						field: 'model',
						operator: 'contains',
						value: 'CJ4',
					},
				],
			},
			{
				id: 'high-value-aircraft',
				name: 'High Value Aircraft',
				weight: 20,
				conditions: [
					{
						field: 'askingPrice',
						operator: 'greater_than',
						value: 8000000,
					},
				],
			},
			{
				id: 'recent-listing',
				name: 'Recently Listed',
				weight: 15,
				conditions: [
					{
						field: 'dateListed',
						operator: 'greater_than',
						value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
					},
				],
			},
			{
				id: 'low-hours',
				name: 'Low Total Hours',
				weight: 15,
				conditions: [
					{
						field: 'totalTimeHours',
						operator: 'less_than',
						value: 3000,
					},
				],
			},
			{
				id: 'premium-location',
				name: 'Premium Location',
				weight: 10,
				conditions: [
					{
						field: 'baseCity',
						operator: 'in_range',
						value: ['New York', 'Los Angeles', 'Miami', 'Chicago', 'Dallas', 'Atlanta'],
					},
				],
			},
			{
				id: 'for-sale-status',
				name: 'For Sale Status',
				weight: 10,
				conditions: [
					{
						field: 'forSale',
						operator: 'equals',
						value: true,
					},
				],
			},
			{
				id: 'competitive-pricing',
				name: 'Competitive Pricing',
				weight: 5,
				conditions: [
					{
						field: 'askingPrice',
						operator: 'in_range',
						value: [7000000, 12000000], // CJ4 market range
					},
				],
			},
		];
	}

	/**
	 * Score an aircraft and generate lead score
	 */
	async scoreAircraft(
		aircraft: Aircraft,
		company?: Company,
		contact?: Contact
	): Promise<LeadScoreResult> {
		let totalScore = 0;
		const matchedCriteria: string[] = [];
		const tags: string[] = [];

		// Evaluate each criteria
		for (const criterion of this.criteria) {
			if (this.evaluateCriteria(aircraft, company, contact, criterion)) {
				totalScore += criterion.weight;
				matchedCriteria.push(criterion.name);

				// Add specific tags based on criteria
				switch (criterion.id) {
					case 'cj4-model':
						tags.push('CJ4 Owner');
						break;
					case 'high-value-aircraft':
						tags.push('High Value');
						break;
					case 'recent-listing':
						tags.push('New Listing');
						break;
					case 'low-hours':
						tags.push('Low Hours');
						break;
					case 'premium-location':
						tags.push('Premium Location');
						break;
				}
			}
		}

		// Determine priority level
		const priorityLevel = this.determinePriorityLevel(totalScore);

		// Calculate commission potential (3% of aircraft value)
		const commissionPotential =
			typeof aircraft.askingPrice === 'number' ? aircraft.askingPrice * 0.03 : 0;

		// Determine research status
		const researchStatus = this.determineResearchStatus(aircraft, company, contact);

		// Add Douglas Specialty tag
		tags.push('Douglas Specialty');

		return {
			aircraftId: aircraft.aircraftId,
			companyId: company?.companyId,
			contactId: contact?.contactId,
			totalScore,
			priorityLevel,
			commissionPotential,
			tags,
			researchStatus,
			notes: `Scored based on: ${matchedCriteria.join(', ')}`,
		};
	}

	/**
	 * Evaluate a single criteria against aircraft/company/contact data
	 */
	private evaluateCriteria(
		aircraft: Aircraft,
		company: Company | undefined,
		contact: Contact | undefined,
		criterion: LeadScoringCriteria
	): boolean {
		return criterion.conditions.every(condition => {
			let fieldValue: any;

			// Get field value based on condition field
			switch (condition.field) {
				case 'model':
				case 'askingPrice':
				case 'dateListed':
				case 'totalTimeHours':
				case 'forSale':
				case 'baseCity':
					fieldValue = (aircraft as any)[condition.field];
					break;
				case 'companyName':
				case 'businessType':
					fieldValue = company ? (company as any)[condition.field] : null;
					break;
				case 'firstName':
				case 'lastName':
				case 'title':
				case 'email':
				case 'phone':
					fieldValue = contact ? (contact as any)[condition.field] : null;
					break;
				default:
					return false;
			}

			// Evaluate condition
			switch (condition.operator) {
				case 'equals':
					return fieldValue === condition.value;
				case 'contains':
					return (
						fieldValue &&
						fieldValue.toString().toLowerCase().includes(condition.value.toLowerCase())
					);
				case 'greater_than':
					return fieldValue && fieldValue > condition.value;
				case 'less_than':
					return fieldValue && fieldValue < condition.value;
				case 'in_range':
					return fieldValue && condition.value.includes(fieldValue);
				default:
					return false;
			}
		});
	}

	/**
	 * Determine priority level based on score
	 */
	private determinePriorityLevel(score: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'STANDARD' {
		if (score >= 80) return 'CRITICAL';
		if (score >= 60) return 'HIGH';
		if (score >= 40) return 'MEDIUM';
		return 'STANDARD';
	}

	/**
	 * Determine research status based on available data
	 */
	private determineResearchStatus(
		aircraft: Aircraft,
		company?: Company,
		contact?: Contact
	): 'CONTACT_INFO_NEEDED' | 'RESEARCH_COMPLETE' | 'CONTACT_MADE' | 'OPPORTUNITY_CREATED' {
		if (!company && !contact) return 'CONTACT_INFO_NEEDED';
		if (company && contact && contact.email && contact.phone) return 'RESEARCH_COMPLETE';
		if (company && contact) return 'CONTACT_MADE';
		return 'CONTACT_INFO_NEEDED';
	}

	/**
	 * Sync lead score to GoHighLevel
	 */
	async syncToGoHighLevel(leadScore: LeadScoreResult): Promise<{
		ghlContactId?: string;
		ghlOpportunityId?: string;
		success: boolean;
		error?: string;
	}> {
		try {
			// Create or update contact in GHL
			let ghlContactId: string | undefined;

			if (leadScore.contactId) {
				// Get contact details from database
				const contact = await this.getContactById(leadScore.contactId);
				if (contact) {
					const ghlContact = await ghlClient.createContact({
						firstName: contact.firstName || '',
						lastName: contact.lastName || '',
						email: contact.email || '',
						phone: contact.phone || '',
						tags: leadScore.tags,
						customFields: [
							{
								key: 'aircraft_registration',
								field_value: leadScore.aircraftId.toString(),
							},
							{
								key: 'lead_score',
								field_value: leadScore.totalScore.toString(),
							},
							{
								key: 'commission_potential',
								field_value: leadScore.commissionPotential.toString(),
							},
						],
					});

					ghlContactId = ghlContact.data?.id;
				}
			}

			// Create opportunity in GHL if high priority
			// Note: createOpportunity method not available in GHL client
			let ghlOpportunityId: string | undefined;
			/*
			if (leadScore.priorityLevel === 'CRITICAL' || leadScore.priorityLevel === 'HIGH') {
				const opportunity = await ghlClient.createOpportunity({
					name: `CJ4 Lead - Aircraft ${leadScore.aircraftId}`,
					contactId: ghlContactId,
					pipelineId: 'cj4-pipeline', // Would need to create this pipeline in GHL
					pipelineStageId: 'qualification-stage',
					monetaryValue: leadScore.commissionPotential,
					customFields: [
						{
							key: 'aircraft_id',
							field_value: leadScore.aircraftId.toString(),
						},
						{
							key: 'priority_level',
							field_value: leadScore.priorityLevel,
						},
						{
							key: 'tags',
							field_value: leadScore.tags.join(', '),
						},
					],
				});

				ghlOpportunityId = opportunity.id;
			}
			*/

			return {
				ghlContactId,
				ghlOpportunityId,
				success: true,
			};
		} catch (error) {
			console.error('Error syncing to GoHighLevel:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Get contact by ID (placeholder - would use actual database query)
	 */
	private async getContactById(contactId: number): Promise<Contact | null> {
		// This would be replaced with actual database query
		// For now, return null to indicate no contact found
		return null;
	}

	/**
	 * Batch process aircraft for lead scoring
	 */
	async batchScoreAircraft(
		aircraft: Aircraft[],
		companies: Company[],
		contacts: Contact[]
	): Promise<LeadScoreResult[]> {
		const results: LeadScoreResult[] = [];

		for (const ac of aircraft) {
			const company = companies.find(c => c.companyId === ac.aircraftId);
			const contact = contacts.find(c => c.companyId === company?.companyId);

			const score = await this.scoreAircraft(ac, company, contact);
			results.push(score);
		}

		// Sort by score descending
		return results.sort((a, b) => b.totalScore - a.totalScore);
	}

	/**
	 * Get top opportunities for Douglas
	 */
	async getTopOpportunities(limit: number = 10): Promise<LeadScoreResult[]> {
		// This would query the database for top-scored leads
		// For now, return empty array
		return [];
	}

	/**
	 * Update scoring criteria
	 */
	updateCriteria(criteria: LeadScoringCriteria[]): void {
		this.criteria = criteria;
	}

	/**
	 * Get current scoring criteria
	 */
	getCriteria(): LeadScoringCriteria[] {
		return this.criteria;
	}
}

// Export singleton instance
export const smartLeadScoringSystem = new SmartLeadScoringSystem();
