import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

export const authOptions: NextAuthOptions = {
	providers: [
		...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
			? [
					GoogleProvider({
						clientId: process.env.GOOGLE_CLIENT_ID,
						clientSecret: process.env.GOOGLE_CLIENT_SECRET,
					}),
			  ]
			: []),
		CredentialsProvider({
			name: 'credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) {
					return null;
				}

				try {
					const user = await prisma.user.findUnique({
						where: {
							email: credentials.email,
						},
					});

					if (!user || !user.isActive) {
						return null;
					}

					// Check if user has a password
					if (!user.password) {
						// Create default password for demo users
						const hashedPassword = await bcrypt.hash('admin123', 12);
						await prisma.user.update({
							where: { id: user.id },
							data: {
								password: hashedPassword,
								role: UserRole.ADMIN,
							},
						});
						user.password = hashedPassword;
					}

					const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

					if (!isPasswordValid) {
						return null;
					}

					return {
						id: user.id,
						email: user.email,
						name: user.name,
						image: user.image,
						role: user.role,
					};
				} catch (error) {
					console.error('Auth error:', error);
					return null;
				}
			},
		}),
	],
	session: {
		strategy: 'jwt',
		maxAge: 30 * 24 * 60 * 60, // 30 days
	},
	jwt: {
		maxAge: 30 * 24 * 60 * 60, // 30 days
	},
	useSecureCookies: process.env.NODE_ENV === 'production',
	debug: false, // Disable debug mode to remove warnings
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.role = user.role;
				token.id = user.id;
			}
			return token;
		},
		async session({ session, token }) {
			if (token) {
				session.user.id = token.id as string;
				session.user.role = token.role as UserRole;
			}
			return session;
		},
		async signIn({ user, account }) {
			if (account?.provider === 'google') {
				try {
					// Check if user exists, if not create them
					const existingUser = await prisma.user.findUnique({
						where: { email: user.email! },
					});

					if (!existingUser) {
						await prisma.user.create({
							data: {
								email: user.email!,
								name: user.name,
								image: user.image,
								role: UserRole.USER,
								isActive: true,
							},
						});
					}
				} catch (error) {
					console.error('Google sign-in error:', error);
					return false;
				}
			}
			return true;
		},
		async redirect({ url, baseUrl }) {
			// Always redirect to dashboard after successful login
			if (url.startsWith('/')) return `${baseUrl}${url}`;
			else if (new URL(url).origin === baseUrl) return url;
			return `${baseUrl}/dashboard`;
		},
	},
	pages: {
		signIn: '/auth/signin',
		error: '/auth/error',
	},
	secret: process.env.NEXTAUTH_SECRET || 'ace-aircraft-intelligence-secret-key-2024-development',
};

// Helper functions for role-based access control
export const hasRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
	const roleHierarchy = {
		[UserRole.VIEWER]: 0,
		[UserRole.USER]: 1,
		[UserRole.MANAGER]: 2,
		[UserRole.ADMIN]: 3,
	};

	return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export const isAdmin = (userRole: UserRole): boolean => {
	return userRole === UserRole.ADMIN;
};

export const isManager = (userRole: UserRole): boolean => {
	return userRole === UserRole.MANAGER || userRole === UserRole.ADMIN;
};
