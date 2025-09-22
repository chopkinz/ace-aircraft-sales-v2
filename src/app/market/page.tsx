'use client';

import { MarketAnalysis } from '@/components/market-analysis';
import { PageLayout } from '@/components/page-layout';

export default function MarketPage() {
	return (
		<PageLayout
			title="Market Analysis"
			description="Comprehensive market insights and trend analysis for the aircraft industry."
		>
			<MarketAnalysis />
		</PageLayout>
	);
}
