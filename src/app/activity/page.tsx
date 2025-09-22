'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { PageLayout } from '@/components/page-layout';
import { Activity, RefreshCw, Database, Clock } from 'lucide-react';

interface ActivityItem {
	id: string;
	type: string;
	description: string;
	timestamp: string;
	status: 'success' | 'error' | 'pending';
	details?: string;
}

export default function ActivityPage() {
	const [activities, setActivities] = useState<ActivityItem[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchActivities = async () => {
		try {
			setLoading(true);
			// Mock data for now - replace with actual API call
			const mockActivities: ActivityItem[] = [
				{
					id: '1',
					type: 'sync',
					description: 'JetNet aircraft data sync completed',
					timestamp: new Date().toISOString(),
					status: 'success',
					details: 'Synced 1,247 aircraft records',
				},
				{
					id: '2',
					type: 'update',
					description: 'Market analysis updated',
					timestamp: new Date(Date.now() - 3600000).toISOString(),
					status: 'success',
					details: 'Updated pricing trends for Q4 2024',
				},
				{
					id: '3',
					type: 'export',
					description: 'Data export completed',
					timestamp: new Date(Date.now() - 7200000).toISOString(),
					status: 'success',
					details: 'Exported 500 aircraft records to CSV',
				},
			];
			setActivities(mockActivities);
		} catch (error) {
			console.error('Failed to fetch activities:', error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchActivities();
	}, []);

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'success':
				return 'text-green-600 bg-green-100';
			case 'error':
				return 'text-red-600 bg-red-100';
			case 'pending':
				return 'text-yellow-600 bg-yellow-100';
			default:
				return 'text-gray-600 bg-gray-100';
		}
	};

	const getTypeIcon = (type: string) => {
		switch (type) {
			case 'sync':
				return <RefreshCw className="h-4 w-4" />;
			case 'update':
				return <Database className="h-4 w-4" />;
			case 'export':
				return <Activity className="h-4 w-4" />;
			default:
				return <Activity className="h-4 w-4" />;
		}
	};

	return (
		<PageLayout
			title="System Activity"
			description="Monitor system activities, sync operations, and recent changes."
		>
			<Card className="card-modern-mobile">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Activity className="h-5 w-5" />
						Recent Activity
					</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex justify-center py-8">
							<LoadingSpinner />
						</div>
					) : (
						<div className="space-y-4">
							{activities.map(activity => (
								<div
									key={activity.id}
									className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
								>
									<div className="flex-shrink-0 p-2 rounded-full bg-primary/10 text-primary">
										{getTypeIcon(activity.type)}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<span className="font-medium">{activity.description}</span>
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
													activity.status
												)}`}
											>
												{activity.status}
											</span>
										</div>
										{activity.details && (
											<p className="text-sm text-muted-foreground mb-2">{activity.details}</p>
										)}
										<div className="flex items-center gap-1 text-xs text-muted-foreground">
											<Clock className="h-3 w-3" />
											{new Date(activity.timestamp).toLocaleString()}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</PageLayout>
	);
}
