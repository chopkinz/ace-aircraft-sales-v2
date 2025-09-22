import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { emailaddress, password } = body;

		if (!emailaddress || !password) {
			return NextResponse.json(
				{
					success: false,
					error: 'Email address and password are required',
				},
				{ status: 400 }
			);
		}

		// JetNet API Login endpoint
		const loginUrl = 'https://customer.jetnetconnect.com/api/Admin/APILogin';

		const loginResponse = await fetch(loginUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: JSON.stringify({
				emailaddress,
				password,
			}),
		});

		if (!loginResponse.ok) {
			throw new Error(`JetNet login failed: ${loginResponse.statusText}`);
		}

		const authData = await loginResponse.json();

		// Handle both array and object responses
		let authResult;
		if (Array.isArray(authData) && authData.length > 0) {
			authResult = authData[0];
		} else {
			authResult = authData;
		}

		// Store authentication data globally for other API calls
		(globalThis as Record<string, unknown>).jetnetAuthData = authResult;

		return NextResponse.json({
			success: true,
			data: {
				authenticated: true,
				bearerToken: authResult.bearerToken,
				apiToken: authResult.apiToken,
				securityToken: authResult.apiToken, // Alias for compatibility
				timestamp: new Date().toISOString(),
				status: 'Successfully authenticated with JetNet API',
			},
			metadata: {
				source: 'JetNet API',
				endpoint: '/api/Admin/APILogin',
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error('JetNet authentication failed:', error);

		return NextResponse.json(
			{
				success: false,
				error: {
					code: 'JETNET_AUTH_FAILED',
					message: error instanceof Error ? error.message : 'JetNet authentication failed',
				},
				metadata: {
					source: 'JetNet API',
					timestamp: new Date().toISOString(),
				},
			},
			{ status: 503 }
		);
	}
}

export async function GET(request: NextRequest) {
	// For GET requests, check if we have stored auth data
	const authData = (globalThis as Record<string, unknown>).jetnetAuthData as Record<
		string,
		unknown
	>;

	if (!authData) {
		return NextResponse.json(
			{
				success: false,
				error: 'No authentication data available. Please authenticate first.',
			},
			{ status: 401 }
		);
	}

	return NextResponse.json({
		success: true,
		data: {
			authenticated: true,
			bearerToken: authData.bearerToken,
			apiToken: authData.apiToken,
			securityToken: authData.apiToken,
			timestamp: new Date().toISOString(),
			status: 'Authentication data available',
		},
		metadata: {
			source: 'JetNet API',
			timestamp: new Date().toISOString(),
		},
	});
}
