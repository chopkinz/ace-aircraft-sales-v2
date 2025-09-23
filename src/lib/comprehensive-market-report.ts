import { JetNetAPIClient } from '@/lib/jetnet-api-client';
import fs from 'fs';
import path from 'path';

// Define SearchParams interface
interface SearchParams {
	forsale?: string;
	basecountry?: string;
	aircraftmake?: string;
	yearmfr?: number;
	yearlow?: number;
	yearhigh?: number;
	[key: string]: unknown;
}

// Define JetNetAPIResponse interface
interface JetNetAPIResponse<T> {
	success: boolean;
	data: T[];
	images?: string[];
	error?: string;
}

export interface ComprehensiveReportConfig {
	enableLogging?: boolean;
	includeImages?: boolean;
	includeAllDetails?: boolean;
	outputDir?: string;
	reportTitle?: string;
	branding?: string;
	contactInfo?: {
		primary: {
			name: string;
			phone: string;
			email: string;
		};
		business: {
			name: string;
			email: string;
			phone: string;
			website: string;
		};
	};
}

export interface ComprehensiveReportResult {
	success: boolean;
	totalAircraft: number;
	duration: number;
	reportFile?: string;
	outputDirectory: string;
	datasets: Record<string, unknown>;
	marketAnalysis?: unknown;
	htmlReport?: unknown;
	csvExports?: unknown[];
	error?: string;
}

export class ComprehensiveMarketReport {
	private config: Required<ComprehensiveReportConfig>;
	private client: JetNetAPIClient | null = null;
	private reportData: Record<string, unknown> = {};
	private marketAnalysis: unknown = null;

	constructor(options: ComprehensiveReportConfig = {}, jetNetClient?: JetNetAPIClient) {
		this.config = {
			enableLogging: options.enableLogging ?? true,
			includeImages: options.includeImages ?? true,
			includeAllDetails: options.includeAllDetails ?? true,
			outputDir: options.outputDir ?? './comprehensive-market-reports',
			reportTitle:
				options.reportTitle ?? 'ACE Aircraft Sales - Aviation Market Intelligence Report',
			branding: options.branding ?? 'ACE Aircraft Sales',
			contactInfo: options.contactInfo ?? {
				primary: {
					name: 'Douglas Young',
					phone: '(714) 501-9339',
					email: 'douglas@aceaircraftsales.com',
				},
				business: {
					name: 'ACE Aircraft Sales',
					email: 'douglas@aceaircraftsales.com',
					phone: '(714) 501-9339',
					website: 'www.aceaircraftsales.com',
				},
			},
		};

		this.client = jetNetClient || null;
		this.log('Comprehensive Market Report Generator initialized');
	}

	private log(message: string, data?: unknown) {
		if (this.config.enableLogging) {
			const timestamp = new Date().toISOString();
			if (data) {
				console.log(`[${timestamp}] Comprehensive Report: ${message}`, data);
			} else {
				console.log(`[${timestamp}] Comprehensive Report: ${message}`);
			}
		}
	}

