import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import JetNetComprehensiveClient from '@/lib/jetnet-comprehensive-client';
import { prisma } from '@/lib/database';

export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		console.log('session', session);
		// Temporarily bypass authentication for testing
		// if (!session?.user?.id) {
		// 	return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		// }

		console.log('🚀 Starting comprehensive JetNet sync with real API integration...');

		// Initialize JetNet client with real credentials
		const jetnetClient = new JetNetComprehensiveClient({
			email: 'chase@theskylinebusinessgroup.com',
			password: 'Smiley654!',
		});

		// Run the complete comprehensive sync workflow
		const result = await jetnetClient.runComprehensiveSync();

		if (!result.success) {
			console.error('❌ Comprehensive sync failed:', result.summary);
			return NextResponse.json(
				{
					message: 'Comprehensive sync failed',
					error: result.summary.error,
					summary: result.summary,
				},
				{ status: 500 }
			);
		}

		console.log('✅ Comprehensive sync completed successfully');
		console.log(`📊 Processed ${result.count} aircraft`);
		console.log(
			`💾 Database: ${result.summary.dataProcessed.databaseCreated} created, ${result.summary.dataProcessed.databaseUpdated} updated`
		);

		// Store sync log
		try {
			await prisma.syncLog.create({
				data: {
					status: 'COMPLETED',
					startedAt: new Date(result.summary.startTime),
					completedAt: new Date(result.summary.endTime),
					recordsProcessed: result.count,
					recordsCreated: result.summary.dataProcessed.databaseCreated,
					recordsUpdated: result.summary.dataProcessed.databaseUpdated,
					errorCount: result.summary.errorCount,
					details: JSON.stringify({
						workflowId: result.summary.workflowId,
						duration: result.summary.totalDuration,
						successRate: result.summary.successRate,
						reportsGenerated: result.summary.reportsGenerated,
					}),
				},
			});
		} catch (logError) {
			console.warn('Failed to log sync operation:', logError);
		}

		return NextResponse.json({
			message: 'Comprehensive JetNet sync completed successfully',
			summary: {
				totalProcessed: result.count,
				created: result.summary.dataProcessed.databaseCreated,
				updated: result.summary.dataProcessed.databaseUpdated,
				errors: result.summary.errorCount,
				successRate: result.summary.successRate,
				duration: result.summary.totalDuration,
				workflowId: result.summary.workflowId,
			},
			data: {
				aircraftCount: result.count,
				marketAnalysis: result.reports?.marketAnalysis,
				executiveSummary: result.reports?.executiveSummary,
			},
			reports: result.reports,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('❌ Comprehensive sync error:', error);

		// Log failed sync
		try {
			await prisma.syncLog.create({
				data: {
					status: 'FAILED',
					startedAt: new Date(),
					completedAt: new Date(),
					recordsProcessed: 0,
					recordsCreated: 0,
					recordsUpdated: 0,
					errorCount: 1,
					details: JSON.stringify({
						error: String(error?.message || error),
						timestamp: new Date().toISOString(),
					}),
				},
			});
		} catch (logError) {
			console.warn('Failed to log failed sync:', logError);
		}

		return NextResponse.json(
			{
				message: 'Comprehensive sync failed',
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions);

		// Temporarily bypass authentication for testing
		// if (!session?.user?.id) {
		// 	return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		// }

		// Get recent sync logs
		const recentSyncs = await prisma.syncLog.findMany({
			take: 10,
			orderBy: { startedAt: 'desc' },
		});

		// Get current database stats
		const [totalAircraft, activeListings, priceStats] = await Promise.all([
			prisma.aircraft.count(),
			prisma.aircraft.count({ where: { forSale: true } }),
			prisma.aircraft.aggregate({
				_sum: { price: true },
				where: { price: { not: null } },
			}),
		]);

		return NextResponse.json({
			message: 'JetNet comprehensive sync status',
			currentStats: {
				totalAircraft,
				activeListings,
				totalValue: priceStats._sum.price || 0,
			},
			recentSyncs: recentSyncs.map(sync => ({
				id: sync.id,
				status: sync.status,
				startedAt: sync.startedAt,
				completedAt: sync.completedAt,
				recordsProcessed: sync.recordsProcessed,
				recordsCreated: sync.recordsCreated,
				recordsUpdated: sync.recordsUpdated,
				errorCount: sync.errorCount,
				duration: sync.completedAt
					? `${Math.round((sync.completedAt.getTime() - sync.startedAt.getTime()) / 1000)}s`
					: 'In Progress',
			})),
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Error fetching sync status:', error);
		return NextResponse.json(
			{
				message: 'Failed to fetch sync status',
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}
