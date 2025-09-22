'use client';

import { AircraftMarketEvaluation } from '@/components/aircraft-market-evaluation';
import { PageLayout } from '@/components/page-layout';

export default function AircraftPage() {
	return (
		<PageLayout
			title="Aircraft Database"
			description="Browse and manage all aircraft listings with advanced filtering and detailed market data."
		>
			<AircraftMarketEvaluation />
		</PageLayout>
	);
}
