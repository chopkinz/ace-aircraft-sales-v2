import { NextResponse } from 'next/server';

export async function GET() {
	try {
		console.log('🔍 Retrieving stored auth data...');

		const authData = (globalThis as any).jetnetAuthData;

		if (!authData) {
			return NextResponse.json(
				{
					success: false,
					message: 'No auth data available',
					timestamp: new Date().toISOString(),
				},
				{ status: 404 }
			);
		}

		// Check if the token is still valid
		const authTime = new Date(authData.authTime);
		const expiresInMs = authData.expiresIn * 1000;
		const expiryTime = new Date(authTime.getTime() + expiresInMs);
		const now = new Date();

		const isValid = now < expiryTime;
		const timeUntilExpiry = expiryTime.getTime() - now.getTime();

		console.log('🔐 Auth data retrieved:', {
			hasToken: !!authData.bearerToken,
			hasSecurityToken: !!authData.securityToken,
			isValid,
			timeUntilExpiry: Math.round(timeUntilExpiry / 1000 / 60), // minutes
		});

		return NextResponse.json({
			success: true,
			data: {
				bearerToken: authData.bearerToken,
				securityToken: authData.securityToken,
				authTime: authData.authTime,
				expiresIn: authData.expiresIn,
				loginResponse: authData.loginResponse,
				receivedAt: authData.receivedAt,
				isValid,
				expiryTime: expiryTime.toISOString(),
				timeUntilExpiryMinutes: Math.round(timeUntilExpiry / 1000 / 60),
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('❌ Failed to retrieve auth data:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}
