import { Aircraft, LeadScore, Company } from '@prisma/client';

export interface CJ4Alert {
	id: string;
	type: 'NEW_LISTING' | 'PRICE_CHANGE' | 'OWNERSHIP_TRANSFER' | 'MARKET_OPPORTUNITY';
	priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
	aircraft: Aircraft;
	company?: Company;
	leadScore?: LeadScore;
	message: string;
	actionRequired: string;
	createdAt: Date;
	expiresAt?: Date;
}

export interface CJ4MarketAnalysis {
	totalCJ4Listings: number;
	avgPrice: number;
	priceRange: { min: number; max: number };
	marketTrend: 'RISING' | 'FALLING' | 'STABLE';
	daysOnMarket: number;
	// absorptionRate: number;
	competitorAnalysis: {
		name: string;
		listings: number;
		avgPrice: number;
	}[];
	opportunities: CJ4Alert[];
}

export class CJ4AlertSystem {
	private alerts: CJ4Alert[] = [];
	private subscribers: ((alert: CJ4Alert) => void)[] = [];

	/**
	 * Analyze aircraft data for CJ4-specific opportunities
	 */
	analyzeCJ4Opportunities(
		aircraft: Aircraft[],
		companies: Company[],
		leadScores: LeadScore[]
	): CJ4Alert[] {
		const cj4Aircraft = aircraft.filter(
			ac =>
				ac.model.toUpperCase().includes('CJ4') || ac.model.toUpperCase().includes('CITATION CJ4')
		);

		const alerts: CJ4Alert[] = [];

		for (const aircraft of cj4Aircraft) {
			// New CJ4 listing alert
			if (aircraft.forSale && this.isRecentlyListed(aircraft)) {
				alerts.push(this.createNewListingAlert(aircraft, companies, leadScores));
			}

			// Price change alert
			if (this.hasSignificantPriceChange(aircraft)) {
				alerts.push(this.createPriceChangeAlert(aircraft, companies, leadScores));
			}

			// High-value opportunity alert
			if (this.isHighValueOpportunity(aircraft)) {
				alerts.push(this.createMarketOpportunityAlert(aircraft, companies, leadScores));
			}
		}

		return alerts;
	}

	/**
	 * Generate comprehensive CJ4 market analysis
	 */
	generateCJ4MarketAnalysis(aircraft: Aircraft[], companies: Company[]): CJ4MarketAnalysis {
		const cj4Aircraft = aircraft.filter(
			ac =>
				ac.model.toUpperCase().includes('CJ4') || ac.model.toUpperCase().includes('CITATION CJ4')
		);

		const forSaleCJ4 = cj4Aircraft.filter(ac => ac.forSale);
		const prices = forSaleCJ4
			.map(ac => Number(ac.askingPrice))
			.filter(price => price !== null) as number[];

		const avgPrice =
			prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;

		const minPrice = Math.min(...prices);
		const maxPrice = Math.max(...prices);

		// Calculate market trend (simplified)
		const marketTrend = this.calculateMarketTrend(forSaleCJ4);

		// Calculate absorption rate (simplified)
		// const absorptionRate = this.calculateAbsorptionRate(forSaleCJ4);

		// Competitor analysis
		const competitorAnalysis = this.analyzeCompetitors(forSaleCJ4, companies);

		// Generate opportunities
		const opportunities = this.analyzeCJ4Opportunities(aircraft, companies, []);

		return {
			totalCJ4Listings: forSaleCJ4.length,
			avgPrice,
			priceRange: { min: minPrice, max: maxPrice },
			marketTrend,
			daysOnMarket: this.calculateAvgDaysOnMarket(forSaleCJ4),
			// absorptionRate,
			competitorAnalysis,
			opportunities,
		};
	}

	/**
	 * Subscribe to CJ4 alerts
	 */
	subscribe(callback: (alert: CJ4Alert) => void): () => void {
		this.subscribers.push(callback);
		return () => {
			const index = this.subscribers.indexOf(callback);
			if (index > -1) {
				this.subscribers.splice(index, 1);
			}
		};
	}

	/**
	 * Emit alert to all subscribers
	 */
	private emitAlert(alert: CJ4Alert): void {
		this.subscribers.forEach(callback => callback(alert));
	}

	/**
	 * Create new listing alert
	 */
	private createNewListingAlert(
		aircraft: Aircraft,
		companies: Company[],
		leadScores: LeadScore[]
	): CJ4Alert {
		const company = companies.find(c => c.companyId.toString() === aircraft.id.toString());
		const leadScore = leadScores.find(ls => ls.aircraftId === aircraft.id.toString());

		return {
			id: `new-listing-${aircraft.id.toString()}`,
			type: 'NEW_LISTING',
			priority: 'CRITICAL',
			aircraft,
			company,
			leadScore,
			message: `New CJ4 listing: ${aircraft.registration} - ${aircraft.make} ${aircraft.model}`,
			actionRequired: 'Immediate contact research and lead scoring',
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
		};
	}

