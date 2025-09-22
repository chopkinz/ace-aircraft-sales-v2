import { prisma } from '@/lib/database';

// Helper functions for report generation
export function calculatePriceDistribution(aircraft: any[]) {
	const prices = aircraft.map(a => a.price).filter(p => p !== null);
	return {
		min: prices.length > 0 ? Math.min(...prices) : 0,
		max: prices.length > 0 ? Math.max(...prices) : 0,
		mean: prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0,
		median: calculateMedian(prices),
	};
}

export function calculateManufacturerDistribution(aircraft: any[]) {
	const manufacturers = aircraft.reduce(
		(acc, a) => {
			acc[a.manufacturer] = (acc[a.manufacturer] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);
	return manufacturers;
}

export function calculateYearDistribution(aircraft: any[]) {
	const years = aircraft.reduce(
		(acc, a) => {
			if (a.year) {
				acc[a.year] = (acc[a.year] || 0) + 1;
			}
			return acc;
		},
		{} as Record<number, number>
	);
	return years;
}

export function calculateLocationDistribution(aircraft: any[]) {
	const locations = aircraft.reduce(
		(acc, a) => {
			if (a.location) {
				acc[a.location] = (acc[a.location] || 0) + 1;
			}
			return acc;
		},
		{} as Record<string, number>
	);
	return locations;
}

export function calculateStatusDistribution(aircraft: any[]) {
	const statuses = aircraft.reduce(
		(acc, a) => {
			acc[a.status] = (acc[a.status] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>
	);
	return statuses;
}

export function calculateAveragePrice(aircraft: any[]) {
	const prices = aircraft.map(a => a.price).filter(p => p !== null);
	return prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0;
}

export function calculateMedianPrice(aircraft: any[]) {
	const prices = aircraft
		.map(a => a.price)
		.filter(p => p !== null)
		.sort((a, b) => a - b);
	return calculateMedian(prices);
}

export function calculatePriceRange(aircraft: any[]) {
	const prices = aircraft.map(a => a.price).filter(p => p !== null);
	return {
		min: prices.length > 0 ? Math.min(...prices) : 0,
		max: prices.length > 0 ? Math.max(...prices) : 0,
		range: prices.length > 0 ? Math.max(...prices) - Math.min(...prices) : 0,
	};
}

export function calculateMedian(values: number[]) {
	if (values.length === 0) return 0;
	const sorted = values.sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Grouping functions
export function groupByManufacturer(aircraft: any[]) {
	return aircraft.reduce(
		(acc, a) => {
			if (!acc[a.manufacturer]) acc[a.manufacturer] = [];
			acc[a.manufacturer].push(a);
			return acc;
		},
		{} as Record<string, any[]>
	);
}

export function groupByYear(aircraft: any[]) {
	return aircraft.reduce(
		(acc, a) => {
			if (a.year) {
				if (!acc[a.year]) acc[a.year] = [];
				acc[a.year].push(a);
			}
			return acc;
		},
		{} as Record<number, any[]>
	);
}

export function groupByLocation(aircraft: any[]) {
	return aircraft.reduce(
		(acc, a) => {
			if (a.location) {
				if (!acc[a.location]) acc[a.location] = [];
				acc[a.location].push(a);
			}
			return acc;
		},
		{} as Record<string, any[]>
	);
}

export function groupByStatus(aircraft: any[]) {
	return aircraft.reduce(
		(acc, a) => {
			if (!acc[a.status]) acc[a.status] = [];
			acc[a.status].push(a);
			return acc;
		},
		{} as Record<string, any[]>
	);
}

export function groupByPriceRange(aircraft: any[]) {
	const ranges = {
		'Under $1M': aircraft.filter(a => (a.price || 0) < 1000000),
		'$1M - $5M': aircraft.filter(a => (a.price || 0) >= 1000000 && (a.price || 0) < 5000000),
		'$5M - $10M': aircraft.filter(a => (a.price || 0) >= 5000000 && (a.price || 0) < 10000000),
		'$10M - $25M': aircraft.filter(a => (a.price || 0) >= 10000000 && (a.price || 0) < 25000000),
		'$25M+': aircraft.filter(a => (a.price || 0) >= 25000000),
	};
	return ranges;
}

export function groupContactsByCompany(contacts: any[]) {
	return contacts.reduce(
		(acc, c) => {
			const company = c.companyRelation?.companyName || 'Unknown';
			if (!acc[company]) acc[company] = [];
			acc[company].push(c);
			return acc;
		},
		{} as Record<string, any[]>
	);
}

export function groupContactsByStatus(contacts: any[]) {
	return contacts.reduce(
		(acc, c) => {
			const status = c.status || 'Unknown';
			if (!acc[status]) acc[status] = [];
			acc[status].push(c);
			return acc;
		},
		{} as Record<string, any[]>
	);
}

export function groupContactsByLocation(contacts: any[]) {
	return contacts.reduce(
		(acc, c) => {
			const location = c.companyRelation?.city || 'Unknown';
			if (!acc[location]) acc[location] = [];
			acc[location].push(c);
			return acc;
		},
		{} as Record<string, any[]>
	);
}

// Async analysis functions
export async function analyzeEnrichedData(aircraft: any[]) {
	const enrichedCount = aircraft.filter(
		a => a.features || a.marketData || a.maintenanceData
	).length;
	return {
		totalEnriched: enrichedCount,
		enrichmentRate: aircraft.length > 0 ? (enrichedCount / aircraft.length) * 100 : 0,
		featuresData: aircraft.filter(a => a.features).length,
		marketData: aircraft.filter(a => a.marketData).length,
		maintenanceData: aircraft.filter(a => a.maintenanceData).length,
		contactData: aircraft.filter(a => a.contactInfo).length,
		ownershipData: aircraft.filter(a => a.ownershipData).length,
	};
}

export async function analyzeEnrichedFeatures(aircraft: any[]) {
	const featuresAnalysis = {
		totalWithFeatures: aircraft.filter(a => a.features).length,
		featureTypes: {} as Record<string, number>,
		equipmentTypes: {} as Record<string, number>,
	};

	aircraft.forEach(aircraft => {
		if (aircraft.features) {
			try {
				const features = JSON.parse(aircraft.features);
				if (features.features) {
					features.features.forEach((feature: string) => {
						featuresAnalysis.featureTypes[feature] =
							(featuresAnalysis.featureTypes[feature] || 0) + 1;
					});
				}
				if (features.additionalEquipment) {
					features.additionalEquipment.forEach((equipment: string) => {
						featuresAnalysis.equipmentTypes[equipment] =
							(featuresAnalysis.equipmentTypes[equipment] || 0) + 1;
					});
				}
			} catch (e) {
				// Skip invalid JSON
			}
		}
	});

	return featuresAnalysis;
}

export async function analyzeMaintenanceStatus(aircraft: any[]) {
	const maintenanceAnalysis = {
		totalWithMaintenance: aircraft.filter(a => a.maintenanceData).length,
		maintenanceDue: 0,
		maintenanceCurrent: 0,
		maintenanceOverdue: 0,
	};

	aircraft.forEach(aircraft => {
		if (aircraft.maintenanceData) {
			try {
				const maintenance = JSON.parse(aircraft.maintenanceData);
				if (maintenance.maintenanceMetrics?.nextDueDays) {
					const days = maintenance.maintenanceMetrics.nextDueDays;
					if (days > 90) maintenanceAnalysis.maintenanceCurrent++;
					else if (days > 30) maintenanceAnalysis.maintenanceDue++;
					else maintenanceAnalysis.maintenanceOverdue++;
				}
			} catch (e) {
				// Skip invalid JSON
			}
		}
	});

	return maintenanceAnalysis;
}

export async function analyzeTechnicalSpecifications(aircraft: any[]) {
	const techAnalysis = {
		totalWithSpecs: aircraft.filter(a => a.specifications).length,
		engineTypes: {} as Record<string, number>,
		avionicsSuites: {} as Record<string, number>,
	};

	aircraft.forEach(aircraft => {
		if (aircraft.specifications) {
			try {
				const specs = JSON.parse(aircraft.specifications);
				if (specs.avionics) {
					techAnalysis.avionicsSuites[specs.avionics] =
						(techAnalysis.avionicsSuites[specs.avionics] || 0) + 1;
				}
			} catch (e) {
				// Skip invalid JSON
			}
		}
	});

	return techAnalysis;
}

export async function calculateSalesByMonth(aircraft: any[]) {
	const salesByMonth = {} as Record<string, number>;
	aircraft.forEach(aircraft => {
		const month = aircraft.createdAt.toISOString().substring(0, 7);
		salesByMonth[month] = (salesByMonth[month] || 0) + (aircraft.price || 0);
	});
	return salesByMonth;
}

export async function calculateSalesByManufacturer(aircraft: any[]) {
	const salesByManufacturer = {} as Record<string, number>;
	aircraft.forEach(aircraft => {
		salesByManufacturer[aircraft.manufacturer] =
			(salesByManufacturer[aircraft.manufacturer] || 0) + (aircraft.price || 0);
	});
	return salesByManufacturer;
}

export async function calculateSalesByLocation(aircraft: any[]) {
	const salesByLocation = {} as Record<string, number>;
	aircraft.forEach(aircraft => {
		if (aircraft.location) {
			salesByLocation[aircraft.location] =
				(salesByLocation[aircraft.location] || 0) + (aircraft.price || 0);
		}
	});
	return salesByLocation;
}

export async function calculatePriceTrends(aircraft: any[]) {
	return {
		averagePrice: calculateAveragePrice(aircraft),
		priceVolatility: 0.15, // Mock volatility
		trendDirection: 'stable',
	};
}

export async function calculateMarketShare(aircraft: any[]) {
	const totalValue = aircraft.reduce((sum, a) => sum + (a.price || 0), 0);
	const marketShare = {} as Record<string, number>;
	aircraft.forEach(aircraft => {
		marketShare[aircraft.manufacturer] =
			(marketShare[aircraft.manufacturer] || 0) + (aircraft.price || 0);
	});

	// Convert to percentages
	Object.keys(marketShare).forEach(manufacturer => {
		marketShare[manufacturer] = totalValue > 0 ? (marketShare[manufacturer] / totalValue) * 100 : 0;
	});

	return marketShare;
}

export async function analyzeContactEngagement(contacts: any[]) {
	const engagement = {
		totalContacts: contacts.length,
		recentContacts: contacts.filter(c => {
			const lastContact = c.lastContact ? new Date(c.lastContact) : null;
			return lastContact && lastContact > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		}).length,
		activeContacts: contacts.filter(c => c.status === 'ACTIVE').length,
	};
	return engagement;
}

export async function analyzeMarketPosition(aircraft: any[]) {
	const marketPosition = {
		totalOpportunities: aircraft.length,
		highValue: aircraft.filter(a => (a.price || 0) > 10000000).length,
		midValue: aircraft.filter(a => (a.price || 0) >= 5000000 && (a.price || 0) <= 10000000).length,
		lowValue: aircraft.filter(a => (a.price || 0) < 5000000).length,
	};
	return marketPosition;
}

export async function analyzeCompetition(aircraft: any[]) {
	const competition = {
		exclusiveListings: aircraft.filter(a => {
			try {
				const marketData = JSON.parse(a.marketData || '{}');
				return marketData.marketAnalysis?.exclusivity === 'exclusive';
			} catch (e) {
				return false;
			}
		}).length,
		competitiveListings: aircraft.filter(a => {
			try {
				const marketData = JSON.parse(a.marketData || '{}');
				return marketData.marketAnalysis?.exclusivity !== 'exclusive';
			} catch (e) {
				return true;
			}
		}).length,
	};
	return competition;
}

export async function analyzeDataCompleteness(aircraft: any[]) {
	const completeness = {
		totalAircraft: aircraft.length,
		withFeatures: aircraft.filter(a => a.features).length,
		withMarketData: aircraft.filter(a => a.marketData).length,
		withMaintenanceData: aircraft.filter(a => a.maintenanceData).length,
		withContactData: aircraft.filter(a => a.contactInfo).length,
		withOwnershipData: aircraft.filter(a => a.ownershipData).length,
		withSpecifications: aircraft.filter(a => a.specifications).length,
	};

	// Calculate completeness percentages
	Object.keys(completeness).forEach(key => {
		if (key !== 'totalAircraft') {
			completeness[key + 'Percentage'] =
				aircraft.length > 0 ? (completeness[key] / completeness.totalAircraft) * 100 : 0;
		}
	});

	return completeness;
}

export async function analyzeMaintenanceData(aircraft: any[]) {
	const maintenanceAnalysis = {
		totalWithMaintenance: aircraft.filter(a => a.maintenanceData).length,
		maintenanceDue: 0,
		maintenanceCurrent: 0,
		maintenanceOverdue: 0,
		maintenanceHistory: 0,
	};

	aircraft.forEach(aircraft => {
		if (aircraft.maintenanceData) {
			try {
				const maintenance = JSON.parse(aircraft.maintenanceData);
				if (maintenance.maintenanceMetrics?.nextDueDays) {
					const days = maintenance.maintenanceMetrics.nextDueDays;
					if (days > 90) maintenanceAnalysis.maintenanceCurrent++;
					else if (days > 30) maintenanceAnalysis.maintenanceDue++;
					else maintenanceAnalysis.maintenanceOverdue++;
				}
				if (maintenance.maintenanceMetrics?.maintenanceHistory) {
					maintenanceAnalysis.maintenanceHistory++;
				}
			} catch (e) {
				// Skip invalid JSON
			}
		}
	});

	return maintenanceAnalysis;
}

export async function analyzeMarketData(aircraft: any[]) {
	const marketAnalysis = {
		totalWithMarketData: aircraft.filter(a => a.marketData).length,
		marketPositions: {} as Record<string, number>,
		exclusivity: {} as Record<string, number>,
		leaseStatus: {} as Record<string, number>,
	};

	aircraft.forEach(aircraft => {
		if (aircraft.marketData) {
			try {
				const marketData = JSON.parse(aircraft.marketData);
				if (marketData.marketAnalysis?.marketPosition) {
					const position = marketData.marketAnalysis.marketPosition;
					marketAnalysis.marketPositions[position] =
						(marketAnalysis.marketPositions[position] || 0) + 1;
				}
				if (marketData.marketAnalysis?.exclusivity) {
					const exclusivity = marketData.marketAnalysis.exclusivity;
					marketAnalysis.exclusivity[exclusivity] =
						(marketAnalysis.exclusivity[exclusivity] || 0) + 1;
				}
				if (marketData.marketAnalysis?.leaseStatus) {
					const leaseStatus = marketData.marketAnalysis.leaseStatus;
					marketAnalysis.leaseStatus[leaseStatus] =
						(marketAnalysis.leaseStatus[leaseStatus] || 0) + 1;
				}
			} catch (e) {
				// Skip invalid JSON
			}
		}
	});

	return marketAnalysis;
}

export async function analyzeContactData(aircraft: any[]) {
	const contactAnalysis = {
		totalWithContactData: aircraft.filter(a => a.contactInfo).length,
		companies: 0,
		contacts: 0,
	};

	aircraft.forEach(aircraft => {
		if (aircraft.contactInfo) {
			try {
				const contactInfo = JSON.parse(aircraft.contactInfo);
				if (contactInfo.companies) {
					contactAnalysis.companies += contactInfo.companies.length;
				}
				if (contactInfo.contacts) {
					contactAnalysis.contacts += contactInfo.contacts.length;
				}
			} catch (e) {
				// Skip invalid JSON
			}
		}
	});

	return contactAnalysis;
}

export async function analyzeOwnershipData(aircraft: any[]) {
	const ownershipAnalysis = {
		totalWithOwnershipData: aircraft.filter(a => a.ownershipData).length,
		currentOwners: 0,
		previousOwners: 0,
		registrationHistory: 0,
	};

	aircraft.forEach(aircraft => {
		if (aircraft.ownershipData) {
			try {
				const ownershipData = JSON.parse(aircraft.ownershipData);
				if (ownershipData.currentOwner) {
					ownershipAnalysis.currentOwners++;
				}
				if (ownershipData.previousOwners) {
					ownershipAnalysis.previousOwners += ownershipData.previousOwners.length;
				}
				if (ownershipData.registrationHistory) {
					ownershipAnalysis.registrationHistory += ownershipData.registrationHistory.length;
				}
			} catch (e) {
				// Skip invalid JSON
			}
		}
	});

	return ownershipAnalysis;
}

export async function analyzeDataQuality(aircraft: any[]) {
	const qualityAnalysis = {
		totalAircraft: aircraft.length,
		completeRecords: 0,
		partialRecords: 0,
		incompleteRecords: 0,
		dataQualityScore: 0,
	};

	aircraft.forEach(aircraft => {
		let completenessScore = 0;
		const fields = [
			'manufacturer',
			'model',
			'year',
			'price',
			'location',
			'status',
			'registration',
			'serialNumber',
		];
		const enrichedFields = [
			'features',
			'marketData',
			'maintenanceData',
			'contactInfo',
			'ownershipData',
			'specifications',
		];

		// Check basic fields
		fields.forEach(field => {
			if (aircraft[field] && aircraft[field] !== '') {
				completenessScore += 1;
			}
		});

		// Check enriched fields
		enrichedFields.forEach(field => {
			if (aircraft[field] && aircraft[field] !== '') {
				completenessScore += 1;
			}
		});

		const totalFields = fields.length + enrichedFields.length;
		const completenessPercentage = (completenessScore / totalFields) * 100;

		if (completenessPercentage >= 80) {
			qualityAnalysis.completeRecords++;
		} else if (completenessPercentage >= 50) {
			qualityAnalysis.partialRecords++;
		} else {
			qualityAnalysis.incompleteRecords++;
		}

		qualityAnalysis.dataQualityScore += completenessPercentage;
	});

	qualityAnalysis.dataQualityScore =
		aircraft.length > 0 ? qualityAnalysis.dataQualityScore / aircraft.length : 0;

	return qualityAnalysis;
}

export async function analyzeEndpointCoverage(aircraft: any[]) {
	const endpointCoverage = {
		totalAircraft: aircraft.length,
		statusEndpoint: 0,
		airframeEndpoint: 0,
		enginesEndpoint: 0,
		apuEndpoint: 0,
		avionicsEndpoint: 0,
		featuresEndpoint: 0,
		additionalEquipmentEndpoint: 0,
		interiorEndpoint: 0,
		exteriorEndpoint: 0,
		maintenanceEndpoint: 0,
		relationshipsEndpoint: 0,
	};

	aircraft.forEach(aircraft => {
		if (aircraft.marketData) {
			try {
				const marketData = JSON.parse(aircraft.marketData);
				if (marketData.status) endpointCoverage.statusEndpoint++;
				if (marketData.airframe) endpointCoverage.airframeEndpoint++;
			} catch (e) {
				// Skip invalid JSON
			}
		}

		if (aircraft.features) {
			try {
				const features = JSON.parse(aircraft.features);
				if (features.engines) endpointCoverage.enginesEndpoint++;
				if (features.apu) endpointCoverage.apuEndpoint++;
				if (features.avionics) endpointCoverage.avionicsEndpoint++;
				if (features.features) endpointCoverage.featuresEndpoint++;
				if (features.additionalEquipment) endpointCoverage.additionalEquipmentEndpoint++;
				if (features.interior) endpointCoverage.interiorEndpoint++;
				if (features.exterior) endpointCoverage.exteriorEndpoint++;
			} catch (e) {
				// Skip invalid JSON
			}
		}

		if (aircraft.maintenanceData) {
			try {
				const maintenanceData = JSON.parse(aircraft.maintenanceData);
				if (maintenanceData.maintenance) endpointCoverage.maintenanceEndpoint++;
			} catch (e) {
				// Skip invalid JSON
			}
		}

		if (aircraft.contactInfo) {
			try {
				const contactInfo = JSON.parse(aircraft.contactInfo);
				if (contactInfo.relationships) endpointCoverage.relationshipsEndpoint++;
			} catch (e) {
				// Skip invalid JSON
			}
		}
	});

	return endpointCoverage;
}
