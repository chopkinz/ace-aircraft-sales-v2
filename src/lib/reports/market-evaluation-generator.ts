import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AircraftData {
	id: string;
	manufacturer: string;
	model: string;
	year: number;
	registration: string;
	serialNumber: string;
	airframeHours: number | null;
	engineProgram: string | null;
	airframeProgram: string | null;
	avionics: string | null;
	paintedYear: number | null;
	interiorYear: number | null;
	passengers: number | null;
	damageHistory: string | null;
	location: string | null;
	docDue: string | null;
	daysOnMarket: number | null;
	askingPrice: number | null;
	expectedPrice: number | null;
	soldDate: string | null;
	photos: string | null;
	lastUpdated: string;
	notes: string | null;
	status: string;
	// Custom fields
	connectivity?: string;
	beltedLav?: string;
	fansCpdlc?: string;
	sideFacingSeat?: string;
}

export interface MarketEvaluationReport {
	title: string;
	aircraftData: AircraftData[];
	customFields: Array<{
		id: string;
		label: string;
		type: 'text' | 'select';
		options?: string[];
	}>;
	marketAnalysis: {
		totalAircraft: number;
		soldCount: number;
		forSaleCount: number;
		pendingCount: number;
		avgSoldPrice: number;
		avgAskingPrice: number;
		avgDaysOnMarket: number;
		yearDistribution: Record<string, number>;
	};
	generatedAt: string;
}

export class MarketEvaluationGenerator {
	private aircraftDatabase = {
		'Textron Aviation (Cessna)': {
			'Citation Mustang': {
				defaultPassengers: 4,
				commonAvionics: ['Garmin G1000', 'Garmin G1000NXi'],
				commonEnginePrograms: ['Power Advantage Plus', 'Power Advantage', 'ESP Gold', 'None'],
				commonAirframePrograms: ['ProParts', 'None'],
			},
			'Citation Sovereign Plus': {
				defaultPassengers: 9,
				commonAvionics: ['Garmin G5000'],
				commonEnginePrograms: ['Power Advantage Plus'],
				commonAirframePrograms: ['Aux Advantage'],
			},
			'Citation CJ2': {
				defaultPassengers: 6,
				commonAvionics: ['Garmin G1000', 'Garmin G1000NXi'],
				commonEnginePrograms: ['Power Advantage Plus', 'Power Advantage'],
				commonAirframePrograms: ['ProParts', 'None'],
			},
			'Citation CJ3+': {
				defaultPassengers: 7,
				commonAvionics: ['Garmin G3000'],
				commonEnginePrograms: ['Power Advantage Plus'],
				commonAirframePrograms: ['ProParts', 'None'],
			},
		},
		Bombardier: {
			'Challenger 350': {
				defaultPassengers: 10,
				commonAvionics: ['Rockwell Collins Pro Line Fusion'],
				commonEnginePrograms: ['MSP Gold', 'ESP'],
				commonAirframePrograms: ['Smart Parts', 'None'],
			},
			'Global 7500': {
				defaultPassengers: 19,
				commonAvionics: ['Rockwell Collins Pro Line Fusion'],
				commonEnginePrograms: ['MSP Gold', 'ESP'],
				commonAirframePrograms: ['Smart Parts', 'None'],
			},
		},
		Embraer: {
			'Phenom 100': {
				defaultPassengers: 4,
				commonAvionics: ['Garmin G1000', 'Garmin G1000NXi'],
				commonEnginePrograms: ['MSP Gold', 'Power by the Hour'],
				commonAirframePrograms: ['Eagle Service Plan', 'None'],
			},
			'Phenom 300': {
				defaultPassengers: 8,
				commonAvionics: ['Garmin G1000', 'Garmin G1000NXi'],
				commonEnginePrograms: ['MSP Gold', 'Power by the Hour'],
				commonAirframePrograms: ['Eagle Service Plan', 'None'],
			},
		},
		Gulfstream: {
			G700: {
				defaultPassengers: 19,
				commonAvionics: ['Symmetry Flight Deck'],
				commonEnginePrograms: ['PlaneConnect', 'OnPoint'],
				commonAirframePrograms: ['PlaneConnect', 'None'],
			},
			G650: {
				defaultPassengers: 18,
				commonAvionics: ['PlaneView II'],
				commonEnginePrograms: ['PlaneConnect', 'OnPoint'],
				commonAirframePrograms: ['PlaneConnect', 'None'],
			},
		},
	};

	private customFields = [
		{ id: 'connectivity', label: 'Connectivity', type: 'text' as const, category: 'upgrades' },
		{
			id: 'beltedLav',
			label: 'Belted Lav',
			type: 'select' as const,
			options: ['No', 'Yes'],
			category: 'upgrades',
		},
		{
			id: 'fansCpdlc',
			label: 'FANS & CPDLC',
			type: 'select' as const,
			options: ['No', 'Yes'],
			category: 'upgrades',
		},
		{
			id: 'sideFacingSeat',
			label: 'Side Facing Seat',
			type: 'select' as const,
			options: ['No', 'Yes'],
			category: 'upgrades',
		},
	];

