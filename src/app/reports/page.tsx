'use client';

import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { PageLayout } from '@/components/page-layout';

export default function ReportsPage() {
	return (
		<PageLayout
			title="Analytics & Reports"
			description="Generate detailed reports and visualize key metrics for aircraft listings and market trends."
		>
			<AnalyticsDashboard />
		</PageLayout>
	);
}
