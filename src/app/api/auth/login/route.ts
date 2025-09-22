import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging/logger';

export async function POST(request: NextRequest) {
	const startTime = Date.now();
	const requestId = crypto.randomUUID();

	try {
		log.info('Login request started', {
			requestId,
			component: 'api',
			action: 'login_request',
		});

		const body = await request.json();
		const { email, password } = body;
		console.log('Login request received', { email, password });

		// Validate input
		if (!email || !password) {
			log.warn('Login failed - missing credentials', {
				requestId,
				component: 'api',
				action: 'login_validation_error',
			});

			return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
		}

		// For demo purposes, accept any email/password combination
		// In a real app, you would validate against your database
		log.info('Login successful', {
			requestId,
			component: 'api',
			action: 'login_success',
			metadata: { email },
		});

		// Create a simple token (in real app, use JWT)
		const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

		return NextResponse.json({
			success: true,
			message: 'Login successful',
			token,
			user: {
				email,
				name: email.split('@')[0],
			},
		});
	} catch (error) {
		const duration = Date.now() - startTime;

		log.error(
			'Login request failed',
			{
				requestId,
				component: 'api',
				action: 'login_error',
				metadata: { duration },
			},
			error as Error
		);

		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