	async generateMarketEvaluationReport(
		manufacturer: string,
		model: string,
		aircraftIds?: string[]
	): Promise<MarketEvaluationReport> {
		// Get aircraft data from database
		const aircraftData = await this.getAircraftData(manufacturer, model, aircraftIds);

		// Calculate market analysis
		const marketAnalysis = this.calculateMarketAnalysis(aircraftData);

		return {
			title: `${manufacturer} ${model} Market Evaluation`,
			aircraftData,
			customFields: this.customFields,
			marketAnalysis,
			generatedAt: new Date().toISOString(),
		};
	}

	private async getAircraftData(
		manufacturer: string,
		model: string,
		aircraftIds?: string[]
	): Promise<AircraftData[]> {
		const whereClause: any = {
			manufacturer: {
				contains: manufacturer,
				mode: 'insensitive',
			},
			model: {
				contains: model,
				mode: 'insensitive',
			},
		};

		if (aircraftIds && aircraftIds.length > 0) {
			whereClause.id = {
				in: aircraftIds,
			};
		}

		const aircraft = await prisma.aircraft.findMany({
			where: whereClause,
			orderBy: { year: 'desc' },
		});

		return aircraft.map(aircraft => ({
			id: aircraft.id,
			manufacturer: aircraft.manufacturer,
			model: aircraft.model,
			year: aircraft.year,
			registration: aircraft.registration,
			serialNumber: aircraft.serialNumber,
			airframeHours: aircraft.totalTimeHours,
			engineProgram: this.extractEngineProgram(aircraft.specifications),
			airframeProgram: this.extractAirframeProgram(aircraft.specifications),
			avionics: this.extractAvionics(aircraft.specifications),
			paintedYear: this.extractPaintedYear(aircraft.specifications),
			interiorYear: this.extractInteriorYear(aircraft.specifications),
			passengers: this.extractPassengers(aircraft.specifications),
			damageHistory: this.extractDamageHistory(aircraft.specifications),
			location: aircraft.location,
			docDue: this.extractDocDue(aircraft.specifications),
			daysOnMarket: this.calculateDaysOnMarket(aircraft.createdAt),
			askingPrice: aircraft.askingPrice,
			expectedPrice: aircraft.price,
			soldDate: aircraft.status === 'SOLD' ? aircraft.updatedAt.toISOString().split('T')[0] : null,
			photos: aircraft.image,
			lastUpdated: aircraft.updatedAt.toISOString().split('T')[0],
			notes: aircraft.description,
			status: this.mapStatus(aircraft.status),
			// Custom fields - extract from specifications
			connectivity: this.extractConnectivity(aircraft.specifications),
			beltedLav: this.extractBeltedLav(aircraft.specifications),
			fansCpdlc: this.extractFansCpdlc(aircraft.specifications),
			sideFacingSeat: this.extractSideFacingSeat(aircraft.specifications),
		}));
	}

