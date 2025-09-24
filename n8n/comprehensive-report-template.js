// SUPER AMAZING COMPREHENSIVE AIRCRAFT MARKET REPORT GENERATOR
// This creates detailed, clean, and professional reports with advanced analytics

const generateComprehensiveReport = (wf, enriched, dbSync) => {
	// Utility functions
	const num = v => (v == null ? null : Number(v));
	const formatCurrency = amount => (amount ? `$${Math.round(amount).toLocaleString()}` : 'N/A');
	const formatPercent = (value, total) =>
		total > 0 ? `${Math.round((value / total) * 100)}%` : '0%';
	const formatDuration = ms => {
		const seconds = Math.round(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
		if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
		return `${seconds}s`;
	};

	// Data processing
	const withPrice = enriched.filter(a => Number.isFinite(num(a.price)));
	const withImages = enriched.filter(a => a.techSummary?.imageCount > 0);
	const withAvionics = enriched.filter(a => a.techSummary?.avionicsSuite);
	const withMaintenance = enriched.filter(a => a.enrichment?.maintenance);
	const forSale = enriched.filter(a => a.forsale);
	const recentListings = enriched.filter(a => {
		const listDate = new Date(a.listDate);
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		return listDate > thirtyDaysAgo;
	});

	// Price analysis
	const prices = withPrice.map(a => num(a.price));
	const avgPrice = prices.length ? prices.reduce((s, a) => s + a, 0) / prices.length : 0;
	const medianPrice = prices.length
		? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
		: 0;
	const priceRange = prices.length
		? {
				min: Math.min(...prices),
				max: Math.max(...prices),
				q1: prices.sort((a, b) => a - b)[Math.floor(prices.length * 0.25)],
				q3: prices.sort((a, b) => a - b)[Math.floor(prices.length * 0.75)],
		  }
		: { min: 0, max: 0, q1: 0, q3: 0 };

	// Year analysis
	const years = enriched.map(a => a.year).filter(y => y && y > 1900 && y < 3000);
	const avgYear = years.length ? years.reduce((s, y) => s + y, 0) / years.length : 0;
	const yearRange = years.length
		? { min: Math.min(...years), max: Math.max(...years) }
		: { min: 0, max: 0 };

	// Engine analysis
	const engineCounts = enriched.map(a => a.techSummary?.engines || 0);
	const avgEngines = engineCounts.length
		? engineCounts.reduce((s, n) => s + n, 0) / engineCounts.length
		: 0;
	const engineDistribution = engineCounts.reduce((acc, count) => {
		acc[count] = (acc[count] || 0) + 1;
		return acc;
	}, {});

	// Maintenance analysis
	const maintenanceDue = withMaintenance.filter(a => {
		const days = a.enrichment.maintenance?.nextDueDays;
		return Number.isFinite(days) && days <= 90;
	}).length;

	const maintenanceOverdue = withMaintenance.filter(a => {
		const days = a.enrichment.maintenance?.nextDueDays;
		return Number.isFinite(days) && days <= 0;
	}).length;

	// Location analysis
	const locations = enriched.reduce((acc, a) => {
		const location = a.location || a.baseCity || 'Unknown';
		acc[location] = (acc[location] || 0) + 1;
		return acc;
	}, {});

	// Helper functions
	const countBy = keyFn =>
		enriched.reduce((acc, a) => {
			const k = keyFn(a) || 'Unknown';
			acc[k] = (acc[k] || 0) + 1;
			return acc;
		}, {});

	const topFrom = (obj, n = 10) =>
		Object.entries(obj)
			.sort((a, b) => b[1] - a[1])
			.slice(0, n)
			.map(([key, count]) => ({
				name: key,
				count,
				percentage: formatPercent(count, enriched.length),
			}));

	// Generate comprehensive market analysis
	const marketAnalysis = {
		overview: {
			totalAircraft: enriched.length,
			forSaleCount: forSale.length,
			forSalePercentage: formatPercent(forSale.length, enriched.length),
			recentListings: recentListings.length,
			averageAge: avgYear ? Math.round(2025 - avgYear) : 'N/A',
		},
		pricing: {
			averagePrice: formatCurrency(avgPrice),
			medianPrice: formatCurrency(medianPrice),
			priceRange: `${formatCurrency(priceRange.min)} - ${formatCurrency(priceRange.max)}`,
			quartile1: formatCurrency(priceRange.q1),
			quartile3: formatCurrency(priceRange.q3),
			priceDistribution: {
				under1M: prices.filter(p => p < 1000000).length,
				oneToFiveM: prices.filter(p => p >= 1000000 && p < 5000000).length,
				fiveToTenM: prices.filter(p => p >= 5000000 && p < 10000000).length,
				over10M: prices.filter(p => p >= 10000000).length,
			},
		},
		technical: {
			averageEngines: Math.round(avgEngines * 10) / 10,
			engineDistribution: Object.entries(engineDistribution).map(([engines, count]) => ({
				engines: parseInt(engines),
				count,
				percentage: formatPercent(count, enriched.length),
			})),
			yearRange: `${yearRange.min} - ${yearRange.max}`,
			averageYear: Math.round(avgYear),
		},
		maintenance: {
			totalWithMaintenance: withMaintenance.length,
			maintenancePercentage: formatPercent(withMaintenance.length, enriched.length),
			dueIn90Days: maintenanceDue,
			overdue: maintenanceOverdue,
			maintenanceHealth: formatPercent(enriched.length - maintenanceOverdue, enriched.length),
		},
		dataQuality: {
			withPricing: withPrice.length,
			pricingPercentage: formatPercent(withPrice.length, enriched.length),
			withImages: withImages.length,
			imagePercentage: formatPercent(withImages.length, enriched.length),
			withAvionics: withAvionics.length,
			avionicsPercentage: formatPercent(withAvionics.length, enriched.length),
		},
		topPerformers: {
			topMakes: topFrom(
				countBy(a => a.make),
				10
			),
			topModels: topFrom(
				countBy(a => a.model),
				10
			),
			topAvionics: topFrom(
				enriched.reduce((m, a) => {
					const k = (a.techSummary?.avionicsSuite || 'Unknown').toString();
					m[k] = (m[k] || 0) + 1;
					return m;
				}, {}),
				5
			),
			topLocations: topFrom(locations, 10),
		},
	};

	// Generate performance metrics
	const performanceMetrics = {
		workflow: {
			duration: formatDuration(Date.now() - wf.metrics.startTime),
			stepsCompleted: wf.metrics.completedSteps,
			totalSteps: wf.steps.length,
			successRate: formatPercent(wf.metrics.completedSteps, wf.steps.length),
			errorCount: wf.errors.length,
			errorRate: formatPercent(wf.errors.length, wf.steps.length),
		},
		processing: {
			aircraftProcessed: enriched.length,
			databaseRecordsCreated: dbSync.created,
			databaseRecordsUpdated: dbSync.updated,
			databaseErrors: dbSync.errors,
			processingEfficiency: formatPercent(enriched.length - dbSync.errors, enriched.length),
		},
		dataQuality: {
			completenessScore: Math.round(
				((withPrice.length / enriched.length) * 0.3 +
					(withAvionics.length / enriched.length) * 0.3 +
					(withMaintenance.length / enriched.length) * 0.2 +
					(withImages.length / enriched.length) * 0.2) *
					100
			),
			enrichmentSuccess: formatPercent(
				enriched.filter(a => a.enrichment && Object.keys(a.enrichment).length > 0).length,
				enriched.length
			),
		},
	};

	// Generate executive summary
	const executiveSummary = {
		timestamp: new Date().toISOString(),
		workflowId: wf.workflowId,
		status: wf.errors.length === 0 ? 'SUCCESS' : 'COMPLETED_WITH_WARNINGS',
		summary: {
			totalAircraftProcessed: enriched.length,
			marketStatus: `${forSale.length} aircraft currently for sale (${formatPercent(
				forSale.length,
				enriched.length
			)})`,
			averagePrice: formatCurrency(avgPrice),
			priceRange: `${formatCurrency(priceRange.min)} - ${formatCurrency(priceRange.max)}`,
			topMake: marketAnalysis.topPerformers.topMakes[0]?.name || 'N/A',
			topModel: marketAnalysis.topPerformers.topModels[0]?.name || 'N/A',
			commonAvionics: marketAnalysis.topPerformers.topAvionics[0]?.name || 'N/A',
			maintenanceDue90Days: maintenanceDue,
			dataQualityScore: `${performanceMetrics.dataQuality.completenessScore}%`,
			processingTime: performanceMetrics.workflow.duration,
		},
		recommendations: [
			`Focus on ${
				marketAnalysis.topPerformers.topMakes[0]?.name || 'top'
			} aircraft for highest market demand`,
			`${maintenanceDue} aircraft require maintenance within 90 days - prioritize inspections`,
			`Average market price of ${formatCurrency(avgPrice)} suggests ${
				avgPrice > 5000000 ? 'premium' : 'mid-market'
			} segment`,
			`Data quality at ${performanceMetrics.dataQuality.completenessScore}% - ${
				performanceMetrics.dataQuality.completenessScore > 80 ? 'excellent' : 'needs improvement'
			}`,
		],
	};

	return {
		marketAnalysis,
		performanceMetrics,
		executiveSummary,
		rawData: {
			totalAircraft: enriched.length,
			processingTime: Date.now() - wf.metrics.startTime,
			errors: wf.errors,
			steps: wf.steps,
		},
	};
};

// Export for use in n8n
if (typeof module !== 'undefined' && module.exports) {
	module.exports = generateComprehensiveReport;
}
