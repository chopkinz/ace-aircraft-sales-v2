import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
	try {
		console.log('🔍 Checking environment variables...');

		const envVars = {
			JETNET_EMAIL: process.env.JETNET_EMAIL,
			JETNET_PASSWORD: process.env.JETNET_PASSWORD ? '***' : 'NOT SET',
			JETNET_BASE_URL: process.env.JETNET_BASE_URL,
			TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY ? '***' : 'NOT SET',
		};

		console.log('📊 Environment variables:', envVars);

		return NextResponse.json({
			success: true,
			message: 'Environment variables checked',
			data: envVars,
		});
	} catch (error) {
		console.error('❌ Environment check failed:', error);

		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}