	private calculateMarketAnalysis(aircraftData: AircraftData[]) {
		const soldAircraft = aircraftData.filter(a => a.status === 'Sold');
		const forSaleAircraft = aircraftData.filter(a => a.status === 'For Sale');
		const pendingAircraft = aircraftData.filter(a => a.status === 'Sale Pending');

		const avgSoldPrice =
			soldAircraft.length > 0
				? soldAircraft.reduce((sum, a) => sum + (a.expectedPrice || 0), 0) / soldAircraft.length
				: 0;

		const avgAskingPrice =
			forSaleAircraft.length > 0
				? forSaleAircraft.reduce((sum, a) => sum + (a.askingPrice || 0), 0) / forSaleAircraft.length
				: 0;

		const avgDaysOnMarket =
			aircraftData.length > 0
				? aircraftData.reduce((sum, a) => sum + (a.daysOnMarket || 0), 0) / aircraftData.length
				: 0;

		const yearDistribution = aircraftData.reduce(
			(acc, a) => {
				acc[a.year.toString()] = (acc[a.year.toString()] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		return {
			totalAircraft: aircraftData.length,
			soldCount: soldAircraft.length,
			forSaleCount: forSaleAircraft.length,
			pendingCount: pendingAircraft.length,
			avgSoldPrice,
			avgAskingPrice,
			avgDaysOnMarket: Math.round(avgDaysOnMarket),
			yearDistribution,
		};
	}

	private extractEngineProgram(specifications: any): string | null {
		if (!specifications) return null;
		try {
			const specs =
				typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
			return specs.engines || specs.engineProgram || null;
		} catch {
			return null;
		}
	}

	private extractAirframeProgram(specifications: any): string | null {
		if (!specifications) return null;
		try {
			const specs =
				typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
			return specs.airframeProgram || specs.apuProgram || null;
		} catch {
			return null;
		}
	}

	private extractAvionics(specifications: any): string | null {
		if (!specifications) return null;
		try {
			const specs =
				typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
			return specs.avionics || specs.avionicsSuite || null;
		} catch {
			return null;
		}
	}

	private extractPaintedYear(specifications: any): number | null {
		if (!specifications) return null;
		try {
			const specs =
				typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
			return specs.paintedYear || specs.exteriorYear || null;
		} catch {
			return null;
		}
	}

	private extractInteriorYear(specifications: any): number | null {
		if (!specifications) return null;
		try {
			const specs =
				typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
			return specs.interiorYear || null;
		} catch {
			return null;
		}
	}

	private extractPassengers(specifications: any): number | null {
		if (!specifications) return null;
		try {
			const specs =
				typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
			return specs.passengers || null;
		} catch {
			return null;
		}
	}

	private extractDamageHistory(specifications: any): string | null {
		if (!specifications) return null;
		try {
			const specs =
				typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
			return specs.damageHistory || 'No';
		} catch {
			return 'No';
		}
	}

	private extractDocDue(specifications: any): string | null {
		if (!specifications) return null;
		try {
			const specs =
				typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
			return specs.docDue || specs.inspectionDue || null;
		} catch {
			return null;
		}
	}

	private extractConnectivity(specifications: any): string | null {
		if (!specifications) return null;
		try {
			const specs =
				typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
			return specs.connectivity || null;
		} catch {
			return null;
		}
	}

	private extractBeltedLav(specifications: any): string | null {
		if (!specifications) return null;
		try {
			const specs =
				typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
			return specs.beltedLav || 'No';
		} catch {
			return 'No';
		}
	}

	private extractFansCpdlc(specifications: any): string | null {
		if (!specifications) return null;
		try {
			const specs =
				typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
			return specs.fansCpdlc || 'No';
		} catch {
			return 'No';
		}
	}

	private extractSideFacingSeat(specifications: any): string | null {
		if (!specifications) return null;
		try {
			const specs =
				typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
			return specs.sideFacingSeat || 'No';
		} catch {
			return 'No';
		}
	}

	private calculateDaysOnMarket(createdAt: Date): number {
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - createdAt.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}

	private mapStatus(status: string): string {
		switch (status?.toUpperCase()) {
			case 'AVAILABLE':
				return 'For Sale';
			case 'SOLD':
				return 'Sold';
			case 'PENDING':
				return 'Sale Pending';
			default:
				return 'For Sale';
		}
	}

	generateHTMLReport(report: MarketEvaluationReport): string {
		const { title, aircraftData, customFields, marketAnalysis } = report;

		const columnWidth = '120px';

		return `<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px 0;
        }
        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 20px;
        }
        .logo {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            color: #333;
            font-size: 24px;
            font-weight: bold;
        }
        .tagline {
            color: #666;
            font-size: 18px;
            margin: 15px 0;
            font-weight: 500;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        th, td {
            border: 1px solid #e1e5e9;
            padding: 12px;
            text-align: center;
            min-width: ${columnWidth};
            word-wrap: break-word;
        }
        th {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            font-weight: 600;
            font-size: 14px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            border-top: 2px solid #f0f0f0;
            padding-top: 20px;
        }
        .section-header {
            background: linear-gradient(135deg, #4facfe, #00f2fe) !important;
            color: white !important;
            font-size: 16px;
            font-weight: 700;
        }
        .status-sold { background: linear-gradient(135deg, #fa709a, #fee140); }
        .status-pending { background: linear-gradient(135deg, #a8edea, #fed6e3); }
        .status-question { background: linear-gradient(135deg, #d299c2, #fef9d7); }
        .days-yellow { background: linear-gradient(135deg, #ffeaa7, #fab1a0); }
        .days-green { background: linear-gradient(135deg, #55efc4, #81ecec); }
        .disclaimer { font-size: 10px; color: #999; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <svg width="120" height="40" viewBox="0 0 400 120" style="margin-right: 16px;">
                    <text x="0" y="80" font-size="72" font-weight="bold" fill="currentColor" font-family="Arial, sans-serif">ACE</text>
                    <path d="M350 20 L380 50 L350 80 L320 50 Z" fill="currentColor" />
                    <path d="M340 30 L370 30 L355 45 Z" fill="white" />
                </svg>
                <span style="font-size: 18px; letter-spacing: 2px;">AIRCRAFT SALES</span>
            </div>
            <h1 style="margin: 20px 0; color: #333; font-size: 32px;">${title}</h1>
            <p class="tagline">TIME IS MONEY. BUY A JET.</p>
        </div>
        <table>
            <tr><th>Aircraft Status</th>${aircraftData
							.map(a => {
								let statusClass = '';
								if (a.status === 'Sold') statusClass = ' class="status-sold"';
								else if (a.status === 'Sale Pending') statusClass = ' class="status-pending"';
								else if (a.status === 'Aircraft In Question')
									statusClass = ' class="status-question"';
								return `<td${statusClass}>${a.status}</td>`;
							})
							.join('')}</tr>
            <tr><th colspan="${aircraftData.length + 1}" class="section-header">Aircraft Information</th></tr>
            <tr><th>Year of Make</th>${aircraftData.map(a => `<td>${a.year}</td>`).join('')}</tr>
            <tr><th>Serial Number</th>${aircraftData.map(a => `<td>${a.serialNumber}</td>`).join('')}</tr>
            <tr><th>Registration Number</th>${aircraftData.map(a => `<td>${a.registration}</td>`).join('')}</tr>
            <tr><th>Airframe Hours</th>${aircraftData.map(a => `<td>${a.airframeHours || '-'}</td>`).join('')}</tr>
            <tr><th>Engine Program</th>${aircraftData.map(a => `<td>${a.engineProgram || '-'}</td>`).join('')}</tr>
            <tr><th>APU Program</th>${aircraftData.map(a => `<td>${a.airframeProgram || '-'}</td>`).join('')}</tr>
            <tr><th>Avionics</th>${aircraftData.map(a => `<td>${a.avionics || '-'}</td>`).join('')}</tr>
            <tr><th>Painted Year</th>${aircraftData.map(a => `<td>${a.paintedYear || '-'}</td>`).join('')}</tr>
            <tr><th>Interior Year</th>${aircraftData.map(a => `<td>${a.interiorYear || '-'}</td>`).join('')}</tr>
            <tr><th>Passengers</th>${aircraftData.map(a => `<td>${a.passengers || '-'}</td>`).join('')}</tr>
            <tr><th>Damage History</th>${aircraftData.map(a => `<td>${a.damageHistory || 'No'}</td>`).join('')}</tr>
            <tr><th>Location</th>${aircraftData.map(a => `<td>${a.location || '-'}</td>`).join('')}</tr>
            <tr><th>Major Inspection Due</th>${aircraftData.map(a => `<td>${a.docDue || '-'}</td>`).join('')}</tr>
            <tr><th>Photos</th>${aircraftData
							.map(a =>
								a.photos
									? `<td><a href="${a.photos}" target="_blank" style="color: #667eea; text-decoration: none;">View Photos</a></td>`
									: '<td>-</td>'
							)
							.join('')}</tr>
            <tr><th colspan="${aircraftData.length + 1}" class="section-header">Aircraft Upgrades / Options</th></tr>
            ${customFields
							.filter(field => field.category === 'upgrades')
							.map(
								field =>
									`<tr><th>${field.label}</th>${aircraftData
										.map(a => `<td>${a[field.id as keyof AircraftData] || ''}</td>`)
										.join('')}</tr>`
							)
							.join('')}
            <tr><th colspan="${aircraftData.length + 1}" class="section-header">Market Information</th></tr>
            <tr><th>Days on Market</th>${aircraftData
							.map(a => {
								const days = a.daysOnMarket || 0;
								const className =
									days > 365 ? ' class="days-yellow"' : days < 31 ? ' class="days-green"' : '';
								return `<td${className}>${days}</td>`;
							})
							.join('')}</tr>
            <tr><th>Asking Price</th>${aircraftData.map(a => `<td>${a.askingPrice ? '$' + a.askingPrice.toLocaleString() : '-'}</td>`).join('')}</tr>
            <tr><th>Expected Take Price</th>${aircraftData.map(a => `<td>${a.expectedPrice ? '$' + a.expectedPrice.toLocaleString() : '-'}</td>`).join('')}</tr>
            <tr><th>Sold Date</th>${aircraftData.map(a => `<td>${a.soldDate || '-'}</td>`).join('')}</tr>
            <tr><th>Date Last Updated</th>${aircraftData.map(a => `<td>${a.lastUpdated}</td>`).join('')}</tr>
            <tr><th>Notes</th>${aircraftData.map(a => `<td>${a.notes || '-'}</td>`).join('')}</tr>
        </table>
        <div class="footer">
            <p style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">SALES@ACEAIRCRAFTSALES.COM | www.ACEAIRCRAFTSALES.COM | (714) 501-9339</p>
            <p class="disclaimer">Expected take price is based off of information provided by the seller or sellers representative and not a guarantee of an accepted price</p>
        </div>
    </div>
</body>
</html>`;
	}
}
