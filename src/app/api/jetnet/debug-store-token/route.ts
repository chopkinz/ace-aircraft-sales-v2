import { NextRequest, NextResponse } from 'next/server';
import { getGlobalJetNetService } from '@/lib/global-jetnet-service';

export async function GET(request: NextRequest) {
	try {
		console.log('🔍 Debugging Token Storage...');

		const jetNetService = await getGlobalJetNetService();
		const authManager = jetNetService.getAuthManager();

		// Force authentication
		console.log('🔑 Forcing authentication...');
		const bearerToken = await authManager.getValidToken();

		// Immediately check the stored values
		const securityToken = authManager.getSecurityToken();

		// Access private fields directly for debugging
		const currentToken = authManager['currentToken'];
		const currentApiToken = authManager['currentApiToken'];

		console.log('🔍 Direct field access:', {
			currentToken: currentToken ? currentToken.substring(0, 20) + '...' : 'NONE',
			currentApiToken: currentApiToken ? currentApiToken.substring(0, 20) + '...' : 'NONE',
		});

		return NextResponse.json({
			success: true,
			message: 'Token storage debug completed',
			results: {
				bearerTokenReturned: bearerToken ? bearerToken.substring(0, 20) + '...' : 'NONE',
				securityTokenMethod: securityToken ? securityToken.substring(0, 20) + '...' : 'NONE',
				directFieldAccess: {
					currentToken: currentToken ? currentToken.substring(0, 20) + '...' : 'NONE',
					currentApiToken: currentApiToken ? currentApiToken.substring(0, 20) + '...' : 'NONE',
				},
				fieldsMatch: {
					bearerTokenMatch: bearerToken === currentToken,
					securityTokenMatch: securityToken === currentApiToken,
				},
			},
		});
	} catch (error) {
		console.error('❌ Token storage debug failed:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred',
				stack: error instanceof Error ? error.stack : undefined,
			},
			{ status: 500 }
		);
	}
}
