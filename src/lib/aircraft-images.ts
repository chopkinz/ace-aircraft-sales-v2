/**
 * Aircraft Images Utility
 * Generates aircraft image URLs without external dependencies
 */

export interface AircraftImageOptions {
	manufacturer?: string;
	model?: string;
	type?: 'exterior' | 'interior' | 'cockpit';
	size?: 'small' | 'medium' | 'large';
}

/**
 * Generates a data URI for aircraft placeholder images
 */
export function generateAircraftImageDataUri(
	manufacturer: string = 'Aircraft',
	model: string = 'Model',
	color: string = '#3B82F6'
): string {
	const text = `${manufacturer} ${model}`.substring(0, 20);
	const width = 400;
	const height = 300;

	// Create SVG placeholder
	const svg = `
		<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
					<stop offset="100%" style="stop-color:${color};stop-opacity:1" />
				</linearGradient>
			</defs>
			<rect width="100%" height="100%" fill="url(#grad)"/>
			<rect x="20" y="20" width="${width - 40}" height="${
		height - 40
	}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" rx="8"/>
			<text x="50%" y="40%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">✈️</text>
			<text x="50%" y="60%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14">${text}</text>
		</svg>
	`;

	return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Gets aircraft image URL with fallback to generated placeholder
 */
export function getAircraftImageUrl(options: AircraftImageOptions = {}): string {
	const { manufacturer = 'Aircraft', model = 'Model' } = options;

	// For now, return generated placeholder
	// In production, this could check for real images first
	const colors = [
		'#3B82F6', // Blue
		'#10B981', // Green
		'#F59E0B', // Amber
		'#EF4444', // Red
		'#8B5CF6', // Purple
		'#06B6D4', // Cyan
		'#F97316', // Orange
		'#84CC16', // Lime
	];

	const colorIndex = (manufacturer + model).length % colors.length;
	const color = colors[colorIndex];

	return generateAircraftImageDataUri(manufacturer, model, color);
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
 * Generates multiple aircraft images for gallery
 */
export function getAircraftImageGallery(
	manufacturer: string,
	model: string,
	count: number = 3
): string[] {
	const baseColor = getManufacturerColor(manufacturer);
	const images: string[] = [];

	for (let i = 0; i < count; i++) {
		// Vary the colors slightly for different views
		const variations = [baseColor, '#64748B', '#475569'];
		const color = variations[i % variations.length];
		images.push(generateAircraftImageDataUri(manufacturer, model, color));
	}

	return images;
}

/**
 * Default aircraft image
 */
export const DEFAULT_AIRCRAFT_IMAGE = generateAircraftImageDataUri('Aircraft', 'Model', '#64748B');
