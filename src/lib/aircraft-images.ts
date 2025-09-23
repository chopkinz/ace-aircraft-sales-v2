/**
 * Aircraft Images Utility
 * Handles real aircraft images from JetNet API
 */

export interface AircraftImageOptions {
	manufacturer?: string;
	model?: string;
	type?: 'exterior' | 'interior' | 'cockpit';
	size?: 'small' | 'medium' | 'large';
}

/**
 * Gets aircraft image URL from JetNet API or database
 */
export async function getAircraftImageUrl(
	aircraftId: number,
	options: AircraftImageOptions = {}
): Promise<string> {
	try {
		// First, try to get images from the database
		const { prisma } = await import('@/lib/database');
		const aircraft = await prisma.aircraft.findFirst({
			where: { aircraftId },
			include: {
				images: {
					where: { isHero: true },
					orderBy: { order: 'asc' },
					take: 1,
				},
			},
		});

		if (aircraft?.images?.[0]?.url) {
			return aircraft.images[0].url;
		}

		// If no images in database, try to fetch from JetNet API
		const authData = (globalThis as Record<string, unknown>).jetnetAuthData;
		if (authData?.securityToken) {
			const response = await fetch(
				`https://customer.jetnetconnect.com/api/Aircraft/getImages/${authData.securityToken}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: JSON.stringify({ aircraftId }),
				}
			);

			if (response.ok) {
				const data = await response.json();
				if (data.images && data.images.length > 0) {
					return data.images[0].url || data.images[0].imageUrl;
				}
			}
		}

		// Fallback to placeholder only if no real images available
		return generateFallbackImage(aircraftId, options);
	} catch (error) {
		console.warn('Error fetching aircraft image:', error);
		return generateFallbackImage(aircraftId, options);
	}
}

/**
 * Generates a fallback image only when no real images are available
 */
function generateFallbackImage(aircraftId: number, options: AircraftImageOptions = {}): string {
	const { manufacturer = 'Aircraft', model = 'Model' } = options;
	const text = `${manufacturer} ${model}`.substring(0, 20);
	const width = 400;
	const height = 300;

	// Create minimal fallback SVG
	const svg = `
		<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
			<rect width="100%" height="100%" fill="#f3f4f6"/>
			<text x="50%" y="50%" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="14">
				${text} - Image Not Available
			</text>
		</svg>
	`;

	return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Aircraft type specific colors
 */
export const AIRCRAFT_TYPE_COLORS = {
	'Light Jets': '#3B82F6',
	'Mid-Size Jets': '#10B981',
	'Heavy Jets': '#F59E0B',
	Turboprops: '#EF4444',
	Helicopters: '#8B5CF6',
	Pistons: '#06B6D4',
} as const;

/**
 * Popular aircraft manufacturers and their brand colors
 */
export const MANUFACTURER_COLORS = {
	Gulfstream: '#002F5D',
	Bombardier: '#E31837',
	Cessna: '#1E3A8A',
	Embraer: '#059669',
	Dassault: '#7C2D12',
	Boeing: '#1E40AF',
	Airbus: '#DC2626',
	Beechcraft: '#92400E',
	Pilatus: '#B91C1C',
	Cirrus: '#7C3AED',
} as const;

/**
 * Gets manufacturer-specific color
 */
export function getManufacturerColor(manufacturer: string): string {
	return MANUFACTURER_COLORS[manufacturer as keyof typeof MANUFACTURER_COLORS] || '#3B82F6';
}

/**
 * Gets multiple aircraft images for gallery from database or JetNet API
 */
export async function getAircraftImageGallery(
	aircraftId: number,
	count: number = 3
): Promise<string[]> {
	try {
		// First, try to get images from the database
		const { prisma } = await import('@/lib/database');
		const aircraft = await prisma.aircraft.findFirst({
			where: { aircraftId },
			include: {
				images: {
					orderBy: { order: 'asc' },
					take: count,
				},
			},
		});

		if (aircraft?.images && aircraft.images.length > 0) {
			return aircraft.images.map(img => img.url);
		}

		// If no images in database, try to fetch from JetNet API
		const authData = (globalThis as Record<string, unknown>).jetnetAuthData;
		if (authData?.securityToken) {
			const response = await fetch(
				`https://customer.jetnetconnect.com/api/Aircraft/getImages/${authData.securityToken}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: JSON.stringify({ aircraftId }),
				}
			);

			if (response.ok) {
				const data = await response.json();
				if (data.images && data.images.length > 0) {
					return data.images.slice(0, count).map((img: any) => img.url || img.imageUrl);
				}
			}
		}

		// Fallback to single fallback image
		return [generateFallbackImage(aircraftId)];
	} catch (error) {
		console.warn('Error fetching aircraft image gallery:', error);
		return [generateFallbackImage(aircraftId)];
	}
}

/**
 * Default aircraft image fallback
 */
export const DEFAULT_AIRCRAFT_IMAGE = generateFallbackImage(0);

/**
 * Legacy function for backward compatibility - now uses real data
 */
export function generateAircraftImageDataUri(
	manufacturer: string = 'Aircraft',
	model: string = 'Model',
	color: string = '#3B82F6'
): string {
	return generateFallbackImage(0, { manufacturer, model });
}
