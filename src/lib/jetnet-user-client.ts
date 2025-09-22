import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import EncryptionService from '@/lib/encryption';
import { JetNetAPIClient } from '@/lib/jetnet-client';

/**
 * Get a JetNet API client instance with user-specific credentials
 * Returns null if user hasn't configured JetNet credentials
 */
export async function getUserJetNetClient(): Promise<JetNetAPIClient | null> {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return null;
		}

		const userSettings = await prisma.userSettings.findUnique({
			where: { userId: session.user.id },
		});

		if (!userSettings?.jetnetApiKey || !userSettings?.jetnetAuthToken) {
			return null;
		}

		// Decrypt the credentials
		const email = EncryptionService.decrypt(userSettings.jetnetApiKey);
		const password = EncryptionService.decrypt(userSettings.jetnetAuthToken);
		const baseUrl = userSettings.jetnetBaseUrl || 'https://customer.jetnetconnect.com/api';

		// Create a new JetNet client instance with user credentials
		return new JetNetAPIClient(email, password, baseUrl);
	} catch (error) {
		console.error('Error getting user JetNet client:', error);
		return null;
	}
}

/**
 * Check if user has JetNet credentials configured
 */
export async function hasUserJetNetCredentials(): Promise<boolean> {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return false;
		}

		const userSettings = await prisma.userSettings.findUnique({
			where: { userId: session.user.id },
		});

		return !!(userSettings?.jetnetApiKey && userSettings?.jetnetAuthToken);
	} catch (error) {
		console.error('Error checking user JetNet credentials:', error);
		return false;
	}
}
