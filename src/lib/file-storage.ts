import { promises as fs } from 'fs';
import path from 'path';
import { Aircraft, Report, FileUploadResult, StorageConfig, UploadOptions } from '@/types';

// Storage paths configuration
const STORAGE_PATHS = {
	marketData: 'src/data/market-data',
	opportunities: 'src/data/opportunities',
	reports: 'src/data/reports',
	cache: 'src/data/cache',
	analytics: 'src/data/analytics',
	aircraft: 'src/data/aircraft',
	companies: 'src/data/companies',
	transactions: 'src/data/transactions',
	backups: 'src/data/backups',
} as const;

// Utility functions
class FileStorageUtil {
	static async ensureDirectory(dirPath: string): Promise<void> {
		try {
			await fs.access(dirPath);
		} catch {
			await fs.mkdir(dirPath, { recursive: true });
		}
	}

	static async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	static generateFilename(prefix: string, suffix: string = 'json'): string {
		const timestamp = new Date().toISOString().split('T')[0];
		return `${prefix}-${timestamp}.${suffix}`;
	}

	static generateUniqueId(): string {
		return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	static async getFileStats(filePath: string): Promise<{ size: number; modified: Date } | null> {
		try {
			const stats = await fs.stat(filePath);
			return {
				size: stats.size,
				modified: stats.mtime,
			};
		} catch {
			return null;
		}
	}

	static async compressData(data: unknown): Promise<string> {
		// Simple JSON compression (could be enhanced with actual compression algorithms)
		return JSON.stringify(data, null, 0);
	}

	static async decompressData(data: string): Promise<unknown> {
		return JSON.parse(data);
	}
}

// Base Storage Class
abstract class BaseStorage<T> {
	protected readonly storagePath: string;

	constructor(storagePath: string) {
		this.storagePath = storagePath;
	}

	protected async getFilePath(filename: string): Promise<string> {
		await FileStorageUtil.ensureDirectory(this.storagePath);
		return path.join(this.storagePath, filename);
	}

	protected async writeFile(filename: string, data: T | T[]): Promise<void> {
		const filePath = await this.getFilePath(filename);
		const compressedData = await FileStorageUtil.compressData({
			data,
			metadata: {
				version: '2.0.0',
				timestamp: new Date().toISOString(),
				type: this.constructor.name,
				size: Array.isArray(data) ? data.length : 1,
			},
		});
		await fs.writeFile(filePath, compressedData, 'utf8');
	}

	protected async readFile(
		filename: string
	): Promise<{ data: T | T[]; metadata: Record<string, unknown> } | null> {
		try {
			const filePath = await this.getFilePath(filename);
			const rawData = await fs.readFile(filePath, 'utf8');
			const decompressedData = await FileStorageUtil.decompressData(rawData);
			return decompressedData as { data: T | T[]; metadata: Record<string, unknown> } | null;
		} catch (error) {
			console.error(`Error reading file ${filename}:`, error);
			return null;
		}
	}

	protected async listFiles(pattern?: RegExp): Promise<string[]> {
		try {
			await FileStorageUtil.ensureDirectory(this.storagePath);
			const files = await fs.readdir(this.storagePath);
			return pattern ? files.filter(file => pattern.test(file)) : files;
		} catch (error) {
			console.error(`Error listing files in ${this.storagePath}:`, error);
			return [];
		}
	}

	protected async deleteFile(filename: string): Promise<boolean> {
		try {
			const filePath = await this.getFilePath(filename);
			await fs.unlink(filePath);
			return true;
		} catch (error) {
			console.error(`Error deleting file ${filename}:`, error);
			return false;
		}
	}

