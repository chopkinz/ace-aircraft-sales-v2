'use client';

import * as XLSX from 'xlsx';

export interface AircraftExportData {
	id: string;
	manufacturer: string;
	model: string;
	year: number;
	price: number;
	askingPrice: string;
	currency: string;
	location: string;
	status: string;
	forSale: boolean;
	registration: string;
	serialNumber: string;
	totalTimeHours: number;
	engineHours: number;
	description: string;
	imageUrl: string;
	specifications: any;
	features: any;
	contactInfo: any;
	marketData: any;
	maintenanceData: any;
	ownershipData: any;
	createdAt: string;
	updatedAt: string;
}

export interface ExportOptions {
	format: 'csv' | 'excel' | 'pdf';
	filename?: string;
	includeImages?: boolean;
	includeSpecifications?: boolean;
	includeContactInfo?: boolean;
	includeMarketData?: boolean;
	includeMaintenanceData?: boolean;
	includeOwnershipData?: boolean;
	columns?: string[];
}

export class AircraftExporter {
	static exportToCSV(
		aircraft: AircraftExportData[],
		options: ExportOptions = { format: 'csv' }
	): void {
		const filename =
			options.filename || `aircraft_export_${new Date().toISOString().split('T')[0]}.csv`;

		// Define columns to export
		const columns = options.columns || [
			'manufacturer',
			'model',
			'year',
			'price',
			'askingPrice',
			'currency',
			'location',
			'status',
			'forSale',
			'registration',
			'serialNumber',
			'totalTimeHours',
			'engineHours',
			'description',
			'createdAt',
			'updatedAt',
		];

		// Create CSV headers
		const headers = columns.map(col => this.formatColumnName(col));

		// Create CSV rows
		const rows = aircraft.map(aircraft =>
			columns.map(col => {
				const value = aircraft[col as keyof AircraftExportData];
				if (value === null || value === undefined) return '';
				if (typeof value === 'object') return JSON.stringify(value);
				if (typeof value === 'boolean') return value ? 'Yes' : 'No';
				return String(value);
			})
		);

		// Combine headers and rows
		const csvContent = [headers, ...rows]
			.map(row => row.map(cell => `"${cell}"`).join(','))
			.join('\n');

		// Create and download file
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(link.href);
	}

	static exportToExcel(
		aircraft: AircraftExportData[],
		options: ExportOptions = { format: 'excel' }
	): void {
		const filename =
			options.filename || `aircraft_export_${new Date().toISOString().split('T')[0]}.xlsx`;

		// Define columns to export
		const columns = options.columns || [
			'manufacturer',
			'model',
			'year',
			'price',
			'askingPrice',
			'currency',
			'location',
			'status',
			'forSale',
			'registration',
			'serialNumber',
			'totalTimeHours',
			'engineHours',
			'description',
			'createdAt',
			'updatedAt',
		];

		// Prepare data for Excel
		const excelData = aircraft.map(aircraft => {
			const row: any = {};
			columns.forEach(col => {
				const value = aircraft[col as keyof AircraftExportData];
				if (value === null || value === undefined) {
					row[this.formatColumnName(col)] = '';
				} else if (typeof value === 'object') {
					row[this.formatColumnName(col)] = JSON.stringify(value);
				} else if (typeof value === 'boolean') {
					row[this.formatColumnName(col)] = value ? 'Yes' : 'No';
				} else {
					row[this.formatColumnName(col)] = value;
				}
			});
			return row;
		});

		// Create workbook
		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.json_to_sheet(excelData);

		// Set column widths
		const colWidths = columns.map(col => ({
			wch: Math.max(15, this.formatColumnName(col).length + 5),
		}));
		ws['!cols'] = colWidths;

		// Add worksheet to workbook
		XLSX.utils.book_append_sheet(wb, ws, 'Aircraft Data');

		// Add summary sheet
		if (aircraft.length > 0) {
			const summaryData = this.generateSummaryData(aircraft);
			const summaryWs = XLSX.utils.json_to_sheet(summaryData);
			XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
		}

		// Save file
		XLSX.writeFile(wb, filename);
	}

