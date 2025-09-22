import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import bcrypt from 'bcryptjs';

export async function GET() {
	try {
		const session = await getServerSession(authOptions);

		if (!session) {
			return NextResponse.json({ authenticated: false }, { status: 401 });
		}

		return NextResponse.json({
			authenticated: true,
			user: {
				id: session.user.id,
				email: session.user.email,
				name: session.user.name,
				role: session.user.role,
			},
		});
	} catch (error) {
		console.error('Auth check error:', error);
		return NextResponse.json({ authenticated: false }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { email, password, action } = body;

		if (action === 'signin') {
			// Sign in logic
			if (!email || !password) {
				return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
			}

			// Find user
			const user = await prisma.user.findUnique({
				where: { email },
			});

			if (!user || !user.isActive) {
				return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
			}

			// Create default password if none exists (for demo)
			if (!user.password) {
				const hashedPassword = await bcrypt.hash('admin123', 12);
				await prisma.user.update({
					where: { id: user.id },
					data: { password: hashedPassword },
				});
				user.password = hashedPassword;
			}

			// Verify password
			const isValidPassword = await bcrypt.compare(password, user.password);
			if (!isValidPassword) {
				return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
			}

			return NextResponse.json({
				success: true,
				user: {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role,
				},
			});
		}

		if (action === 'signup') {
			// Sign up logic
			const { name } = body;

			if (!email || !password || !name) {
				return NextResponse.json(
					{ error: 'Name, email, and password are required' },
					{ status: 400 }
				);
			}

			// Check if user already exists
			const existingUser = await prisma.user.findUnique({
				where: { email },
			});

			if (existingUser) {
				return NextResponse.json({ error: 'User already exists with this email' }, { status: 409 });
			}

			// Create new user
			const hashedPassword = await bcrypt.hash(password, 12);
			const newUser = await prisma.user.create({
				data: {
					email,
					name,
					password: hashedPassword,
					role: 'USER',
					isActive: true,
				},
			});

			return NextResponse.json({
				success: true,
				user: {
					id: newUser.id,
					email: newUser.email,
					name: newUser.name,
					role: newUser.role,
				},
			});
		}

		return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
	} catch (error) {
		console.error('Auth API error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
