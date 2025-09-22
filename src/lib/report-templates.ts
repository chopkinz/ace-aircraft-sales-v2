export interface ReportData {
	aircraft: Record<string, unknown>[];
	marketData: Record<string, unknown>[];
	summary: {
		totalAircraft: number;
		totalValue: number;
		avgPrice: number;
		manufacturers: string[];
		generatedAt: Date;
	};
}

export function generateHTMLReport(
	data: ReportData,
	title: string = 'Aircraft Market Report'
): string {
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(date);
	};

	return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background: #ffffff;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .header .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
            font-weight: 300;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .summary-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            border: 1px solid #e5e7eb;
            text-align: center;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .summary-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .summary-card h3 {
            font-size: 0.9rem;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }

        .summary-card .value {
            font-size: 2rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 5px;
        }

        .summary-card .value.price {
            color: #059669;
        }

        .summary-card .description {
            font-size: 0.9rem;
            color: #6b7280;
        }

        .section {
            margin-bottom: 40px;
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
        }

        .aircraft-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }

        .aircraft-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            border: 1px solid #e5e7eb;
            overflow: hidden;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .aircraft-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .aircraft-header {
            padding: 20px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-bottom: 1px solid #e5e7eb;
        }

        .aircraft-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 5px;
        }

        .aircraft-subtitle {
            font-size: 0.9rem;
            color: #6b7280;
        }

        .aircraft-price {
            font-size: 1.5rem;
            font-weight: 700;
            color: #059669;
            margin-top: 10px;
        }

        .aircraft-details {
            padding: 20px;
        }

        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
        }

        .detail-row:last-child {
            border-bottom: none;
        }

        .detail-label {
            font-size: 0.9rem;
            color: #6b7280;
            font-weight: 500;
        }

        .detail-value {
            font-size: 0.9rem;
            color: #1f2937;
            font-weight: 600;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-active {
            background: #d1fae5;
            color: #065f46;
        }

        .status-pending {
            background: #fef3c7;
            color: #92400e;
        }

        .status-sold {
            background: #fee2e2;
            color: #991b1b;
        }

        .footer {
            margin-top: 60px;
            padding: 30px 0;
            text-align: center;
            background: #f8fafc;
            border-radius: 12px;
            color: #6b7280;
        }

        .footer .generated {
            font-size: 0.9rem;
            margin-bottom: 10px;
        }

        .footer .company {
            font-size: 1rem;
            font-weight: 600;
            color: #374151;
        }

        @media print {
            body {
                background: white;
            }

            .container {
                max-width: none;
                padding: 0;
            }

            .aircraft-card:hover,
            .summary-card:hover {
                transform: none;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            }
        }

        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }

            .header h1 {
                font-size: 2rem;
            }

            .summary-grid {
                grid-template-columns: 1fr;
            }

            .aircraft-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
            <div class="subtitle">Comprehensive Aircraft Market Analysis</div>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <h3>Total Aircraft</h3>
                <div class="value">${data.summary.totalAircraft}</div>
                <div class="description">Aircraft Listed</div>
            </div>
            <div class="summary-card">
                <h3>Total Value</h3>
                <div class="value price">${formatCurrency(data.summary.totalValue)}</div>
                <div class="description">Combined Market Value</div>
            </div>
            <div class="summary-card">
                <h3>Average Price</h3>
                <div class="value price">${formatCurrency(data.summary.avgPrice)}</div>
                <div class="description">Per Aircraft</div>
            </div>
            <div class="summary-card">
                <h3>Manufacturers</h3>
                <div class="value">${data.summary.manufacturers.length}</div>
                <div class="description">Different Brands</div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Aircraft Inventory</h2>
            <div class="aircraft-grid">
                ${data.aircraft
									.map(
										aircraft => `
                    <div class="aircraft-card">
                        <div class="aircraft-header">
                            <div class="aircraft-title">${aircraft.manufacturer} ${
											aircraft.model
										}</div>
                            <div class="aircraft-subtitle">${aircraft.variant || ''} • ${
											aircraft.year || 'N/A'
										}</div>
                            <div class="aircraft-price">${
															aircraft.price
																? formatCurrency(aircraft.price as number)
																: 'Price N/A'
														}</div>
                        </div>
                        <div class="aircraft-details">
                            <div class="detail-row">
                                <span class="detail-label">Registration</span>
                                <span class="detail-value">${aircraft.registration || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Serial Number</span>
                                <span class="detail-value">${aircraft.serialNumber || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Location</span>
                                <span class="detail-value">${aircraft.location || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Total Hours</span>
                                <span class="detail-value">${
																	aircraft.totalTimeHours
																		? aircraft.totalTimeHours.toLocaleString()
																		: 'N/A'
																}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Status</span>
                                <span class="detail-value">
                                    <span class="status-badge status-${
																			(aircraft.status as string)?.toLowerCase() || 'pending'
																		}">
                                        ${aircraft.status || 'Unknown'}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                `
									)
									.join('')}
            </div>
        </div>

        <div class="footer">
            <div class="generated">Report generated on ${formatDate(data.summary.generatedAt)}</div>
            <div class="company">ACE Aircraft Sales - Market Analysis Report</div>
        </div>
    </div>
</body>
</html>
  `;
}

export function generateCSVReport(data: ReportData): string {
	const headers = [
		'Manufacturer',
		'Model',
		'Variant',
		'Year',
		'Registration',
		'Serial Number',
		'Price',
		'Location',
		'Status',
		'Total Hours',
		'Engine Hours',
		'For Sale',
		'Date Listed',
	];

	const rows = data.aircraft.map(aircraft => [
		aircraft.manufacturer || '',
		aircraft.model || '',
		aircraft.variant || '',
		aircraft.year || '',
		aircraft.registration || '',
		aircraft.serialNumber || '',
		aircraft.price || '',
		aircraft.location || '',
		aircraft.status || '',
		aircraft.totalTimeHours || '',
		aircraft.engineHours || '',
		aircraft.forSale ? 'Yes' : 'No',
		aircraft.dateListed ? new Date(aircraft.dateListed as string).toLocaleDateString() : '',
	]);

	const csvContent = [headers, ...rows]
		.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
		.join('\n');

	return csvContent;
}
