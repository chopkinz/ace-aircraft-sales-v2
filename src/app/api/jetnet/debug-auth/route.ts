import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
	try {
		console.log('🔍 Debugging JetNet Authentication Response...');

		const baseUrl = process.env.JETNET_BASE_URL;
		const email = process.env.JETNET_EMAIL;
		const password = process.env.JETNET_PASSWORD;

		if (!baseUrl || !email || !password) {
			throw new Error('Missing JetNet credentials');
		}

		const authData = {
			emailaddress: email,
			password: password,
		};

		console.log('📡 Making authentication request to:', `${baseUrl}/api/Admin/APILogin`);
		console.log('📊 Auth data:', { emailaddress: email, password: '***' });

		const response = await fetch(`${baseUrl}/api/Admin/APILogin`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(authData),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`
			);
		}

		const authResponse = await response.json();

		console.log('🔍 Raw JetNet authentication response:', JSON.stringify(authResponse, null, 2));

		return NextResponse.json({
			success: true,
			message: 'JetNet authentication debug completed',
			rawResponse: authResponse,
			responseKeys: Object.keys(authResponse),
		});
	} catch (error) {
		console.error('❌ JetNet authentication debug failed:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred',
			},
			{ status: 500 }
		);
	}
}
