import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole } from '@prisma/client';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security headers
const securityHeaders = {
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	'X-XSS-Protection': '1; mode=block',
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
	'Content-Security-Policy':
		"default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;",
};

// Rate limiting configuration
const RATE_LIMIT = {
	windowMs: 15 * 60 * 1000, // 15 minutes
	maxRequests: 100, // limit each IP to 100 requests per windowMs
	apiMaxRequests: 1000, // API endpoints get higher limits
};

// IP whitelist for development
const DEV_IP_WHITELIST = ['127.0.0.1', '::1', 'localhost'];

export async function securityMiddleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const ip = getClientIP(request);
	const userAgent = request.headers.get('user-agent') || '';

	// Add security headers
	const response = NextResponse.next();
	Object.entries(securityHeaders).forEach(([key, value]) => {
		response.headers.set(key, value);
	});

	// Skip security checks for static files and API health checks
	if (
		pathname.startsWith('/_next/') ||
		pathname.startsWith('/api/health') ||
		pathname.startsWith('/favicon.ico') ||
		pathname.startsWith('/images/') ||
		pathname.startsWith('/icons/')
	) {
		return response;
	}

	// Development environment checks
	if (process.env.NODE_ENV === 'development') {
		// Allow localhost in development
		if (DEV_IP_WHITELIST.includes(ip)) {
			return response;
		}
	}

	// Rate limiting
	const isApiRoute = pathname.startsWith('/api/');
	const maxRequests = isApiRoute ? RATE_LIMIT.apiMaxRequests : RATE_LIMIT.maxRequests;

	if (!(await checkRateLimit(ip, maxRequests))) {
		return new NextResponse('Rate limit exceeded', {
			status: 429,
			headers: {
				'Retry-After': '900', // 15 minutes
				...securityHeaders,
			},
		});
	}

	// Bot detection and blocking
	if (isBot(userAgent)) {
		console.log(`🚫 Bot detected: ${userAgent} from ${ip}`);
		return new NextResponse('Access denied', {
			status: 403,
			headers: securityHeaders,
		});
	}

	// Suspicious activity detection
	if (isSuspiciousActivity(request)) {
		console.log(`🚨 Suspicious activity detected from ${ip}`);
		return new NextResponse('Access denied', {
			status: 403,
			headers: securityHeaders,
		});
	}

	// Authentication check for protected routes
	if (isProtectedRoute(pathname)) {
		// Temporarily disable auth for production testing
		if (process.env.NODE_ENV === 'production' && process.env.DISABLE_AUTH === 'true') {
			return response;
		}

		// For API routes, check authentication but don't redirect
		if (pathname.startsWith('/api/')) {
			const token = await getToken({ req: request });

			if (!token) {
				return new NextResponse('Unauthorized', {
					status: 401,
					headers: securityHeaders,
				});
			}

			// Role-based access control for API routes
			if (isAdminRoute(pathname) && token.role !== UserRole.ADMIN) {
				return new NextResponse('Access denied', {
					status: 403,
					headers: securityHeaders,
				});
			}

			if (isManagerRoute(pathname) && !isManagerOrAdmin(token.role as UserRole)) {
				return new NextResponse('Access denied', {
					status: 403,
					headers: securityHeaders,
				});
			}
		} else {
			// For non-API routes, redirect to signin
			const token = await getToken({ req: request });

			if (!token) {
				return NextResponse.redirect(new URL('/auth/signin', request.url));
			}

			// Role-based access control
			if (isAdminRoute(pathname) && token.role !== UserRole.ADMIN) {
				return new NextResponse('Access denied', {
					status: 403,
					headers: securityHeaders,
				});
			}

			if (isManagerRoute(pathname) && !isManagerOrAdmin(token.role as UserRole)) {
				return new NextResponse('Access denied', {
					status: 403,
					headers: securityHeaders,
				});
			}
		}
	}

	return response;
}

// Helper functions
function getClientIP(request: NextRequest): string {
	const forwarded = request.headers.get('x-forwarded-for');
	const realIP = request.headers.get('x-real-ip');

	if (forwarded) {
		return forwarded.split(',')[0].trim();
	}

	if (realIP) {
		return realIP;
	}

	return 'unknown';
}

async function checkRateLimit(ip: string, maxRequests: number): Promise<boolean> {
	const now = Date.now();

	const current = rateLimitStore.get(ip);

	if (!current || current.resetTime < now) {
		rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
		return true;
	}

	if (current.count >= maxRequests) {
		return false;
	}

	current.count++;
	rateLimitStore.set(ip, current);

	// Clean up old entries
	if (Math.random() < 0.01) {
		// 1% chance to clean up
		for (const [key, value] of rateLimitStore.entries()) {
			if (value.resetTime < now) {
				rateLimitStore.delete(key);
			}
		}
	}

	return true;
}

function isBot(userAgent: string): boolean {
	const botPatterns = [
		/bot/i,
		/crawler/i,
		/spider/i,
		/scraper/i,
		/curl/i,
		/wget/i,
		/python/i,
		/java/i,
		/postman/i,
		/insomnia/i,
		/httpie/i,
	];

	return botPatterns.some(pattern => pattern.test(userAgent));
}

function isSuspiciousActivity(request: NextRequest): boolean {
	const { pathname, searchParams } = request.nextUrl;

	// Check for SQL injection attempts
	const sqlPatterns = [
		/union.*select/i,
		/drop.*table/i,
		/insert.*into/i,
		/delete.*from/i,
		/update.*set/i,
		/'or'1'='1/i,
	];

	const fullUrl = pathname + searchParams.toString();
	if (sqlPatterns.some(pattern => pattern.test(fullUrl))) {
		return true;
	}

	// Check for XSS attempts
	const xssPatterns = [/<script/i, /javascript:/i, /onload=/i, /onerror=/i];

	if (xssPatterns.some(pattern => pattern.test(fullUrl))) {
		return true;
	}

	// Check for path traversal attempts
	if (pathname.includes('..') || pathname.includes('~')) {
		return true;
	}

	return false;
}

function isProtectedRoute(pathname: string): boolean {
	const protectedRoutes = [
		'/dashboard',
		'/admin',
		'/api/contacts',
		'/api/opportunities',
		'/api/reports',
		'/api/alerts',
	];

	return protectedRoutes.some(route => pathname.startsWith(route));
}

function isAdminRoute(pathname: string): boolean {
	const adminRoutes = ['/admin', '/api/admin', '/api/users', '/api/system'];

	return adminRoutes.some(route => pathname.startsWith(route));
}

function isManagerRoute(pathname: string): boolean {
	const managerRoutes = ['/api/reports', '/api/analytics', '/api/market-data'];

	return managerRoutes.some(route => pathname.startsWith(route));
}

function isManagerOrAdmin(role: UserRole): boolean {
	return role === UserRole.MANAGER || role === UserRole.ADMIN;
}

// Export for use in middleware.ts
export { securityMiddleware as middleware };