	/**
	 * Create price change alert
	 */
	private createPriceChangeAlert(
		aircraft: Aircraft,
		companies: Company[],
		leadScores: LeadScore[]
	): CJ4Alert {
		const company = companies.find(c => c.companyId.toString() === aircraft.id.toString());
		const leadScore = leadScores.find(ls => ls.aircraftId === aircraft.id.toString());

		return {
			id: `price-change-${aircraft.id.toString()}`,
			type: 'PRICE_CHANGE',
			priority: 'HIGH',
			aircraft,
			company,
			leadScore,
			message: `Price change detected: ${aircraft.registration} - ${aircraft.make} ${aircraft.model}`,
			actionRequired: 'Review pricing strategy and update lead score',
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
		};
	}

	/**
	 * Create market opportunity alert
	 */
	private createMarketOpportunityAlert(
		aircraft: Aircraft,
		companies: Company[],
		leadScores: LeadScore[]
	): CJ4Alert {
		const company = companies.find(c => c.companyId.toString() === aircraft.id.toString());
		const leadScore = leadScores.find(ls => ls.aircraftId === aircraft.id.toString());

		return {
			id: `opportunity-${aircraft.id.toString()}`,
			type: 'MARKET_OPPORTUNITY',
			priority: 'HIGH',
			aircraft,
			company,
			leadScore,
			message: `High-value CJ4 opportunity: ${aircraft.registration} - ${aircraft.make} ${aircraft.model}`,
			actionRequired: 'Priority lead qualification and contact research',
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
		};
	}

	/**
	 * Check if aircraft was recently listed
	 */
	private isRecentlyListed(aircraft: Aircraft): boolean {
		if (!aircraft.dateListed) return false;
		const daysSinceListed = (Date.now() - aircraft.dateListed.getTime()) / (1000 * 60 * 60 * 24);
		return daysSinceListed <= 7; // Listed within last 7 days
	}

	/**
	 * Check if aircraft has significant price change
	 */
	private hasSignificantPriceChange(aircraft: Aircraft): boolean {
		// This would typically compare with historical data
		// For now, we'll use a simple heuristic
		return (
			aircraft.lastUpdated && Date.now() - aircraft.lastUpdated.getTime() < 24 * 60 * 60 * 1000
		); // Updated in last 24 hours
	}

	/**
	 * Check if aircraft is a high-value opportunity
	 */
	private isHighValueOpportunity(aircraft: Aircraft): boolean {
		if (!aircraft.askingPrice) return false;

		// High-value threshold for CJ4 (typically $8M+)
		const highValueThreshold = 8000000;
		return aircraft.askingPrice.toNumber() >= highValueThreshold;
	}

	/**
	 * Calculate market trend
	 */
	private calculateMarketTrend(aircraft: Aircraft[]): 'RISING' | 'FALLING' | 'STABLE' {
		// Simplified trend calculation
		// In a real implementation, this would analyze historical price data
		const avgPrice =
			aircraft
				.map(ac => ac.askingPrice)
				.filter(price => price !== null)
				.reduce((sum, price) => sum + price!.toNumber(), 0) / aircraft.length;
		console.log(`aircraft: ${aircraft}`);
		console.log(`avgPrice: ${avgPrice}`);
		// Placeholder logic - would need historical data for accurate trend
		return 'STABLE';
	}

	/**
	 * Calculate absorption rate
	 */
	// fix this
	// private calculateAbsorptionRate(aircraft: Aircraft[] | undefined): number {
	// 	// Simplified calculation
	// 	// In reality, this would be based on historical sales data
	// 	return 0.8; // 80% absorption rate
	// }

	/**
	 * Analyze competitors
	 */
	private analyzeCompetitors(
		aircraft: Aircraft[],
		companies: Company[]
	): { name: string; listings: number; avgPrice: number }[] {
		const competitorMap = new Map<string, { listings: number; totalPrice: number }>();

		aircraft.forEach(ac => {
			const company = companies.find(c => c.companyId.toString() === ac.aircraftId?.toString());
			if (company) {
				const existing = competitorMap.get(company.companyName) || { listings: 0, totalPrice: 0 };
				existing.listings++;
				if (ac.askingPrice) {
					existing.totalPrice += ac.askingPrice.toNumber();
				}
				competitorMap.set(company.companyName, existing);
			}
		});

		return Array.from(competitorMap.entries()).map(([name, data]) => ({
			name,
			listings: data.listings,
			avgPrice: data.listings > 0 ? data.totalPrice / data.listings : 0,
		}));
	}

	/**
	 * Calculate average days on market
	 */
	private calculateAvgDaysOnMarket(aircraft: Aircraft[]): number {
		const daysOnMarket = aircraft
			.map(ac => {
				if (!ac.dateListed) return 0;
				return (Date.now() - ac.dateListed.getTime()) / (1000 * 60 * 60 * 24);
			})
			.filter(days => days > 0);

		return daysOnMarket.length > 0
			? daysOnMarket.reduce((sum, days) => sum + days, 0) / daysOnMarket.length
			: 0;
	}
}

// Export singleton instance
export const cj4AlertSystem = new CJ4AlertSystem();
