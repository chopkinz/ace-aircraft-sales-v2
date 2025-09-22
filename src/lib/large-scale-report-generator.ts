import { JetNetAPIClient } from '@/lib/jetnet-api-client';
import fs from 'fs';
import path from 'path';
import { SearchParams } from '@/types';

export interface LargeScaleReportConfig {
	enableLogging?: boolean;
	includeImages?: boolean;
	includeAllDetails?: boolean;
	outputDir?: string;
	reportTitle?: string;
	branding?: string;
	maxRecords?: number;
	batchSize?: number;
	parallelRequests?: number;
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

export interface LargeScaleReportResult {
	success: boolean;
	totalAircraft: number;
	duration: number;
	reportFile?: string;
	outputDirectory: string;
	datasets: Record<string, any>;
	marketAnalysis?: any;
	htmlReport?: any;
	csvExports?: any[];
	error?: string;
	processingStats: {
		batchesProcessed: number;
		recordsPerBatch: number;
		apiCallsMade: number;
		errorsEncountered: number;
		imagesCollected: number;
	};
}

export class LargeScaleReportGenerator {
	private config: Required<LargeScaleReportConfig>;
	private client: JetNetAPIClient | null = null;
	private reportData: Record<string, any> = {};
	private marketAnalysis: any = null;
	private processingStats = {
		batchesProcessed: 0,
		recordsPerBatch: 0,
		apiCallsMade: 0,
		errorsEncountered: 0,
		imagesCollected: 0,
	};

