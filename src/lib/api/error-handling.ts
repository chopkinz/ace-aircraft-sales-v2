import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

// API Response types
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	timestamp: string;
	requestId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
	pagination: {
		page: number;
		limit: number;
		totalCount: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}

// Error types
export enum ApiErrorType {
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
	AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
	NOT_FOUND = 'NOT_FOUND',
	CONFLICT = 'CONFLICT',
	RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
	INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
	DATABASE_ERROR = 'DATABASE_ERROR',
	EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
}

export class ApiError extends Error {
	public readonly type: ApiErrorType;
	public readonly statusCode: number;
	public readonly requestId?: string;

	constructor(
		message: string,
		type: ApiErrorType = ApiErrorType.INTERNAL_SERVER_ERROR,
		statusCode: number = 500,
		requestId?: string
	) {
		super(message);
		this.name = 'ApiError';
		this.type = type;
		this.statusCode = statusCode;
		this.requestId = requestId;
	}
}

// Request validation helper
export function validateRequest<T>(
	schema: ZodSchema<T>,
	data: unknown
): { success: true; data: T } | { success: false; error: ZodError } {
	try {
		const validatedData = schema.parse(data);
		return { success: true, data: validatedData };
	} catch (error) {
		if (error instanceof ZodError) {
			return { success: false, error };
		}
		throw error;
	}
}

// API response helpers
export function createSuccessResponse<T>(
	data: T,
	message?: string,
	requestId?: string
): NextResponse<ApiResponse<T>> {
	return NextResponse.json({
		success: true,
		data,
		message,
		timestamp: new Date().toISOString(),
		requestId,
	});
}

export function createErrorResponse(
	error: ApiError | Error | string,
	requestId?: string
): NextResponse<ApiResponse> {
	let apiError: ApiError;

	if (error instanceof ApiError) {
		apiError = error;
	} else if (error instanceof Error) {
		apiError = new ApiError(error.message, ApiErrorType.INTERNAL_SERVER_ERROR, 500, requestId);
	} else {
		apiError = new ApiError(error, ApiErrorType.INTERNAL_SERVER_ERROR, 500, requestId);
	}

	return NextResponse.json(
		{
			success: false,
			error: apiError.message,
			timestamp: new Date().toISOString(),
			requestId: apiError.requestId || requestId,
		},
		{ status: apiError.statusCode }
	);
}

export function createPaginatedResponse<T>(
	data: T[],
	pagination: {
		page: number;
		limit: number;
		totalCount: number;
	},
	message?: string,
	requestId?: string
): NextResponse<PaginatedResponse<T>> {
	const totalPages = Math.ceil(pagination.totalCount / pagination.limit);

	return NextResponse.json({
		success: true,
		data,
		message,
		timestamp: new Date().toISOString(),
		requestId,
		pagination: {
			page: pagination.page,
			limit: pagination.limit,
			totalCount: pagination.totalCount,
			totalPages,
			hasNext: pagination.page < totalPages,
			hasPrev: pagination.page > 1,
		},
	});
}

// Request handler wrapper with error handling
export function withErrorHandling<T extends any[]>(handler: (...args: T) => Promise<NextResponse>) {
	return async (...args: T): Promise<NextResponse> => {
		const requestId = Math.random().toString(36).substring(2, 15);

		try {
			return await handler(...args);
		} catch (error) {
			console.error(`[${requestId}] API Error:`, error);

			if (error instanceof ApiError) {
				return createErrorResponse(error, requestId);
			}

			return createErrorResponse(
				new ApiError(
					'An unexpected error occurred',
					ApiErrorType.INTERNAL_SERVER_ERROR,
					500,
					requestId
				)
			);
		}
	};
}

// Rate limiting helper
export class RateLimiter {
	private requests: Map<string, number[]> = new Map();
	private readonly windowMs: number;
	private readonly maxRequests: number;

	constructor(windowMs: number = 60000, maxRequests: number = 100) {
		this.windowMs = windowMs;
		this.maxRequests = maxRequests;
	}

