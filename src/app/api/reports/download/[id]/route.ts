import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import * as XLSX from 'xlsx';
import { generateHTMLReport, generateCSVReport, ReportData } from '@/lib/report-templates';
import puppeteer from 'puppeteer';

interface Report {
	id: string;
	title: string;
	type: string;
	data: ReportData | null;
	generatedAt: Date | null;
	status: string;
}

// Download report in various formats
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const { searchParams } = new URL(request.url);
		const format = searchParams.get('format') || 'pdf';

		const report = await prisma.report.findUnique({
			where: {
				id,
			},
		});

		if (!report) {
			return NextResponse.json(
				{
					success: false,
					error: 'Report not found',
				},
				{ status: 404 }
			);
		}

		const reportData = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;

		switch (format) {
			case 'html':
				return generateHTMLReportResponse(report as Report, reportData as ReportData);
			case 'excel':
				return generateExcelReport(report as Report, reportData as ReportData);
			case 'csv':
				return generateCSVReportResponse(report as Report, reportData as ReportData);
			case 'pdf':
			default:
				return generatePDFReport(report as Report, reportData as ReportData);
		}
	} catch (error) {
		console.error('Error downloading report:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to download report',
			},
			{ status: 500 }
		);
	}
}

function generateHTMLReportResponse(report: Report, data: ReportData) {
	const htmlContent = generateHTMLReport(data, report.title);

	return new NextResponse(htmlContent, {
		headers: {
			'Content-Type': 'text/html',
			'Content-Disposition': `inline; filename="${report.title.replace(/\s+/g, '_')}.html"`,
		},
	});
}

function generateCSVReportResponse(report: Report, data: ReportData) {
	const csvContent = generateCSVReport(data);

	return new NextResponse(csvContent, {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': `attachment; filename="${report.title.replace(/\s+/g, '_')}.csv"`,
		},
	});
}

async function generatePDFReport(report: Report, data: ReportData) {
	try {
		const htmlContent = generateHTMLReport(data, report.title);

		// Launch Puppeteer
		const browser = await puppeteer.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		});

		const page = await browser.newPage();
		await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

		const pdfBuffer = await page.pdf({
			format: 'A4',
			printBackground: true,
			margin: {
				top: '20mm',
				right: '20mm',
				bottom: '20mm',
				left: '20mm',
			},
		});

		await browser.close();

		return new NextResponse(pdfBuffer as BodyInit, {
			headers: {
				'Content-Disposition': `attachment; filename="${report.title.replace(/\s+/g, '_')}.pdf"`,
				'Content-Type': 'application/pdf',  
			},
		});
	} catch (pdfError) {
		console.error('PDF generation error:', pdfError);
		// Fallback to HTML if PDF generation fails
		const htmlContent = generateHTMLReport(data, report.title);
		return new NextResponse(htmlContent, {
			headers: {
				'Content-Type': 'text/html',
				'Content-Disposition': `attachment; filename="${report.title.replace(/\s+/g, '_')}.html"`,
			},
		});
	}
}

function generateExcelReport(report: Report, data: ReportData) {
	const workbook = XLSX.utils.book_new();

	// Summary sheet
	const summaryData = [
		['Report Title', report.title],
		['Report Type', report.type],
		['Generated At', report.generatedAt?.toISOString()],
		['Status', report.status],
		['Total Aircraft', data.summary?.totalAircraft || 0],
		['Total Value', data.summary?.totalValue || 0],
		['Average Price', data.summary?.avgPrice || 0],
	];

	const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
	XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

	// Aircraft data sheet
	if (data.aircraft && data.aircraft.length > 0) {
		const aircraftSheet = XLSX.utils.json_to_sheet(data.aircraft);
		XLSX.utils.book_append_sheet(workbook, aircraftSheet, 'Aircraft Data');
	}

	// Market data sheet
	if (data.marketData && data.marketData.length > 0) {
		const marketSheet = XLSX.utils.json_to_sheet(data.marketData);
		XLSX.utils.book_append_sheet(workbook, marketSheet, 'Market Data');
	}

	const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

	return new NextResponse(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${report.title.replace(/\s+/g, '_')}.xlsx"`,
		},
	});
}