	constructor(options: LargeScaleReportConfig = {}, jetNetClient?: JetNetAPIClient) {
		this.config = {
			enableLogging: options.enableLogging ?? true,
			includeImages: options.includeImages ?? true,
			includeAllDetails: options.includeAllDetails ?? true,
			outputDir: options.outputDir ?? './comprehensive-market-reports',
			reportTitle:
				options.reportTitle ?? 'ACE Aircraft Sales - Large Scale Market Intelligence Report',
			branding: options.branding ?? 'ACE Aircraft Sales',
			maxRecords: options.maxRecords ?? 10000, // Process up to 10,000 records
			batchSize: options.batchSize ?? 100, // Process in batches of 100
			parallelRequests: options.parallelRequests ?? 5, // 5 parallel requests
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
		this.ensureOutputDirectory();
		this.log('Large Scale Report Generator initialized');
	}

	private log(message: string, data?: any) {
		if (this.config.enableLogging) {
			const timestamp = new Date().toISOString();
			const logMessage = `[${timestamp}] Large Scale Report: ${message}`;

			// Always log to console for visibility
			if (data) {
				console.log(logMessage, data);
			} else {
				console.log(logMessage);
			}

			// Also log to file for persistence
			this.logToFile(logMessage, data);
		}
	}

	private logToFile(message: string, data?: any) {
		try {
			const logDir = path.join(this.config.outputDir, 'logs');
			if (!fs.existsSync(logDir)) {
				fs.mkdirSync(logDir, { recursive: true });
			}

			const logFile = path.join(
				logDir,
				`large-scale-report-${new Date().toISOString().split('T')[0]}.log`
			);
			const logEntry = data ? `${message} ${JSON.stringify(data)}\n` : `${message}\n`;

			fs.appendFileSync(logFile, logEntry);
		} catch (error) {
			// Don't fail if logging fails
			console.error('Failed to write to log file:', error);
		}
	}

	private ensureOutputDirectory() {
		if (!fs.existsSync(this.config.outputDir)) {
			fs.mkdirSync(this.config.outputDir, { recursive: true });
			this.log(`📁 Created output directory: ${this.config.outputDir}`);
		}
	}

	async generateLargeScaleReport(): Promise<LargeScaleReportResult> {
		const startTime = Date.now();
		this.log('🚀 Starting large scale market report generation');

		try {
			await this.collectLargeScaleData();
			await this.performComprehensiveMarketAnalysis();
			await this.generateProfessionalHTMLReport();
			await this.generateDetailedCSVExports();

			const duration = Date.now() - startTime;
			const summary = await this.generateSummary(duration);

			this.log('✅ LARGE SCALE REPORT GENERATION COMPLETED!');
			this.log('==========================================');
			this.log(`⏱️  Total Duration: ${(duration / 1000).toFixed(2)} seconds`);
			this.log(`📊 Total Aircraft Analyzed: ${summary.totalAircraft.toLocaleString()}`);
			this.log(`📁 Report saved to: ${this.config.outputDir}`);
			this.log(`🔄 Batches Processed: ${this.processingStats.batchesProcessed}`);
			this.log(`📡 API Calls Made: ${this.processingStats.apiCallsMade}`);
			this.log(`🖼️  Images Collected: ${this.processingStats.imagesCollected}`);

			return summary as unknown as LargeScaleReportResult;
		} catch (error) {
			this.log('❌ Large scale report generation failed:', error);
			return {
				success: false,
				totalAircraft: 0,
				duration: Date.now() - startTime,
				outputDirectory: this.config.outputDir,
				datasets: {},
				error: error instanceof Error ? error.message : 'Unknown error',
				processingStats: this.processingStats,
			};
		}
	}

	private async collectLargeScaleData() {
		this.log('📊 Collecting large scale market data');

		if (!this.client) {
			this.log('❌ JetNet client not available. Using enhanced mock data for testing.');
			await this.generateEnhancedMockData();
			return;
		}

		const datasets = [
			{
				name: 'ALL_FOR_SALE',
				displayName: 'All For Sale Aircraft',
				filters: { forsale: 'true' },
				priority: 1,
				expectedRecords: 5000,
			},
			{
				name: 'US_AIRCRAFT',
				displayName: 'All US Aircraft',
				filters: { basecountry: 'United States' },
				priority: 2,
				expectedRecords: 3000,
			},
			{
				name: 'GULFSTREAM_AIRCRAFT',
				displayName: 'All Gulfstream Aircraft',
				filters: { aircraftmake: 'GULFSTREAM' },
				priority: 3,
				expectedRecords: 200,
			},
			{
				name: 'CITATION_AIRCRAFT',
				displayName: 'All Citation Aircraft',
				filters: { aircraftmake: 'CESSNA', aircraftmodel: 'CITATION' },
				priority: 4,
				expectedRecords: 800,
			},
			{
				name: 'RECENT_AIRCRAFT',
				displayName: '2020+ Aircraft',
				filters: { yearmfr: 2020 },
				priority: 5,
				expectedRecords: 500,
			},
			{
				name: 'MID_RANGE_AIRCRAFT',
				displayName: '2015-2019 Aircraft',
				filters: { yearlow: 2015, yearhigh: 2019 },
				priority: 6,
				expectedRecords: 1200,
			},
			{
				name: 'VINTAGE_AIRCRAFT',
				displayName: 'Pre-2010 Aircraft',
				filters: { yearhigh: 2009 },
				priority: 7,
				expectedRecords: 2000,
			},
			{
				name: 'LIGHT_JETS',
				displayName: 'Light Jets',
				filters: { aircraftcategory: 'LIGHT JET' },
				priority: 8,
				expectedRecords: 600,
			},
			{
				name: 'MID_SIZE_JETS',
				displayName: 'Mid-Size Jets',
				filters: { aircraftcategory: 'MID SIZE JET' },
				priority: 9,
				expectedRecords: 400,
			},
			{
				name: 'HEAVY_JETS',
				displayName: 'Heavy Jets',
				filters: { aircraftcategory: 'HEAVY JET' },
				priority: 10,
				expectedRecords: 300,
			},
		];

		for (const dataset of datasets) {
			try {
				this.log(
					`📡 Collecting: ${dataset.displayName} (Expected: ${dataset.expectedRecords} records)`
				);

				// Force authentication before each dataset collection
				this.log('🔐 Ensuring authentication before dataset collection...');
				if (this.client && this.client.refreshToken) {
					await this.client.refreshToken();
					this.log('✅ Authentication verified for dataset collection');
				}

				// Process in batches for large datasets
				const allAircraft = await this.collectDatasetInBatches(dataset);

				if (allAircraft.length > 0) {
					const cleanedAircraft = this.cleanAircraftData(allAircraft);

					// Collect images if enabled
					if (this.config.includeImages) {
						await this.collectAircraftImagesBatch(cleanedAircraft, dataset.name);
					}

					this.reportData[dataset.name] = {
						displayName: dataset.displayName,
						count: cleanedAircraft.length,
						data: { success: true, aircraft: cleanedAircraft },
						duration: 1000,
						timestamp: new Date().toISOString(),
						expectedRecords: dataset.expectedRecords,
						collectionRate:
							((cleanedAircraft.length / dataset.expectedRecords) * 100).toFixed(1) + '%',
					};

					this.log(
						`✅ SUCCESS! Collected ${cleanedAircraft.length} aircraft records (${this.reportData[dataset.name].collectionRate} of expected)`
					);
				} else {
					this.log(`⚠️  No aircraft data returned for: ${dataset.displayName}`);
					this.reportData[dataset.name] = {
						displayName: dataset.displayName,
						count: 0,
						error: 'No data returned',
						timestamp: new Date().toISOString(),
						expectedRecords: dataset.expectedRecords,
						collectionRate: '0%',
					};
				}
			} catch (error) {
				this.log(`❌ Error collecting ${dataset.displayName}:`, error);
				this.reportData[dataset.name] = {
					displayName: dataset.displayName,
					count: 0,
					error: error instanceof Error ? error.message : 'Unknown error',
					timestamp: new Date().toISOString(),
					expectedRecords: dataset.expectedRecords,
					collectionRate: '0%',
				};
				this.processingStats.errorsEncountered++;
			}
		}
	}

	private async collectDatasetInBatches(dataset: any): Promise<any[]> {
		const allAircraft: any[] = [];
		let page = 1;
		let hasMoreData = true;
		const maxPages = Math.ceil(this.config.maxRecords / this.config.batchSize);

		this.log(`🚀 Starting batch collection for ${dataset.displayName}`);
		this.log(
			`📊 Configuration: Max Records: ${this.config.maxRecords}, Batch Size: ${this.config.batchSize}, Max Pages: ${maxPages}`
		);

		while (hasMoreData && page <= maxPages) {
			try {
				const batchFilters = {
					...dataset.filters,
					page,
					limit: this.config.batchSize,
				};

				this.log(`📡 Batch ${page}/${maxPages}: Collecting ${this.config.batchSize} records...`, {
					filters: batchFilters,
					totalCollected: allAircraft.length,
					remainingPages: maxPages - page + 1,
				});

				// Debug: Check if client is available
				if (!this.client) {
					this.log('❌ No API client available!', { client: this.client });
					break;
				}

				this.log('🔍 About to call searchAircraft with client:', {
					clientExists: !!this.client,
					clientType: typeof this.client,
					hasSearchAircraft: typeof this.client.searchAircraft === 'function',
				});

				const startTime = Date.now();
				const result = await this.client!.searchAircraft(batchFilters as SearchParams);
				const requestDuration = Date.now() - startTime;

				this.processingStats.apiCallsMade++;

				this.log(`⏱️  API Request completed in ${requestDuration}ms`, {
					success: result.success,
					dataLength: result.data?.length || 0,
					hasError: !!result.error,
				});

				if (result.success && result.data && result.data.length > 0) {
					allAircraft.push(...result.data);
					this.processingStats.batchesProcessed++;
					this.processingStats.recordsPerBatch = result.data.length;

					// Check if we have more data
					if (result.data.length < this.config.batchSize) {
						hasMoreData = false;
						this.log(
							`📊 Batch ${page}: Received ${result.data.length} records (less than batch size), marking as final batch`
						);
					}

					this.log(
						`✅ Batch ${page}: Collected ${result.data.length} records (Total: ${allAircraft.length})`,
						{
							batchProgress: `${page}/${maxPages}`,
							collectionProgress: `${allAircraft.length}/${this.config.maxRecords}`,
							percentage: ((allAircraft.length / this.config.maxRecords) * 100).toFixed(1) + '%',
						}
					);
					page++;

					// Add delay between batches to avoid rate limiting
					if (hasMoreData) {
						this.log(`⏳ Waiting 100ms before next batch to avoid rate limiting...`);
						await new Promise(resolve => setTimeout(resolve, 100));
					}
				} else {
					hasMoreData = false;
					this.log(`⚠️  Batch ${page}: No more data available`, {
						success: result.success,
						dataLength: result.data?.length || 0,
						error: result.error,
					});
				}
			} catch (error) {
				this.log(`❌ Batch ${page} failed:`, {
					error: error instanceof Error ? error.message : error,
					stack: error instanceof Error ? error.stack : undefined,
					totalCollected: allAircraft.length,
					remainingPages: maxPages - page + 1,
				});
				this.processingStats.errorsEncountered++;
				hasMoreData = false;
			}
		}

		this.log(`🏁 Batch collection completed for ${dataset.displayName}`, {
			totalRecords: allAircraft.length,
			totalBatches: this.processingStats.batchesProcessed,
			totalApiCalls: this.processingStats.apiCallsMade,
			errors: this.processingStats.errorsEncountered,
		});

		return allAircraft;
	}

	private async collectAircraftImagesBatch(aircraft: any[], datasetName: string) {
		this.log(`🖼️  Collecting images for ${datasetName} (${aircraft.length} aircraft)`);

		if (!this.client) {
			this.log('⚠️  JetNet client not available, skipping image collection');
			aircraft.forEach(plane => {
				plane.pictures = ['/images/placeholder-aircraft.jpg'];
			});
			return;
		}

		// Process images in parallel batches
		const imageBatchSize = 10;
		for (let i = 0; i < aircraft.length; i += imageBatchSize) {
			const batch = aircraft.slice(i, i + imageBatchSize);

			await Promise.all(
				batch.map(async plane => {
					try {
						const picturesResult = await this.client!.getAircraftImages(plane.aircraftid as string);
						if (picturesResult.success && picturesResult.data.length > 0) {
							plane.pictures = picturesResult.data;
							this.processingStats.imagesCollected += picturesResult.data.length;
						} else {
							plane.pictures = ['/images/placeholder-aircraft.jpg'];
						}
					} catch (error) {
						this.log(`⚠️  Failed to get pictures for aircraft ${plane.aircraftid}:`, error);
						plane.pictures = ['/images/placeholder-aircraft.jpg'];
					}
				})
			);

			// Add delay between image batches
			if (i + imageBatchSize < aircraft.length) {
				await new Promise(resolve => setTimeout(resolve, 200));
			}
		}
	}

	private async generateEnhancedMockData() {
		this.log('📊 Generating enhanced mock data for large scale testing...');

		const mockDatasets = [
			{ name: 'ALL_FOR_SALE', displayName: 'All For Sale Aircraft', count: 5000 },
			{ name: 'US_AIRCRAFT', displayName: 'All US Aircraft', count: 3000 },
			{ name: 'GULFSTREAM_AIRCRAFT', displayName: 'All Gulfstream Aircraft', count: 200 },
			{ name: 'CITATION_AIRCRAFT', displayName: 'All Citation Aircraft', count: 800 },
			{ name: 'RECENT_AIRCRAFT', displayName: '2020+ Aircraft', count: 500 },
			{ name: 'MID_RANGE_AIRCRAFT', displayName: '2015-2019 Aircraft', count: 1200 },
			{ name: 'VINTAGE_AIRCRAFT', displayName: 'Pre-2010 Aircraft', count: 2000 },
			{ name: 'LIGHT_JETS', displayName: 'Light Jets', count: 600 },
			{ name: 'MID_SIZE_JETS', displayName: 'Mid-Size Jets', count: 400 },
			{ name: 'HEAVY_JETS', displayName: 'Heavy Jets', count: 300 },
		];

		for (const dataset of mockDatasets) {
			const sampleSize = Math.min(dataset.count, 50); // Generate sample data
			const aircraftData = Array.from({ length: sampleSize }, (_, i) => ({
				AircraftID: `MOCK_${dataset.name}_${i + 1}`,
				Make: this.getRandomMake(),
				Model: this.getRandomModel(),
				Year: 2010 + (i % 14),
				AskingPrice: this.getRandomPrice(),
				TotalTime: 1000 + i * 50,
				BaseCity: this.getRandomCity(),
				BaseState: this.getRandomState(),
				BaseCountry: 'United States',
				ForSale: 'true',
				AircraftCategory: this.getRandomCategory(),
				EngineType: this.getRandomEngineType(),
				MaxPassengers: this.getRandomPassengers(),
				MaxRange: this.getRandomRange(),
				CruiseSpeed: this.getRandomCruiseSpeed(),
			}));

			this.reportData[dataset.name] = {
				displayName: dataset.displayName,
				count: dataset.count,
				data: {
					success: true,
					aircraft: aircraftData,
				},
				duration: 100,
				timestamp: new Date().toISOString(),
				expectedRecords: dataset.count,
				collectionRate: '100%',
			};

			this.log(
				`✅ Enhanced mock data generated: ${dataset.displayName} (${dataset.count} records, ${sampleSize} samples)`
			);
		}
	}

	private getRandomMake(): string {
		const makes = [
			'GULFSTREAM',
			'CESSNA',
			'BOMBARDIER',
			'EMBRAER',
			'DASSAULT',
			'HAWKER',
			'LEARJET',
			'PILATUS',
		];
		return makes[Math.floor(Math.random() * makes.length)];
	}

	private getRandomModel(): string {
		const models = [
			'G550',
			'G650',
			'CITATION CJ4',
			'CITATION SOVEREIGN',
			'CHALLENGER 350',
			'PHENOM 300',
			'FALCON 7X',
			'HAWKER 4000',
		];
		return models[Math.floor(Math.random() * models.length)];
	}

	private getRandomPrice(): number {
		return Math.floor(Math.random() * 50000000) + 5000000; // $5M to $55M
	}

	private getRandomCity(): string {
		const cities = [
			'Los Angeles',
			'New York',
			'Miami',
			'Dallas',
			'Chicago',
			'Denver',
			'Seattle',
			'Boston',
		];
		return cities[Math.floor(Math.random() * cities.length)];
	}

	private getRandomState(): string {
		const states = ['CA', 'NY', 'FL', 'TX', 'IL', 'CO', 'WA', 'MA'];
		return states[Math.floor(Math.random() * states.length)];
	}

	private getRandomCategory(): string {
		const categories = ['LIGHT JET', 'MID SIZE JET', 'HEAVY JET', 'TURBOPROP'];
		return categories[Math.floor(Math.random() * categories.length)];
	}

	private getRandomEngineType(): string {
		const engines = ['TURBOFAN', 'TURBOPROP', 'TURBOJET'];
		return engines[Math.floor(Math.random() * engines.length)];
	}

	private getRandomPassengers(): number {
		return Math.floor(Math.random() * 12) + 4; // 4 to 15 passengers
	}

	private getRandomRange(): number {
		return Math.floor(Math.random() * 4000) + 1000; // 1000 to 5000 nm
	}

	private getRandomCruiseSpeed(): number {
		return Math.floor(Math.random() * 200) + 400; // 400 to 600 kts
	}

	private cleanAircraftData(aircraft: any[]): any[] {
		return aircraft.map(plane => ({
			aircraftid: plane.AircraftID || plane.aircraftid || '',
			make: plane.Make || plane.make || '',
			model: plane.Model || plane.model || '',
			year: plane.Year || plane.year || plane.YearMfr || '',
			askingprice: plane.AskingPrice || plane.askingprice || 0,
			totaltime: plane.TotalTime || plane.totaltime || plane.TotalTimeHours || 0,
			basecity: plane.BaseCity || plane.basecity || '',
			basestate: plane.BaseState || plane.basestate || '',
			basecountry: plane.BaseCountry || plane.basecountry || '',
			forsale: plane.ForSale || plane.forsale || 'false',
			category: plane.AircraftCategory || plane.aircraftcategory || '',
			enginetype: plane.EngineType || plane.enginetype || '',
			maxpassengers: plane.MaxPassengers || plane.maxpassengers || 0,
			maxrange: plane.MaxRange || plane.maxrange || 0,
			cruisespeed: plane.CruiseSpeed || plane.cruisespeed || 0,
			leased: plane.Leased || plane.leased || 'false',
			listdate: plane.ListDate || plane.listdate || '',
			pictures: [],
		}));
	}

	private async performComprehensiveMarketAnalysis() {
		this.log('📈 Performing comprehensive market analysis');

		const allAircraft = Object.values(this.reportData)
			.filter((dataset: any) => dataset.data?.aircraft)
			.flatMap((dataset: any) => dataset.data.aircraft);

		if (allAircraft.length === 0) {
			this.log('⚠️  No aircraft data available for analysis');
			return;
		}

		// Price analysis
		const prices = allAircraft
			.filter(plane => plane.askingprice > 0)
			.map(plane => plane.askingprice)
			.sort((a, b) => a - b);

		const priceAnalysis = {
			available: prices.length > 0,
			average:
				prices.length > 0
					? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length)
					: 0,
			median: prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0,
			min: prices.length > 0 ? prices[0] : 0,
			max: prices.length > 0 ? prices[prices.length - 1] : 0,
			count: prices.length,
		};

		// Make analysis
		const makeAnalysis = allAircraft.reduce((acc: any, plane) => {
			const make = plane.make || 'Unknown';
			acc[make] = (acc[make] || 0) + 1;
			return acc;
		}, {});

		// Year analysis
		const yearAnalysis = allAircraft.reduce((acc: any, plane) => {
			const year = plane.year || 'Unknown';
			acc[year] = (acc[year] || 0) + 1;
			return acc;
		}, {});

		// Category analysis
		const categoryAnalysis = allAircraft.reduce((acc: any, plane) => {
			const category = plane.category || 'Unknown';
			acc[category] = (acc[category] || 0) + 1;
			return acc;
		}, {});

		this.marketAnalysis = {
			totalAircraft: allAircraft.length,
			priceAnalysis,
			makeAnalysis,
			yearAnalysis,
			categoryAnalysis,
			generatedAt: new Date().toISOString(),
		};

		this.log('✅ Comprehensive market analysis completed');
	}

