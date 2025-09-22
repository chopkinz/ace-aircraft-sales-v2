// Type definitions for the application

export interface FileUploadResult {
	success: boolean;
	url?: string;
	error?: string;
	fileId?: string;
}

export interface StorageConfig {
	provider: 'local' | 's3' | 'gcs';
	bucket?: string;
	region?: string;
	accessKey?: string;
	secretKey?: string;
}

export interface UploadOptions {
	maxSize?: number;
	allowedTypes?: string[];
	generateThumbnail?: boolean;
	compress?: boolean;
}

export interface JetNetAuthResponse {
	success: boolean;
	token?: string;
	expiresAt?: string;
	error?: string;
}

export interface JetNetAircraftData {
	id: number;
	make: string;
	model: string;
	year: number;
	price: number;
	location: string;
	status: string;
	[key: string]: unknown;
}

export interface SyncResult {
	success: boolean;
	recordsProcessed: number;
	recordsCreated: number;
	recordsUpdated: number;
	errors: string[];
	lastSync: string;
	syncDuration: number;
	duration?: number; // Added for compatibility
	lastSyncAt?: Date;
	error?: string; // Added for error handling
}

export interface AircraftSyncData {
	aircraftId: number | string;
	serialNumber: string;
	registration: string;
	make: string;
	model: string;
	yearManufactured: number | undefined;
	askingPrice: number | undefined;
	forSale: boolean;
	totalTimeHours: number | undefined;
	engineHours: number | undefined;
	apuHours: number | undefined;
	status: string;
	location: string;
	dateListed: Date | undefined;
	lastUpdated: Date;
	manufacturer: string;
}

export interface ReportData {
	summary: {
		totalAircraft: number;
		totalValue: number;
		avgPrice: number;
		manufacturers: string[];
		yearRange: {
			min: number;
			max: number;
		};
	};
	detailed: Record<string, Record<string, Record<string, number>>>;
	aircraft: Record<string, unknown>[];
	marketData: Record<string, unknown>[];
}

export interface Report {
	id: string;
	title: string;
	type: string;
	description?: string;
	parameters?: string;
	data?: string;
	status: string;
	generatedAt?: Date | string;
	expiresAt?: Date | string;
	createdAt: Date | string;
	updatedAt: Date | string;
	userId?: string;
	aircraftId?: string;
}
