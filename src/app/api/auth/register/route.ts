import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging/logger';

export async function POST(request: NextRequest) {
	const startTime = Date.now();
	const requestId = crypto.randomUUID();

	try {
		log.info('Registration request started', {
			requestId,
			component: 'api',
			action: 'register_request',
		});

		const body = await request.json();
		const { firstName, lastName, email, password, company, phone } = body;

		// Validate input
		if (!firstName || !lastName || !email || !password) {
			log.warn('Registration failed - missing required fields', {
				requestId,
				component: 'api',
				action: 'register_validation_error',
			});

			return NextResponse.json(
				{ error: 'First name, last name, email, and password are required' },
				{ status: 400 }
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			log.warn('Registration failed - invalid email format', {
				requestId,
				component: 'api',
				action: 'register_validation_error',
				metadata: { email },
			});

			return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
		}

		// Validate password length
		if (password.length < 8) {
			log.warn('Registration failed - password too short', {
				requestId,
				component: 'api',
				action: 'register_validation_error',
			});

			return NextResponse.json(
				{ error: 'Password must be at least 8 characters long' },
				{ status: 400 }
			);
		}

		// For demo purposes, always succeed
		// In a real app, you would:
		// 1. Check if email already exists
		// 2. Hash the password
		// 3. Store user in database
		// 4. Send verification email

		log.info('Registration successful', {
			requestId,
			component: 'api',
			action: 'register_success',
			metadata: { email, firstName, lastName },
		});

		return NextResponse.json({
			success: true,
			message: 'Account created successfully',
			user: {
				firstName,
				lastName,
				email,
				company,
				phone,
			},
		});
	} catch (error) {
		const duration = Date.now() - startTime;

		log.error(
			'Registration request failed',
			{
				requestId,
				component: 'api',
				action: 'register_error',
				metadata: { duration },
			},
			error as Error
		);

		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