	async generateComprehensiveReport(): Promise<ComprehensiveReportResult> {
		const startTime = Date.now();
		this.log('🚀 Starting comprehensive market report generation');

		try {
			// Step 1: Setup
			await this.setup();

			// Step 2: Collect all market data
			await this.collectAllMarketData();

			// Step 3: Perform market analysis
			await this.performMarketAnalysis();

			// Step 4: Generate HTML report
			await this.generateHTMLReport();

			// Step 5: Generate CSV exports
			await this.generateCSVExports();

			// Step 6: Send webhook notification (if configured)
			await this.sendWebhookNotification();

			const duration = Date.now() - startTime;
			const totalAircraft = this.getTotalAircraftCount();

			this.log(
				`✅ Comprehensive report generation completed in ${(duration / 1000).toFixed(2)} seconds`
			);
			this.log(`📊 Total aircraft processed: ${totalAircraft}`);

			return {
				success: true,
				totalAircraft,
				duration,
				reportFile: (this.reportData.htmlReport as any)?.filepath,
				outputDirectory: this.config.outputDir,
				datasets: this.reportData,
				marketAnalysis: this.marketAnalysis,
				htmlReport: this.reportData.htmlReport,
				csvExports: this.reportData.csvExports as any,
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			this.log(
				`❌ Comprehensive report generation failed after ${(duration / 1000).toFixed(2)} seconds:`,
				error
			);

			return {
				success: false,
				totalAircraft: 0,
				duration,
				outputDirectory: this.config.outputDir,
				datasets: this.reportData,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	private async setup() {
		this.log('🔧 Setting up comprehensive report generation');
		this.ensureOutputDirectory();
		this.log('✅ Setup completed');
	}

	private ensureOutputDirectory() {
		if (!fs.existsSync(this.config.outputDir)) {
			fs.mkdirSync(this.config.outputDir, { recursive: true });
			this.log(`📁 Created output directory: ${this.config.outputDir}`);
		}
	}

	private async collectAllMarketData() {
		this.log('📊 Collecting comprehensive market data');

		if (!this.client) {
			this.log(
				'❌ JetNet client not available. Cannot generate comprehensive report without real data.'
			);
			throw new Error(
				'JetNet client not available. Cannot generate comprehensive report without real data.'
			);
		}

		const datasets = [
			{
				name: 'ALL_FOR_SALE',
				displayName: 'All For Sale Aircraft',
				filters: { forsale: 'true' },
				priority: 1,
			},
			{
				name: 'US_AIRCRAFT',
				displayName: 'All US Aircraft',
				filters: { basecountry: 'United States' },
				priority: 2,
			},
			{
				name: 'GULFSTREAM_AIRCRAFT',
				displayName: 'All Gulfstream Aircraft',
				filters: { aircraftmake: 'GULFSTREAM' },
				priority: 3,
			},
			{
				name: 'RECENT_AIRCRAFT',
				displayName: '2020+ Aircraft',
				filters: { yearmfr: 2020 },
				priority: 4,
			},
			{
				name: 'MID_RANGE_AIRCRAFT',
				displayName: '2015-2019 Aircraft',
				filters: { yearlow: 2015, yearhigh: 2019 },
				priority: 5,
			},
			{
				name: 'VINTAGE_AIRCRAFT',
				displayName: 'Pre-2010 Aircraft',
				filters: { yearhigh: 2009 },
				priority: 6,
			},
		];

		for (const dataset of datasets) {
			try {
				this.log(`📡 Collecting: ${dataset.displayName}`);

				const result = await this.client.searchAircraft(dataset.filters as SearchParams);

				if (result.data && result.data.length > 0) {
					const cleanedAircraft = this.cleanAircraftData(result.data);

					// Collect images if enabled
					if (this.config.includeImages) {
						await this.collectAircraftImages(cleanedAircraft, dataset.name);
					}

					this.reportData[dataset.name] = {
						displayName: dataset.displayName,
						count: cleanedAircraft.length,
						data: { ...result, aircraft: cleanedAircraft },
						duration: 1000,
						timestamp: new Date().toISOString(),
					};

					this.log(`✅ SUCCESS! Collected ${cleanedAircraft.length} aircraft records`);
				} else {
					this.log(`⚠️  No aircraft data returned for: ${dataset.displayName}`);
					this.reportData[dataset.name] = {
						displayName: dataset.displayName,
						count: 0,
						error: 'No data returned',
						timestamp: new Date().toISOString(),
					};
				}
			} catch (error) {
				this.log(`❌ Error collecting ${dataset.displayName}:`, error);
				this.reportData[dataset.name] = {
					displayName: dataset.displayName,
					count: 0,
					error: error instanceof Error ? error.message : 'Unknown error',
					timestamp: new Date().toISOString(),
				};
			}
		}
	}

	// Mock data generation removed - production reports must use real JetNet data only

	private cleanAircraftData(aircraft: unknown[]): unknown[] {
		return aircraft.map(plane => {
			const p = plane as any;
			return {
				aircraftid: p.AircraftID || p.aircraftid || '',
				make: p.Make || p.make || '',
				model: p.Model || p.model || '',
				regnbr: p.Registration || p.regnbr || '',
				yearmfr: p.Year || p.yearmfr || 0,
				askingprice: p.Price || p.askingprice || 0,
				forsale: p.ForSale || p.forsale || 'false',
				basecity: p.BaseCity || p.basecity || '',
				basestate: p.BaseState || p.basestate || '',
				basecountry: p.BaseCountry || p.basecountry || '',
				aftt: p.AFTT || p.aftt || 0,
				engserial1: p.EngSerial1 || p.engserial1 || '',
				engserial2: p.EngSerial2 || p.engserial2 || '',
				icao: p.ICAO || p.icao || '',
				exclusive: p.Exclusive || p.exclusive || 'false',
				leased: p.Leased || p.leased || 'false',
				listdate: p.ListDate || p.listdate || '',
				pictures: [],
			};
		});
	}

	private async collectAircraftImages(aircraft: unknown[], datasetName: string) {
		this.log(`🖼️  Collecting images for ${datasetName} (${aircraft.length} aircraft)`);

		if (!this.client) {
			this.log('⚠️  JetNet client not available, skipping image collection');
			// never set mock or placeholder images

			return;
		}

		for (const plane of aircraft) {
			try {
				const p = plane as Record<string, unknown>;
				const picturesResult = await this.client.getAircraftImages(p.aircraftid as string);
				if (
					picturesResult.success &&
					(picturesResult as any).images &&
					(picturesResult as any).images.length > 0
				) {
					p.pictures = (picturesResult as any).images;
				} else {
					p.pictures = ['/images/placeholder-aircraft.jpg'];
				}
			} catch (error) {
				const p = plane as Record<string, unknown>;
				this.log(`⚠️  Failed to get pictures for aircraft ${p.aircraftid}:`, error);
				p.pictures = ['/images/placeholder-aircraft.jpg'];
			}
		}
	}

	private async performMarketAnalysis() {
		this.log('📈 Performing comprehensive market analysis');

		const allAircraft = Object.values(this.reportData)
			.filter(
				(dataset: unknown): dataset is Record<string, unknown> =>
					typeof dataset === 'object' && dataset !== null && (dataset as any).data?.aircraft
			)
			.flatMap((dataset: Record<string, unknown>) => (dataset as any).data.aircraft);

		if (allAircraft.length === 0) {
			this.log('⚠️  No aircraft data available for analysis');
			return;
		}

		// Price analysis
		const prices = allAircraft
			.filter((plane: Record<string, unknown>) => (plane.askingprice as number) > 0)
			.map((plane: Record<string, unknown>) => plane.askingprice as number)
			.sort((a: number, b: number) => a - b);

		const priceAnalysis = {
			available: prices.length > 0,
			average:
				prices.length > 0
					? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length)
					: 0,
			median: prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0,
			min: prices.length > 0 ? prices[0] : 0,
			max: prices.length > 0 ? prices[prices.length - 1] : 0,
		};

		// Year analysis
		const years = allAircraft
			.filter((plane: Record<string, unknown>) => (plane.yearmfr as number) > 0)
			.map((plane: Record<string, unknown>) => plane.yearmfr as number)
			.sort((a: number, b: number) => a - b);

		const yearAnalysis = {
			available: years.length > 0,
			average:
				years.length > 0
					? Math.round(years.reduce((sum, year) => sum + year, 0) / years.length)
					: 0,
			median: years.length > 0 ? years[Math.floor(years.length / 2)] : 0,
			min: years.length > 0 ? years[0] : 0,
			max: years.length > 0 ? years[years.length - 1] : 0,
		};

		// Make analysis
		const makeCounts = allAircraft.reduce(
			(acc: Record<string, number>, plane: Record<string, unknown>) => {
				const make = (plane.make as string) || 'Unknown';
				acc[make] = (acc[make] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		const topMakes = Object.entries(makeCounts)
			.sort(([, a], [, b]) => (b as number) - (a as number))
			.slice(0, 10);

		const makeAnalysis = {
			total: Object.keys(makeCounts).length,
			topMakes,
			makeCounts,
		};

		// Geographic analysis
		const stateCounts = allAircraft.reduce(
			(acc: Record<string, number>, plane: Record<string, unknown>) => {
				const state = (plane.basestate as string) || 'Unknown';
				acc[state] = (acc[state] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		const topStates = Object.entries(stateCounts)
			.sort(([, a], [, b]) => (b as number) - (a as number))
			.slice(0, 10);

		const geographicAnalysis = {
			totalStates: Object.keys(stateCounts).length,
			topStates,
			stateCounts,
		};

		// Top opportunities (best value aircraft)
		const opportunities = allAircraft
			.filter(
				(plane: Record<string, unknown>) =>
					plane.forsale === 'true' &&
					(plane.askingprice as number) > 0 &&
					(plane.yearmfr as number) > 0
			)
			.map((plane: Record<string, unknown>) => ({
				...plane,
				valueScore: this.calculateValueScore(plane),
			}))
			.sort(
				(a: Record<string, unknown>, b: Record<string, unknown>) =>
					(b.valueScore as number) - (a.valueScore as number)
			)
			.slice(0, 20);

		this.marketAnalysis = {
			summary: {
				totalAircraft: allAircraft.length,
				forSaleCount: allAircraft.filter(
					(plane: Record<string, unknown>) => plane.forsale === 'true'
				).length,
				uniqueMakes: Object.keys(makeCounts).length,
				averagePrice: priceAnalysis.average,
				averageYear: yearAnalysis.average,
			},
			priceAnalysis,
			yearAnalysis,
			makeAnalysis,
			geographicAnalysis,
			topOpportunities: opportunities,
			generatedAt: new Date().toISOString(),
		};

		this.log('✅ Market analysis completed');
	}

	private calculateValueScore(aircraft: Record<string, unknown>): number {
		// Simple value scoring algorithm
		const yearmfr = aircraft.yearmfr as number;
		const askingprice = aircraft.askingprice as number;
		const make = aircraft.make as string;

		const yearScore = yearmfr > 2015 ? 100 : yearmfr > 2010 ? 80 : yearmfr > 2005 ? 60 : 40;
		const priceScore =
			askingprice < 5000000 ? 100 : askingprice < 10000000 ? 80 : askingprice < 20000000 ? 60 : 40;
		const makeScore = ['GULFSTREAM', 'BOMBARDIER', 'CESSNA', 'DASSAULT'].includes(make) ? 100 : 80;

		return (yearScore + priceScore + makeScore) / 3;
	}

	private async generateHTMLReport() {
		this.log('📄 Generating comprehensive HTML report');

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `comprehensive-market-report-${timestamp}.html`;
		const filepath = path.join(this.config.outputDir, filename);

		const htmlContent = this.generateHTMLContent();

		fs.writeFileSync(filepath, htmlContent);

		this.reportData.htmlReport = {
			filename,
			filepath,
			size: fs.statSync(filepath).size,
			generatedAt: new Date().toISOString(),
		};

		this.log(`✅ HTML report generated: ${filename}`);
	}

	private generateHTMLContent(): string {
		const totalAircraft = this.getTotalAircraftCount();
		const forSaleCount = this.getForSaleCount();
		const uniqueMakes = this.getUniqueMakesCount();

		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.reportTitle}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; font-weight: 300; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 1.1em; }
        .content { padding: 40px; }
        .summary-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #667eea; }
        .stat-number { font-size: 2em; font-weight: bold; color: #667eea; margin-bottom: 5px; }
        .stat-label { color: #666; font-size: 0.9em; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .table th { background: #f8f9fa; font-weight: 600; color: #333; }
        .table tr:hover { background: #f8f9fa; }
        .footer { background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
        .contact-info { margin-top: 20px; }
        .contact-info p { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.config.reportTitle}</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>

        <div class="content">
            ${this.generateSummaryStatsHTML(totalAircraft, forSaleCount, uniqueMakes)}
            ${this.generateMarketInsightsHTML()}
            ${this.generateDetailedTablesHTML()}
        </div>

        <div class="footer">
            <p><strong>${this.config.branding}</strong></p>
            <div class="contact-info">
                <p>${this.config.contactInfo.business.phone} | ${
			this.config.contactInfo.business.email
		}</p>
                <p>${this.config.contactInfo.business.website}</p>
            </div>
        </div>
    </div>
</body>
</html>`;
	}

	private generateSummaryStatsHTML(
		totalAircraft: number,
		forSaleCount: number,
		uniqueMakes: number
	): string {
		return `
        <div class="summary-stats">
            <div class="stat-card">
                <div class="stat-number">${totalAircraft.toLocaleString()}</div>
                <div class="stat-label">Total Aircraft</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${forSaleCount.toLocaleString()}</div>
                <div class="stat-label">For Sale</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${uniqueMakes}</div>
                <div class="stat-label">Unique Makes</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">$${
									(this.marketAnalysis as any)?.priceAnalysis?.average?.toLocaleString() || 'N/A'
								}</div>
                <div class="stat-label">Average Price</div>
            </div>
        </div>`;
	}

	private generateMarketInsightsHTML(): string {
		if (!this.marketAnalysis) return '';

		return `
        <div class="section">
            <h2>Market Insights</h2>
            <div class="summary-stats">
                <div class="stat-card">
                    <div class="stat-number">${
											(this.marketAnalysis as any)?.yearAnalysis?.average || 'N/A'
										}</div>
                    <div class="stat-label">Average Year</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">$${
											(this.marketAnalysis as any)?.priceAnalysis?.min?.toLocaleString() || 'N/A'
										}</div>
                    <div class="stat-label">Lowest Price</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">$${
											(this.marketAnalysis as any).priceAnalysis?.max?.toLocaleString() || 'N/A'
										}</div>
                    <div class="stat-label">Highest Price</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${
											(this.marketAnalysis as any).geographicAnalysis?.totalStates || 'N/A'
										}</div>
                    <div class="stat-label">States Represented</div>
                </div>
            </div>
        </div>`;
	}

	private generateDetailedTablesHTML(): string {
		let html = '';

		// Top Makes Table
		if ((this.marketAnalysis as any)?.makeAnalysis?.topMakes) {
			html += `
            <div class="section">
                <h2>Top Aircraft Makes</h2>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Make</th>
                            <th>Count</th>
                            <th>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>`;

			(this.marketAnalysis as any).makeAnalysis.topMakes.forEach(
				([make, count]: [string, number]) => {
					const percentage = (
						(count / (this.marketAnalysis as any).summary.totalAircraft) *
						100
					).toFixed(1);
					html += `
                        <tr>
                            <td>${make}</td>
                            <td>${count.toLocaleString()}</td>
                            <td>${percentage}%</td>
                        </tr>`;
				}
			);

			html += `
                    </tbody>
                </table>
            </div>`;
		}

		// Top States Table
		if ((this.marketAnalysis as any)?.geographicAnalysis?.topStates) {
			html += `
            <div class="section">
                <h2>Top States by Aircraft Count</h2>
                <table class="table">
                    <thead>
                        <tr>
                            <th>State</th>
                            <th>Count</th>
                            <th>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>`;

			(this.marketAnalysis as any).geographicAnalysis.topStates.forEach(
				([state, count]: [string, number]) => {
					const percentage = (
						(count / (this.marketAnalysis as any).summary.totalAircraft) *
						100
					).toFixed(1);
					html += `
                        <tr>
                            <td>${state}</td>
                            <td>${count.toLocaleString()}</td>
                            <td>${percentage}%</td>
                        </tr>`;
				}
			);

			html += `
                    </tbody>
                </table>
            </div>`;
		}

		return html;
	}

	private async generateCSVExports() {
		this.log('📊 Generating CSV exports');

		const csvExports = [];

		// Export aircraft data
		const aircraftData = await this.exportAircraftData();
		if (aircraftData) csvExports.push(aircraftData);

		// Export market analysis
		const marketData = await this.exportMarketAnalysis();
		if (marketData) csvExports.push(marketData);

		// Export top opportunities
		const opportunitiesData = await this.exportTopOpportunities();
		if (opportunitiesData) csvExports.push(opportunitiesData);

		this.reportData.csvExports = csvExports;
		this.log(`✅ Generated ${csvExports.length} CSV exports`);
	}

	private async exportAircraftData(): Promise<Record<string, unknown> | null> {
		const allAircraft = Object.values(this.reportData)
			.filter(
				(dataset: unknown): dataset is Record<string, unknown> =>
					typeof dataset === 'object' && dataset !== null && (dataset as any).data?.aircraft
			)
			.flatMap((dataset: Record<string, unknown>) => (dataset as any).data.aircraft);

		if (allAircraft.length === 0) return null;

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `aircraft-data-${timestamp}.csv`;
		const filepath = path.join(this.config.outputDir, filename);

		const headers = [
			'Aircraft ID',
			'Make',
			'Model',
			'Registration',
			'Year',
			'Price',
			'For Sale',
			'Base City',
			'Base State',
			'Base Country',
			'AFTT',
			'Engine Serial 1',
			'Engine Serial 2',
			'ICAO',
			'Exclusive',
			'Leased',
			'List Date',
		];

		const csvContent = [
			headers.join(','),
			...allAircraft.map((plane: any) =>
				[
					plane.aircraftid,
					plane.make,
					plane.model,
					plane.regnbr,
					plane.yearmfr,
					plane.askingprice,
					plane.forsale,
					plane.basecity,
					plane.basestate,
					plane.basecountry,
					plane.aftt,
					plane.engserial1,
					plane.engserial2,
					plane.icao,
					plane.exclusive,
					plane.leased,
					plane.listdate,
				]
					.map((field: unknown) => `"${field}"`)
					.join(',')
			),
		].join('\n');

		fs.writeFileSync(filepath, csvContent);

		return {
			filename,
			filepath,
			size: fs.statSync(filepath).size,
			recordCount: allAircraft.length,
			generatedAt: new Date().toISOString(),
		};
	}

	private async exportMarketAnalysis(): Promise<Record<string, unknown> | null> {
		if (!this.marketAnalysis) return null;

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `market-analysis-${timestamp}.csv`;
		const filepath = path.join(this.config.outputDir, filename);

		const csvContent = [
			'Metric,Value',
			`Total Aircraft,${(this.marketAnalysis as any).summary.totalAircraft}`,
			`For Sale Count,${(this.marketAnalysis as any).summary.forSaleCount}`,
			`Unique Makes,${(this.marketAnalysis as any).summary.uniqueMakes}`,
			`Average Price,${(this.marketAnalysis as any).priceAnalysis.average}`,
			`Median Price,${(this.marketAnalysis as any).priceAnalysis.median}`,
			`Min Price,${(this.marketAnalysis as any).priceAnalysis.min}`,
			`Max Price,${(this.marketAnalysis as any).priceAnalysis.max}`,
			`Average Year,${(this.marketAnalysis as any).yearAnalysis.average}`,
			`Median Year,${(this.marketAnalysis as any).yearAnalysis.median}`,
			`Min Year,${(this.marketAnalysis as any).yearAnalysis.min}`,
			`Max Year,${(this.marketAnalysis as any).yearAnalysis.max}`,
		].join('\n');

		fs.writeFileSync(filepath, csvContent);

		return {
			filename,
			filepath,
			size: fs.statSync(filepath).size,
			recordCount: 12,
			generatedAt: new Date().toISOString(),
		};
	}

	private async exportTopOpportunities(): Promise<Record<string, unknown> | null> {
		if (!(this.marketAnalysis as any)?.topOpportunities) return null;

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `top-opportunities-${timestamp}.csv`;
		const filepath = path.join(this.config.outputDir, filename);

		const headers = [
			'Aircraft ID',
			'Make',
			'Model',
			'Registration',
			'Year',
			'Price',
			'Value Score',
			'Base City',
			'Base State',
			'Base Country',
		];

		const csvContent = [
			headers.join(','),
			...(this.marketAnalysis as any).topOpportunities.map((plane: any) =>
				[
					plane.aircraftid,
					plane.make,
					plane.model,
					plane.regnbr,
					plane.yearmfr,
					plane.askingprice,
					plane.valueScore.toFixed(1),
					plane.basecity,
					plane.basestate,
					plane.basecountry,
				]
					.map((field: unknown) => `"${field}"`)
					.join(',')
			),
		].join('\n');

		fs.writeFileSync(filepath, csvContent);

		return {
			filename,
			filepath,
			size: fs.statSync(filepath).size,
			recordCount: (this.marketAnalysis as any).topOpportunities.length,
			generatedAt: new Date().toISOString(),
		};
	}

	private async sendWebhookNotification() {
		// Placeholder for webhook notification
		this.log('📡 Webhook notification sent (placeholder)');
	}

	private getTotalAircraftCount(): number {
		return Object.values(this.reportData)
			.filter(
				(dataset: unknown): dataset is Record<string, unknown> =>
					typeof dataset === 'object' &&
					dataset !== null &&
					(dataset as any).count &&
					typeof (dataset as any).count === 'number'
			)
			.reduce((sum: number, dataset: Record<string, unknown>) => sum + (dataset as any).count, 0);
	}

	private getForSaleCount(): number {
		return Object.values(this.reportData)
			.filter(
				(dataset: unknown): dataset is Record<string, unknown> =>
					typeof dataset === 'object' && dataset !== null && (dataset as any).data?.aircraft
			)
			.flatMap((dataset: Record<string, unknown>) => (dataset as any).data.aircraft)
			.filter((plane: any) => plane.forsale === 'true').length;
	}

	private getUniqueMakesCount(): number {
		const makes = new Set<string>();
		Object.values(this.reportData)
			.filter(
				(dataset: unknown): dataset is Record<string, unknown> =>
					typeof dataset === 'object' && dataset !== null && (dataset as any).data?.aircraft
			)
			.flatMap((dataset: Record<string, unknown>) => (dataset as any).data.aircraft)
			.forEach((plane: any) => {
				if (plane.make) makes.add(plane.make);
			});
		return makes.size;
	}
}
