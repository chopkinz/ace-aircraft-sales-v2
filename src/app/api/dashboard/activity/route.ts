import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { cacheManager } from '@/lib/cache-manager';
import { logger } from '@/lib/logger';

export async function GET() {
	try {
		const session = await getServerSession(authOptions);

		if (!session) {
			return NextResponse.json(
				{ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
				{ status: 401 }
			);
		}

		const cacheKey = `dashboard_activity:${session.user.id}`;

		const activities = await cacheManager.cache(
			cacheKey,
			async () => {
				// Get recent user activities
				const userActivities = await prisma.userActivity.findMany({
					where: { userId: session.user.id },
					orderBy: { createdAt: 'desc' },
					take: 20,
					include: {
						user: {
							select: {
								name: true,
								email: true,
							},
						},
					},
				});

				// Get recent contact activities
				const contactActivities = await prisma.contactActivity.findMany({
					where: {
						contact: {
							userId: session.user.id,
						},
					},
					orderBy: { date: 'desc' },
					take: 10,
					include: {
						contact: {
							select: {
								firstName: true,
								lastName: true,
							},
						},
					},
				});

				// Get recent opportunity activities
				const opportunityActivities = await prisma.opportunityActivity.findMany({
					where: {
						opportunity: {
							userId: session.user.id,
						},
					},
					orderBy: { date: 'desc' },
					take: 10,
					include: {
						opportunity: {
							select: {
								title: true,
							},
						},
					},
				});

				// Combine and format activities
				const allActivities = [
					...userActivities.map(activity => ({
						id: activity.id,
						type: 'system',
						description: `${activity.action} ${activity.resource}`,
						timestamp: activity.createdAt.toISOString(),
						user: activity.user.name || activity.user.email,
						metadata: activity.details,
					})),
					...contactActivities.map(activity => ({
						id: activity.id,
						type: 'contact',
						description: `${activity.type}: ${activity.title}`,
						timestamp: activity.date.toISOString(),
						user: `${activity.contact.firstName} ${activity.contact.lastName}`,
						metadata: { description: activity.description },
					})),
					...opportunityActivities.map(activity => ({
						id: activity.id,
						type: 'opportunity',
						description: `${activity.type}: ${activity.title}`,
						timestamp: activity.date.toISOString(),
						user: activity.opportunity.title,
						metadata: { description: activity.description },
					})),
				];

				// Sort by timestamp and return top 15
				return allActivities
					.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
					.slice(0, 15);
			},
			180
		); // Cache for 3 minutes

		logger.info('Dashboard activity retrieved', {
			userId: session.user.id,
			activityCount: activities.length,
		});

		return NextResponse.json({
			success: true,
			data: activities,
			metadata: {
				timestamp: new Date().toISOString(),
				source: 'Database',
				cached: true,
			},
		});
	} catch (error) {
		logger.error('Dashboard activity error', error as Error);

		return NextResponse.json(
			{
				success: false,
				error: {
					code: 'DASHBOARD_ACTIVITY_ERROR',
					message: error instanceof Error ? error.message : 'Failed to load dashboard activity',
				},
				metadata: {
					timestamp: new Date().toISOString(),
					source: 'Error Handler',
				},
			},
			{ status: 500 }
		);
	}
}