	async getStorageStats(): Promise<{
		fileCount: number;
		totalSize: number;
		lastModified: Date | null;
	}> {
		const files = await this.listFiles();
		let totalSize = 0;
		let lastModified: Date | null = null;

		for (const file of files) {
			const filePath = await this.getFilePath(file);
			const stats = await FileStorageUtil.getFileStats(filePath);
			if (stats) {
				totalSize += stats.size;
				if (!lastModified || stats.modified > lastModified) {
					lastModified = stats.modified;
				}
			}
		}

		return {
			fileCount: files.length,
			totalSize,
			lastModified,
		};
	}
}

// Market Data Storage
export class MarketDataStorage extends BaseStorage<MarketTrend> {
	constructor() {
		super(STORAGE_PATHS.marketData);
	}

	async saveMarketData(data: MarketTrend[], date?: string): Promise<string> {
		const filename = FileStorageUtil.generateFilename(date ? `market-data-${date}` : 'market-data');
		await this.writeFile(filename, data);
		return filename;
	}

	async getMarketData(date?: string): Promise<MarketTrend[]> {
		let filename: string;

		if (date) {
			filename = `market-data-${date}.json`;
		} else {
			// Get the latest file
			const files = await this.listFiles(/^market-data-.*\.json$/);
			if (files.length === 0) return [];
			filename = files.sort().reverse()[0];
		}

		const result = await this.readFile(filename);
		return Array.isArray(result?.data) ? result.data : [];
	}

	async getLatestMarketData(): Promise<MarketTrend[]> {
		return this.getMarketData();
	}

	async getMarketDataHistory(days: number = 30): Promise<{ [date: string]: MarketTrend[] }> {
		const files = await this.listFiles(/^market-data-.*\.json$/);
		const history: { [date: string]: MarketTrend[] } = {};

		const sortedFiles = files.sort().reverse().slice(0, days);

		for (const file of sortedFiles) {
			const dateMatch = file.match(/market-data-(\d{4}-\d{2}-\d{2})\.json/);
			if (dateMatch) {
				const date = dateMatch[1];
				const data = await this.getMarketData(date);
				history[date] = data;
			}
		}

		return history;
	}
}

// Opportunities Storage
export class OpportunitiesStorage extends BaseStorage<MarketOpportunity> {
	constructor() {
		super(STORAGE_PATHS.opportunities);
	}

	async saveOpportunities(opportunities: MarketOpportunity[], date?: string): Promise<string> {
		const filename = FileStorageUtil.generateFilename(
			date ? `opportunities-${date}` : 'opportunities'
		);
		await this.writeFile(filename, opportunities);
		return filename;
	}

	async getOpportunities(date?: string): Promise<MarketOpportunity[]> {
		let filename: string;

		if (date) {
			filename = `opportunities-${date}.json`;
		} else {
			const files = await this.listFiles(/^opportunities-.*\.json$/);
			if (files.length === 0) return [];
			filename = files.sort().reverse()[0];
		}

		const result = await this.readFile(filename);
		return Array.isArray(result?.data) ? result.data : [];
	}

	async addOpportunity(opportunity: MarketOpportunity): Promise<void> {
		const opportunities = await this.getOpportunities();

		// Remove existing opportunity with same ID if exists
		const filteredOpportunities = opportunities.filter(o => o.id !== opportunity.id);
		filteredOpportunities.push(opportunity);

		await this.saveOpportunities(filteredOpportunities);
	}

	async updateOpportunity(
		opportunityId: string,
		updates: Partial<MarketOpportunity>
	): Promise<boolean> {
		const opportunities = await this.getOpportunities();
		const index = opportunities.findIndex(o => o.id === opportunityId);

		if (index === -1) return false;

		opportunities[index] = { ...opportunities[index], ...updates };
		await this.saveOpportunities(opportunities);
		return true;
	}

	async deleteOpportunity(opportunityId: string): Promise<boolean> {
		const opportunities = await this.getOpportunities();
		const filteredOpportunities = opportunities.filter(o => o.id !== opportunityId);

		if (filteredOpportunities.length === opportunities.length) return false;

		await this.saveOpportunities(filteredOpportunities);
		return true;
	}