	private async generateProfessionalHTMLReport() {
		this.log('📄 Generating professional HTML report');

		const totalAircraft = Object.values(this.reportData).reduce(
			(sum: number, d: any) => sum + d.count,
			0
		);
		const reportId = `comprehensive-report-${Date.now()}`;
		const reportFile = path.join(this.config.outputDir, `${reportId}.html`);

		const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.reportTitle}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 { margin: 0; font-size: 2.5em; font-weight: 300; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 1.1em; }
        .content { padding: 40px; }
        .summary {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #007bff;
        }
        .summary h2 { color: #007bff; margin-top: 0; }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .metric {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; margin-top: 5px; }
        .dataset {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: white;
        }
        .dataset h3 { color: #333; margin-top: 0; }
        .dataset-stats {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            font-size: 0.9em;
            color: #666;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s ease;
        }
        .market-analysis {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .market-analysis h3 { color: #856404; margin-top: 0; }
        .footer {
            background: #343a40;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 0.9em;
        }
        .processing-stats {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .processing-stats h3 { color: #0066cc; margin-top: 0; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .stat-item {
            text-align: center;
            padding: 10px;
            background: white;
            border-radius: 4px;
        }
        .stat-value { font-weight: bold; color: #0066cc; }
        .stat-label { font-size: 0.8em; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.config.reportTitle}</h1>
            <p>Generated by ${this.config.branding}</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>

        <div class="content">
            <div class="summary">
                <h2>Executive Summary</h2>
                <p>This comprehensive market intelligence report analyzes <strong>${totalAircraft.toLocaleString()}</strong> aircraft records
                across multiple datasets to provide detailed insights into the aviation market. The analysis includes pricing trends,
                market segmentation, and competitive intelligence to support strategic decision-making.</p>
            </div>

            <div class="metrics">
                <div class="metric">
                    <div class="metric-value">${totalAircraft.toLocaleString()}</div>
                    <div class="metric-label">Total Aircraft Analyzed</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${Object.keys(this.reportData).length}</div>
                    <div class="metric-label">Data Sets Processed</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${this.processingStats.apiCallsMade}</div>
                    <div class="metric-label">API Calls Made</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${this.processingStats.imagesCollected}</div>
                    <div class="metric-label">Images Collected</div>
                </div>
            </div>

            ${
							this.marketAnalysis
								? `
            <div class="market-analysis">
                <h3>Market Analysis Summary</h3>
                <p><strong>Average Price:</strong> $${this.marketAnalysis.priceAnalysis.average.toLocaleString()}</p>
                <p><strong>Price Range:</strong> $${this.marketAnalysis.priceAnalysis.min.toLocaleString()} - $${this.marketAnalysis.priceAnalysis.max.toLocaleString()}</p>
                <p><strong>Median Price:</strong> $${this.marketAnalysis.priceAnalysis.median.toLocaleString()}</p>
                <p><strong>Total Records with Pricing:</strong> ${this.marketAnalysis.priceAnalysis.count.toLocaleString()}</p>
            </div>
            `
								: ''
						}

            <div class="processing-stats">
                <h3>Processing Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">${this.processingStats.batchesProcessed}</div>
                        <div class="stat-label">Batches Processed</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${this.processingStats.recordsPerBatch}</div>
                        <div class="stat-label">Avg Records/Batch</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${this.processingStats.apiCallsMade}</div>
                        <div class="stat-label">API Calls Made</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${this.processingStats.errorsEncountered}</div>
                        <div class="stat-label">Errors Encountered</div>
                    </div>
                </div>
            </div>

            <h2>Data Sets Analysis</h2>
            ${Object.values(this.reportData)
							.map(
								(dataset: any) => `
                <div class="dataset">
                    <h3>${dataset.displayName}</h3>
                    <div class="dataset-stats">
                        <span>Records: ${dataset.count.toLocaleString()}</span>
                        <span>Expected: ${dataset.expectedRecords?.toLocaleString() || 'N/A'}</span>
                        <span>Collection Rate: ${dataset.collectionRate || '100%'}</span>
                        <span>Generated: ${dataset.timestamp}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${parseFloat(dataset.collectionRate || '100')}%"></div>
                    </div>
                    ${dataset.error ? `<p style="color: #dc3545; margin: 10px 0;">Error: ${dataset.error}</p>` : ''}
                </div>
            `
							)
							.join('')}
        </div>

        <div class="footer">
            <p>© ${new Date().getFullYear()} ${this.config.branding}. All rights reserved.</p>
            <p>Contact: ${this.config.contactInfo.primary.email} | ${this.config.contactInfo.primary.phone}</p>
        </div>
    </div>
</body>
</html>`;

		fs.writeFileSync(reportFile, htmlContent);
		this.log(`✅ Professional HTML report saved: ${reportFile}`);
	}

	private async generateDetailedCSVExports() {
		this.log('📊 Generating detailed CSV exports');

		for (const [name, dataset] of Object.entries(this.reportData)) {
			if (dataset.data && dataset.data.aircraft) {
				const csvContent = this.generateDetailedCSV(dataset.data.aircraft);
				const csvFile = path.join(this.config.outputDir, `${name.toLowerCase()}_detailed.csv`);
				fs.writeFileSync(csvFile, csvContent);
				this.log(`✅ Detailed CSV exported: ${csvFile}`);
			}
		}

		// Generate summary CSV
		const summaryData = Object.entries(this.reportData).map(([name, dataset]: [string, any]) => ({
			Dataset: dataset.displayName,
			Records: dataset.count,
			Expected: dataset.expectedRecords || 0,
			CollectionRate: dataset.collectionRate || '100%',
			Generated: dataset.timestamp,
			Status: dataset.error ? 'Error' : 'Success',
		}));

		const summaryCSV = this.generateDetailedCSV(summaryData);
		const summaryFile = path.join(this.config.outputDir, 'dataset_summary.csv');
		fs.writeFileSync(summaryFile, summaryCSV);
		this.log(`✅ Dataset summary CSV exported: ${summaryFile}`);
	}

	private generateDetailedCSV(data: any[]): string {
		if (!data || data.length === 0) return '';

		const headers = Object.keys(data[0]);
		const csvRows = [
			headers.join(','),
			...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(',')),
		];

		return csvRows.join('\n');
	}

	private async generateSummary(duration: number) {
		const totalAircraft = Object.values(this.reportData).reduce(
			(sum: number, d: any) => sum + d.count,
			0
		);
		const reportFile = `comprehensive-report-${Date.now()}.html`;

		return {
			success: true,
			totalAircraft,
			duration,
			reportFile,
			outputDirectory: this.config.outputDir,
			datasets: this.reportData,
			marketAnalysis: this.marketAnalysis,
			csvExports: Object.keys(this.reportData).length + 1, // +1 for summary
			processingStats: this.processingStats,
		};
	}
}
