import { NextRequest } from 'next/server';
import { OptimizedAircraftQueries } from '@/lib/db/optimized-queries';
import {
	withErrorHandling,
	createSuccessResponse,
	logRequest,
	ApiError,
	ApiErrorType,
} from '@/lib/api/error-handling';
import { aircraftSearchSchema } from '@/lib/validations/schemas';

export const GET = withErrorHandling(async (request: NextRequest) => {
	const requestId = Math.random().toString(36).substring(2, 15);
	logRequest(request, requestId);

	const searchParams = new URL(request.url).searchParams;
	const queryParams = Object.fromEntries(searchParams.entries());

	// Validate search parameters
	const validation = aircraftSearchSchema.safeParse(queryParams);

	if (!validation.success) {
		throw new ApiError(
			`Invalid search parameters: ${validation.error.errors.map(e => e.message).join(', ')}`,
			ApiErrorType.VALIDATION_ERROR,
			400,
			requestId
		);
	}

	const { searchTerm, limit } = validation.data;

	// Execute optimized search
	const result = await OptimizedAircraftQueries.searchAircraft(searchTerm, limit);

	return createSuccessResponse(
		result,
		`Found ${result.aircraft.length} aircraft matching "${searchTerm}"`,
		requestId
	);
});
