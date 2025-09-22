import * as Stripe from 'stripe';

// Make Stripe optional for build - use dummy key if not set
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build';

export const stripe = new (Stripe as any)(stripeSecretKey, {
	apiVersion: '2024-06-20',
});

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS = {
	FREE: {
		name: 'Free',
		description: 'Perfect for getting started',
		priceId: null, // No Stripe price for free plan
		amount: 0,
		currency: 'USD',
		billingCycle: 'monthly' as const,
		features: {
			maxAircraftSearches: 10,
			maxReportsPerMonth: 2,
			maxContacts: 50,
			maxApiCallsPerMonth: 100,
			maxStorageGB: 0.5,
			hasAdvancedAnalytics: false,
			hasCustomBranding: false,
			hasPrioritySupport: false,
			hasApiAccess: false,
			hasWhiteLabel: false,
			hasCustomIntegrations: false,
			hasJetNetAccess: false, // JetNet requires paid subscription
		},
		trialDays: null,
	},
	STARTER: {
		name: 'Starter',
		description: 'For small aircraft dealers',
		priceId: process.env.STRIPE_STARTER_PRICE_ID,
		amount: 29,
		currency: 'USD',
		billingCycle: 'monthly' as const,
		features: {
			maxAircraftSearches: 100,
			maxReportsPerMonth: 10,
			maxContacts: 500,
			maxApiCallsPerMonth: 1000,
			maxStorageGB: 2,
			hasAdvancedAnalytics: false,
			hasCustomBranding: false,
			hasPrioritySupport: false,
			hasApiAccess: true,
			hasWhiteLabel: false,
			hasCustomIntegrations: false,
			hasJetNetAccess: false, // JetNet requires Professional or higher
		},
		trialDays: 14,
	},
	PROFESSIONAL: {
		name: 'Professional',
		description: 'For growing aircraft businesses',
		priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
		amount: 99,
		currency: 'USD',
		billingCycle: 'monthly' as const,
		features: {
			maxAircraftSearches: 500,
			maxReportsPerMonth: 50,
			maxContacts: 2000,
			maxApiCallsPerMonth: 5000,
			maxStorageGB: 10,
			hasAdvancedAnalytics: true,
			hasCustomBranding: true,
			hasPrioritySupport: true,
			hasApiAccess: true,
			hasWhiteLabel: false,
			hasCustomIntegrations: true,
			hasJetNetAccess: true, // JetNet access included
		},
		trialDays: 14,
	},
	ENTERPRISE: {
		name: 'Enterprise',
		description: 'For large aircraft operations',
		priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
		amount: 299,
		currency: 'USD',
		billingCycle: 'monthly' as const,
		features: {
			maxAircraftSearches: -1, // Unlimited
			maxReportsPerMonth: -1, // Unlimited
			maxContacts: -1, // Unlimited
			maxApiCallsPerMonth: -1, // Unlimited
			maxStorageGB: 100,
			hasAdvancedAnalytics: true,
			hasCustomBranding: true,
			hasPrioritySupport: true,
			hasApiAccess: true,
			hasWhiteLabel: true,
			hasCustomIntegrations: true,
			hasJetNetAccess: true, // JetNet access included
		},
		trialDays: 30,
	},
} as const;

// JetNet API Access Requirements
export const JETNET_REQUIREMENTS = {
	description: 'JetNet API Access',
	requirements: [
		'Professional or Enterprise subscription required',
		'Separate JetNet subscription from JetNet Connect required',
		'Valid JetNet API credentials (API Key + Auth Token)',
		'JetNet subscription must be active and in good standing',
	],
	pricing: {
		note: 'JetNet API access is a separate subscription service provided by JetNet Connect',
		cost: 'Contact JetNet Connect for pricing',
		website: 'https://customer.jetnetconnect.com',
	},
	features: [
		'Real-time aircraft data',
		'Aircraft search and filtering',
		'Market intelligence reports',
		'Aircraft specifications and history',
		'Ownership and registration data',
	],
};

// Stripe Webhook Event Types
export const STRIPE_WEBHOOK_EVENTS = {
	CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',
	CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
	CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
	INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
	INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
	CUSTOMER_CREATED: 'customer.created',
	CUSTOMER_UPDATED: 'customer.updated',
} as const;

// Helper Functions
export function getPlanByPriceId(priceId: string) {
	return Object.values(SUBSCRIPTION_PLANS).find(plan => plan.priceId === priceId);
}

export function getPlanByName(planName: keyof typeof SUBSCRIPTION_PLANS) {
	return SUBSCRIPTION_PLANS[planName];
}

export function formatPrice(amount: number, currency: string = 'USD') {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
	}).format(amount / 100);
}

export function isJetNetAccessIncluded(planName: keyof typeof SUBSCRIPTION_PLANS) {
	return SUBSCRIPTION_PLANS[planName].features.hasJetNetAccess;
}

// Usage Limits Helper
export function checkUsageLimit(
	currentUsage: number,
	limit: number,
	feature: string
): { allowed: boolean; remaining: number; limit: number } {
	if (limit === -1) {
		return { allowed: true, remaining: -1, limit: -1 }; // Unlimited
	}

	const remaining = Math.max(0, limit - currentUsage);
	const allowed = currentUsage < limit;

	return { allowed, remaining, limit };
}

// Subscription Status Helper
export function getSubscriptionStatus(stripeStatus: string) {
	const statusMap: Record<string, string> = {
		active: 'ACTIVE',
		canceled: 'CANCELED',
		past_due: 'PAST_DUE',
		unpaid: 'UNPAID',
		trialing: 'TRIALING',
		incomplete: 'INCOMPLETE',
		incomplete_expired: 'INCOMPLETE_EXPIRED',
		paused: 'PAUSED',
	};

	return statusMap[stripeStatus] || 'UNKNOWN';
}

// Billing Cycle Helper
export function getBillingCycle(interval: string, intervalCount: number = 1) {
	if (interval === 'month' && intervalCount === 1) return 'MONTHLY';
	if (interval === 'year' && intervalCount === 1) return 'YEARLY';
	return 'MONTHLY'; // Default fallback
}