	static exportToPDF(
		aircraft: AircraftExportData[],
		options: ExportOptions = { format: 'pdf' }
	): void {
		// For PDF export, we'll generate HTML and use browser print functionality
		const filename =
			options.filename || `aircraft_export_${new Date().toISOString().split('T')[0]}.pdf`;

		const htmlContent = this.generatePDFHTML(aircraft, options);

		// Create new window for printing
		const printWindow = window.open('', '_blank');
		if (printWindow) {
			printWindow.document.write(htmlContent);
			printWindow.document.close();
			printWindow.focus();

			// Wait for content to load, then print
			setTimeout(() => {
				printWindow.print();
				printWindow.close();
			}, 1000);
		}
	}

	private static formatColumnName(column: string): string {
		return column
			.replace(/([A-Z])/g, ' $1')
			.replace(/^./, str => str.toUpperCase())
			.trim();
	}

	private static generateSummaryData(aircraft: AircraftExportData[]): any[] {
		const totalAircraft = aircraft.length;
		const totalValue = aircraft.reduce((sum, a) => sum + (a.price || 0), 0);
		const avgPrice = totalValue / totalAircraft;
		const manufacturers = [...new Set(aircraft.map(a => a.manufacturer))];
		const statuses = [...new Set(aircraft.map(a => a.status))];
		const locations = [...new Set(aircraft.map(a => a.location))];

		return [
			{ Metric: 'Total Aircraft', Value: totalAircraft },
			{ Metric: 'Total Value', Value: `$${totalValue.toLocaleString()}` },
			{ Metric: 'Average Price', Value: `$${avgPrice.toLocaleString()}` },
			{ Metric: 'Manufacturers', Value: manufacturers.length },
			{ Metric: 'Statuses', Value: statuses.length },
			{ Metric: 'Locations', Value: locations.length },
			{ Metric: 'Export Date', Value: new Date().toLocaleString() },
		];
	}

	private static generatePDFHTML(aircraft: AircraftExportData[], options: ExportOptions): string {
		const columns = options.columns || [
			'manufacturer',
			'model',
			'year',
			'price',
			'location',
			'status',
			'registration',
			'totalTimeHours',
		];

		const headers = columns.map(col => this.formatColumnName(col));

		const rows = aircraft.map(aircraft =>
			columns.map(col => {
				const value = aircraft[col as keyof AircraftExportData];
				if (value === null || value === undefined) return '';
				if (typeof value === 'object') return JSON.stringify(value);
				if (typeof value === 'boolean') return value ? 'Yes' : 'No';
				return String(value);
			})
		);

		return `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Aircraft Export Report</title>
				<style>
					body { font-family: Arial, sans-serif; margin: 20px; }
					.header { text-align: center; margin-bottom: 30px; }
					.header h1 { color: #1976d2; margin: 0; }
					.header p { color: #666; margin: 5px 0; }
					table { width: 100%; border-collapse: collapse; margin-top: 20px; }
					th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
					th { background-color: #f5f5f5; font-weight: bold; }
					tr:nth-child(even) { background-color: #f9f9f9; }
					.summary { margin-bottom: 30px; padding: 20px; background-color: #f5f5f5; border-radius: 5px; }
					.summary h2 { margin-top: 0; color: #1976d2; }
					@media print {
						body { margin: 0; }
						.header { margin-bottom: 20px; }
					}
				</style>
			</head>
			<body>
				<div class="header">
					<h1>ACE Aircraft Sales</h1>
					<h2>Aircraft Database Export Report</h2>
					<p>Generated on: ${new Date().toLocaleString()}</p>
					<p>Total Aircraft: ${aircraft.length}</p>
				</div>

				<div class="summary">
					<h2>Summary Statistics</h2>
					${this.generateSummaryData(aircraft)
						.map(item => `<p><strong>${item.Metric}:</strong> ${item.Value}</p>`)
						.join('')}
				</div>

				<table>
					<thead>
						<tr>
							${headers.map(header => `<th>${header}</th>`).join('')}
						</tr>
					</thead>
					<tbody>
						${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
					</tbody>
				</table>
			</body>
			</html>
		`;
	}

	static exportAircraft(aircraft: AircraftExportData[], options: ExportOptions): void {
		switch (options.format) {
			case 'csv':
				this.exportToCSV(aircraft, options);
				break;
			case 'excel':
				this.exportToExcel(aircraft, options);
				break;
			case 'pdf':
				this.exportToPDF(aircraft, options);
				break;
			default:
				throw new Error(`Unsupported export format: ${options.format}`);
		}
	}
}

export default AircraftExporter;
