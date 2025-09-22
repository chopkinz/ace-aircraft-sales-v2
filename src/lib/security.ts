import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import NodeCache from 'node-cache';

// Rate limiting configuration
const rateLimiter = new RateLimiterMemory({
	keyPrefix: 'middleware',
	points: 100, // Number of requests
	duration: 60, // Per 60 seconds
	blockDuration: 60, // Block for 60 seconds if limit exceeded
});

// Cache for storing security-related data
const securityCache = new NodeCache({ stdTTL: 300 }); // 5 minutes

// Security headers configuration
const securityHeaders = {
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	'X-XSS-Protection': '1; mode=block',
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
	'Content-Security-Policy': [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data: https: blob:",
		"connect-src 'self' https://customer.jetnetconnect.com https://vercel.live",
		"frame-src 'none'",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
		'upgrade-insecure-requests',
	].join('; '),
};

// IP whitelist for admin endpoints
const adminIPs = process.env.ADMIN_IPS?.split(',') || [];

// Suspicious patterns to block
const suspiciousPatterns = [
	/\.\./, // Path traversal
	/<script/i, // XSS attempts
	/union.*select/i, // SQL injection
	/javascript:/i, // JavaScript protocol
	/on\w+\s*=/i, // Event handlers
	/eval\s*\(/i, // Code injection
	/expression\s*\(/i, // CSS injection
];

export async function securityMiddleware(request: NextRequest) {
	const { pathname, searchParams } = request.nextUrl;
	const clientIP =
		request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
	const userAgent = request.headers.get('user-agent') || '';

	try {
		// Rate limiting
		await rateLimiter.consume(clientIP);
	} catch (rateLimiterRes) {
		console.warn(`Rate limit exceeded for IP: ${clientIP}`);
		return new NextResponse('Too Many Requests', {
			status: 429,
			headers: securityHeaders,
		});
	}

	// Block suspicious patterns in URL and query parameters
	const fullUrl = pathname + searchParams.toString();
	for (const pattern of suspiciousPatterns) {
		if (pattern.test(fullUrl)) {
			console.warn(`Suspicious pattern detected from IP: ${clientIP}, URL: ${fullUrl}`);
			return new NextResponse('Bad Request', {
				status: 400,
				headers: securityHeaders,
			});
		}
	}

	// Block suspicious user agents (temporarily disabled for testing)
	const suspiciousUserAgents = [
		/bot/i,
		/crawler/i,
		/spider/i,
		/scraper/i,
		// /curl/i,  // Temporarily disabled for testing
		/wget/i,
		/python/i,
		/java/i,
	];

	const isSuspiciousUA = suspiciousUserAgents.some(pattern => pattern.test(userAgent));
	if (isSuspiciousUA && !pathname.startsWith('/api/health')) {
		console.warn(`Suspicious user agent detected: ${userAgent} from IP: ${clientIP}`);
		return new NextResponse('Forbidden', {
			status: 403,
			headers: securityHeaders,
		});
	}

	// Admin endpoint protection
	if (pathname.startsWith('/api/admin') && !adminIPs.includes(clientIP)) {
		console.warn(`Unauthorized admin access attempt from IP: ${clientIP}`);
		return new NextResponse('Forbidden', {
			status: 403,
			headers: securityHeaders,
		});
	}

	// Create response with security headers
	const response = NextResponse.next();

	// Apply security headers
	Object.entries(securityHeaders).forEach(([key, value]) => {
		response.headers.set(key, value);
	});

	// Add custom security headers
	response.headers.set('X-Request-ID', crypto.randomUUID());
	response.headers.set('X-Response-Time', Date.now().toString());

	return response;
}

// API route security wrapper
export function withSecurity(handler: (...args: unknown[]) => unknown) {
	return async (request: NextRequest, context: any) => {
		try {
			// Apply security middleware
			const securityResponse = await securityMiddleware(request);
			if (securityResponse.status !== 200) {
				return securityResponse;
			}

			// Execute the actual handler
			return await handler(request, context);
		} catch (error) {
			console.error('Security middleware error:', error);
			return new NextResponse('Internal Server Error', {
				status: 500,
				headers: securityHeaders,
			});
		}
	};
}

// Request validation helper
export function validateRequest(request: NextRequest, schema?: any) {
	const contentType = request.headers.get('content-type');

	// Validate content type for POST/PUT requests
	if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
		if (!contentType?.includes('application/json')) {
			throw new Error('Invalid content type');
		}
	}

	// Validate request size
	const contentLength = request.headers.get('content-length');
	if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
		// 10MB limit
		throw new Error('Request too large');
	}

	return true;
}

// Cache security helper
export function getCachedSecurityData(key: string) {
	return securityCache.get(key);
}

export function setCachedSecurityData(key: string, data: any, ttl?: number) {
	return securityCache.set(key, data, ttl || 300);
}

export function deleteCachedSecurityData(key: string) {
	return securityCache.del(key);
}