	async getOpportunityById(opportunityId: string): Promise<MarketOpportunity | null> {
		const opportunities = await this.getOpportunities();
		return opportunities.find(o => o.id === opportunityId) || null;
	}

	async getOpportunitiesByPriority(
		priority: 'high' | 'medium' | 'low'
	): Promise<MarketOpportunity[]> {
		const opportunities = await this.getOpportunities();
		return opportunities.filter(o => o.priority === priority);
	}
}

// Reports Storage
export class ReportsStorage extends BaseStorage<Report> {
	constructor() {
		super(STORAGE_PATHS.reports);
	}

	async saveReport(report: Report): Promise<string> {
		const filename = `report-${report.id}.json`;
		await this.writeFile(filename, report);
		return filename;
	}

	async getReport(reportId: string): Promise<Report | null> {
		const filename = `report-${reportId}.json`;
		const result = await this.readFile(filename);
		return (result?.data as Report) || null;
	}

	async getAllReports(): Promise<Report[]> {
		const files = await this.listFiles(/^report-.*\.json$/);
		const reports: Report[] = [];

		for (const file of files) {
			const result = await this.readFile(file);
			if (result?.data) {
				reports.push(result.data as Report);
			}
		}

		return reports.sort(
			(a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
		);
	}

	async deleteReport(reportId: string): Promise<boolean> {
		const filename = `report-${reportId}.json`;
		return this.deleteFile(filename);
	}

	async updateReport(reportId: string, updates: Partial<Report>): Promise<boolean> {
		const report = await this.getReport(reportId);
		if (!report) return false;

		const updatedReport = {
			...report,
			...updates,
			dateCreated: report.dateCreated, // Keep original creation date
		};

		await this.saveReport(updatedReport);
		return true;
	}

	async getReportsByType(type: string): Promise<Report[]> {
		const reports = await this.getAllReports();
		return reports.filter(r => r.type === type);
	}

	async getReportsByDateRange(startDate: string, endDate: string): Promise<Report[]> {
		const reports = await this.getAllReports();
		return reports.filter(r => r.dateCreated >= startDate && r.dateCreated <= endDate);
	}
}

// Cache Storage
export class CacheStorage extends BaseStorage<Record<string, unknown>> {
	constructor() {
		super(STORAGE_PATHS.cache);
	}

