import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import EncryptionService from '@/lib/encryption';

// GET - Retrieve JetNet credentials (encrypted)
export async function GET() {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userSettings = await prisma.userSettings.findUnique({
			where: { userId: session.user.id },
		});

		if (!userSettings) {
			return NextResponse.json({
				jetnetConfigured: false,
				jetnetBaseUrl: 'https://customer.jetnetconnect.com/api',
			});
		}

		// Return configuration status without exposing encrypted credentials
		return NextResponse.json({
			jetnetConfigured: !!(userSettings.jetnetApiKey && userSettings.jetnetAuthToken),
			jetnetBaseUrl: userSettings.jetnetBaseUrl || 'https://customer.jetnetconnect.com/api',
		});
	} catch (error) {
		console.error('Error retrieving JetNet credentials:', error);
		return NextResponse.json({ error: 'Failed to retrieve JetNet credentials' }, { status: 500 });
	}
}

// POST - Save JetNet credentials (encrypted)
export async function POST(request: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { email, password, baseUrl } = body;

		if (!email || !password) {
			return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
		}

		// Encrypt the credentials
		const encryptedApiKey = EncryptionService.encrypt(email);
		const encryptedAuthToken = EncryptionService.encrypt(password);

		// Upsert user settings
		await prisma.userSettings.upsert({
			where: { userId: session.user.id },
			update: {
				jetnetApiKey: encryptedApiKey,
				jetnetAuthToken: encryptedAuthToken,
				jetnetBaseUrl: baseUrl || 'https://customer.jetnetconnect.com/api',
			},
			create: {
				userId: session.user.id,
				jetnetApiKey: encryptedApiKey,
				jetnetAuthToken: encryptedAuthToken,
				jetnetBaseUrl: baseUrl || 'https://customer.jetnetconnect.com/api',
			},
		});

		return NextResponse.json({
			success: true,
			message: 'JetNet credentials saved successfully',
		});
	} catch (error) {
		console.error('Error saving JetNet credentials:', error);
		return NextResponse.json({ error: 'Failed to save JetNet credentials' }, { status: 500 });
	}
}

// DELETE - Remove JetNet credentials
export async function DELETE() {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Clear JetNet credentials
		await prisma.userSettings.update({
			where: { userId: session.user.id },
			data: {
				jetnetApiKey: null,
				jetnetAuthToken: null,
			},
		});

		return NextResponse.json({
			success: true,
			message: 'JetNet credentials removed successfully',
		});
	} catch (error) {
		console.error('Error removing JetNet credentials:', error);
		return NextResponse.json({ error: 'Failed to remove JetNet credentials' }, { status: 500 });
	}
}