	isAllowed(identifier: string): boolean {
		const now = Date.now();
		const requests = this.requests.get(identifier) || [];

		// Remove old requests outside the window
		const validRequests = requests.filter(time => now - time < this.windowMs);

		if (validRequests.length >= this.maxRequests) {
			return false;
		}

		// Add current request
		validRequests.push(now);
		this.requests.set(identifier, validRequests);

		return true;
	}

	getRemainingRequests(identifier: string): number {
		const now = Date.now();
		const requests = this.requests.get(identifier) || [];
		const validRequests = requests.filter(time => now - time < this.windowMs);

		return Math.max(0, this.maxRequests - validRequests.length);
	}

	getResetTime(identifier: string): number {
		const now = Date.now();
		const requests = this.requests.get(identifier) || [];
		const oldestRequest = Math.min(...requests);

		return oldestRequest + this.windowMs;
	}
}

// Request logging middleware
export function logRequest(request: NextRequest, requestId: string) {
	const { method, url } = request;
	const userAgent = request.headers.get('user-agent') || 'Unknown';
	const ip =
		request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown';

	console.log(`[${requestId}] ${method} ${url} - IP: ${ip} - UA: ${userAgent}`);
}

// Database error handler
export function handleDatabaseError(error: any): ApiError {
	if (error.code === 'P2002') {
		return new ApiError(
			'A record with this information already exists',
			ApiErrorType.CONFLICT,
			409
		);
	}

	if (error.code === 'P2025') {
		return new ApiError('Record not found', ApiErrorType.NOT_FOUND, 404);
	}

	if (error.code === 'P2003') {
		return new ApiError('Foreign key constraint failed', ApiErrorType.VALIDATION_ERROR, 400);
	}

	return new ApiError('Database operation failed', ApiErrorType.DATABASE_ERROR, 500);
}

// External API error handler
export function handleExternalApiError(error: any, service: string): ApiError {
	if (error.status === 401) {
		return new ApiError(`${service} authentication failed`, ApiErrorType.AUTHENTICATION_ERROR, 401);
	}

	if (error.status === 403) {
		return new ApiError(`${service} access forbidden`, ApiErrorType.AUTHORIZATION_ERROR, 403);
	}

	if (error.status === 404) {
		return new ApiError(`${service} resource not found`, ApiErrorType.NOT_FOUND, 404);
	}

	if (error.status === 429) {
		return new ApiError(`${service} rate limit exceeded`, ApiErrorType.RATE_LIMIT_EXCEEDED, 429);
	}

	return new ApiError(`${service} API error`, ApiErrorType.EXTERNAL_API_ERROR, error.status || 500);
}

// Request parameter extraction helpers
export function extractQueryParams(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	return Object.fromEntries(searchParams.entries());
}

export function extractPaginationParams(searchParams: URLSearchParams) {
	const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
	const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '100')));

	return { page, limit };
}

export function extractFilterParams(searchParams: URLSearchParams) {
	const filters: Record<string, any> = {};

	// Price filters
	const minPrice = searchParams.get('minPrice');
	const maxPrice = searchParams.get('maxPrice');
	if (minPrice) filters.minPrice = parseFloat(minPrice);
	if (maxPrice) filters.maxPrice = parseFloat(maxPrice);

	// Year filters
	const minYear = searchParams.get('minYear');
	const maxYear = searchParams.get('maxYear');
	if (minYear) filters.minYear = parseInt(minYear);
	if (maxYear) filters.maxYear = parseInt(maxYear);

	// Text filters
	const manufacturer = searchParams.get('manufacturer');
	const status = searchParams.get('status');
	const location = searchParams.get('location');
	if (manufacturer) filters.manufacturer = manufacturer;
	if (status) filters.status = status;
	if (location) filters.location = location;

	// Hours filters
	const minHours = searchParams.get('minHours');
	const maxHours = searchParams.get('maxHours');
	if (minHours) filters.minHours = parseFloat(minHours);
	if (maxHours) filters.maxHours = parseFloat(maxHours);

	// Boolean filters
	const recent = searchParams.get('recent');
	if (recent === 'true') filters.recent = true;

	return filters;
}

export function extractSortParams(searchParams: URLSearchParams) {
	const sortBy = searchParams.get('sortBy') || 'lastUpdated';
	const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

	return { sortBy, sortOrder };
}