	async setCache(key: string, data: Record<string, unknown>, ttl?: number): Promise<void> {
		const expiresAt = ttl ? Date.now() + ttl : null;
		const cacheEntry = {
			data,
			expiresAt,
			createdAt: Date.now(),
		};

		const filename = `cache-${key.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
		await this.writeFile(filename, cacheEntry);
	}

	async getCache(key: string): Promise<Record<string, unknown> | null> {
		const filename = `cache-${key.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
		const result = await this.readFile(filename);

		if (!result?.data) return null;

		const cacheEntry = result.data as {
			data: Record<string, unknown>;
			expiresAt?: number;
			createdAt: number;
		};

		// Check if expired
		if (cacheEntry.expiresAt && Date.now() > cacheEntry.expiresAt) {
			await this.deleteFile(filename);
			return null;
		}

		return cacheEntry.data;
	}

	async deleteCache(key: string): Promise<boolean> {
		const filename = `cache-${key.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
		return this.deleteFile(filename);
	}

	async clearExpiredCache(): Promise<number> {
		const files = await this.listFiles(/^cache-.*\.json$/);
		let deletedCount = 0;

		for (const file of files) {
			const result = await this.readFile(file);
			if (result?.data) {
				const cacheEntry = result.data as {
					data: Record<string, unknown>;
					expiresAt?: number;
					createdAt: number;
				};
				if (cacheEntry.expiresAt && Date.now() > cacheEntry.expiresAt) {
					await this.deleteFile(file);
					deletedCount++;
				}
			}
		}

		return deletedCount;
	}
}

// Aircraft Storage
export class AircraftStorage extends BaseStorage<Aircraft> {
	constructor() {
		super(STORAGE_PATHS.aircraft);
	}

	async saveAircraft(aircraft: Aircraft): Promise<void> {
		const filename = `aircraft-${aircraft.registration}.json`;
		await this.writeFile(filename, aircraft);
	}

	async getAircraft(registration: string): Promise<Aircraft | null> {
		const filename = `aircraft-${registration}.json`;
		const result = await this.readFile(filename);
		return (result?.data as Aircraft) || null;
	}

	async getAllAircraft(): Promise<Aircraft[]> {
		const files = await this.listFiles(/^aircraft-.*\.json$/);
		const aircraft: Aircraft[] = [];

		for (const file of files) {
			const result = await this.readFile(file);
			if (result?.data) {
				aircraft.push(result.data as Aircraft);
			}
		}

		return aircraft;
	}

	async searchAircraft(query: string): Promise<Aircraft[]> {
		const allAircraft = await this.getAllAircraft();
		const lowercaseQuery = query.toLowerCase();

		return allAircraft.filter(
			aircraft =>
				aircraft.registration.toLowerCase().includes(lowercaseQuery) ||
				aircraft.make.toLowerCase().includes(lowercaseQuery) ||
				aircraft.model.toLowerCase().includes(lowercaseQuery) ||
				aircraft.serialNumber.toLowerCase().includes(lowercaseQuery)
		);
	}
}

// Analytics Storage
export class AnalyticsStorage extends BaseStorage<Record<string, unknown>> {
	constructor() {
		super(STORAGE_PATHS.analytics);
	}

	async saveDashboardMetrics(metrics: Record<string, unknown>): Promise<void> {
		const filename = 'dashboard-metrics.json';
		await this.writeFile(filename, metrics);
	}

	async getDashboardMetrics(): Promise<Record<string, unknown> | null> {
		const filename = 'dashboard-metrics.json';
		const result = await this.readFile(filename);
		return result?.data || null;
	}

	async saveUserActivity(activity: Record<string, unknown>): Promise<void> {
		const date = new Date().toISOString().split('T')[0];
		const filename = `user-activity-${date}.json`;

		// Append to existing data
		let existingData = [];
		const existing = await this.readFile(filename);
		if (existing?.data && Array.isArray(existing.data)) {
			existingData = existing.data;
		}

		existingData.push(activity);
		await this.writeFile(filename, existingData);
	}

	async getUserActivity(date?: string): Promise<any[]> {
		const targetDate = date || new Date().toISOString().split('T')[0];
		const filename = `user-activity-${targetDate}.json`;
		const result = await this.readFile(filename);
		return Array.isArray(result?.data) ? result.data : [];
	}
}

// Backup Manager
export class BackupManager {
	private readonly backupPath: string;

	constructor() {
		this.backupPath = STORAGE_PATHS.backups;
	}

	async createBackup(): Promise<string> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const backupDir = path.join(this.backupPath, `backup-${timestamp}`);

		await FileStorageUtil.ensureDirectory(backupDir);

		// Copy all data directories
		for (const [name, sourcePath] of Object.entries(STORAGE_PATHS)) {
			if (name !== 'backups') {
				const destPath = path.join(backupDir, name);
				await this.copyDirectory(sourcePath, destPath);
			}
		}

		// Create backup manifest
		const manifest = {
			timestamp: new Date().toISOString(),
			version: '2.0.0',
			directories: Object.keys(STORAGE_PATHS).filter(key => key !== 'backups'),
		};

		await fs.writeFile(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

		return backupDir;
	}

	async restoreBackup(backupPath: string): Promise<boolean> {
		try {
			// Read manifest
			const manifestPath = path.join(backupPath, 'manifest.json');
			const manifestData = await fs.readFile(manifestPath, 'utf8');
			const manifest = JSON.parse(manifestData);

			// Restore each directory
			for (const dirName of manifest.directories) {
				const sourcePath = path.join(backupPath, dirName);
				const destPath = STORAGE_PATHS[dirName as keyof typeof STORAGE_PATHS];

				if (destPath) {
					await this.copyDirectory(sourcePath, destPath);
				}
			}

			return true;
		} catch (error) {
			console.error('Backup restoration failed:', error);
			return false;
		}
	}

	async listBackups(): Promise<{ name: string; date: Date; size: number }[]> {
		try {
			await FileStorageUtil.ensureDirectory(this.backupPath);
			const entries = await fs.readdir(this.backupPath, { withFileTypes: true });
			const backups = [];

			for (const entry of entries) {
				if (entry.isDirectory() && entry.name.startsWith('backup-')) {
					const backupPath = path.join(this.backupPath, entry.name);
					const stats = await fs.stat(backupPath);
					backups.push({
						name: entry.name,
						date: stats.mtime,
						size: await this.getDirectorySize(backupPath),
					});
				}
			}

			return backups.sort((a, b) => b.date.getTime() - a.date.getTime());
		} catch (error) {
			console.error('Error listing backups:', error);
			return [];
		}
	}

	private async copyDirectory(source: string, destination: string): Promise<void> {
		try {
			await FileStorageUtil.ensureDirectory(destination);
			const entries = await fs.readdir(source, { withFileTypes: true });

			for (const entry of entries) {
				const sourcePath = path.join(source, entry.name);
				const destPath = path.join(destination, entry.name);

				if (entry.isDirectory()) {
					await this.copyDirectory(sourcePath, destPath);
				} else {
					await fs.copyFile(sourcePath, destPath);
				}
			}
		} catch (error) {
			// Source directory might not exist, which is fine
			if ((error as Error & { code?: string }).code !== 'ENOENT') {
				throw error;
			}
		}
	}

	private async getDirectorySize(dirPath: string): Promise<number> {
		let size = 0;
		try {
			const entries = await fs.readdir(dirPath, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry.name);
				if (entry.isDirectory()) {
					size += await this.getDirectorySize(fullPath);
				} else {
					const stats = await fs.stat(fullPath);
					size += stats.size;
				}
			}
		} catch (error) {
			console.error(`Error calculating directory size for ${dirPath}:`, error);
		}
		return size;
	}
}

// Storage Manager - Central interface
export class StorageManager {
	public readonly marketData: MarketDataStorage;
	public readonly opportunities: OpportunitiesStorage;
	public readonly reports: ReportsStorage;
	public readonly cache: CacheStorage;
	public readonly aircraft: AircraftStorage;
	public readonly analytics: AnalyticsStorage;
	public readonly backup: BackupManager;

	constructor() {
		this.marketData = new MarketDataStorage();
		this.opportunities = new OpportunitiesStorage();
		this.reports = new ReportsStorage();
		this.cache = new CacheStorage();
		this.aircraft = new AircraftStorage();
		this.analytics = new AnalyticsStorage();
		this.backup = new BackupManager();
	}

	async initialize(): Promise<void> {
		// Ensure all storage directories exist
		for (const storagePath of Object.values(STORAGE_PATHS)) {
			await FileStorageUtil.ensureDirectory(storagePath);
		}

		// Clean up expired cache
		await this.cache.clearExpiredCache();
	}

	async getSystemStats(): Promise<Record<string, Record<string, unknown>>> {
		const stats: Record<string, Record<string, unknown>> = {};

		for (const [name, storage] of Object.entries(this)) {
			if (storage && typeof storage.getStorageStats === 'function') {
				stats[name] = await storage.getStorageStats();
			}
		}

		return stats;
	}

	async cleanup(): Promise<void> {
		// Clean up expired cache entries
		await this.cache.clearExpiredCache();

		// Could add more cleanup logic here
		// e.g., removing old backups, archiving old reports, etc.
	}
}

// Export singleton instance
export const storageManager = new StorageManager();
