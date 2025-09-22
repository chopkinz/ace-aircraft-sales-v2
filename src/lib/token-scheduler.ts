import { JetNetAuthManager } from './jetnet-auth-manager';

export class TokenScheduler {
	private refreshTimer: NodeJS.Timeout | null = null;
	private healthCheckTimer: NodeJS.Timeout | null = null;
	private isRunning: boolean = false;
	private jitterMs: number = 5 * 60 * 1000; // 5 minutes jitter
	private healthCheckIntervalMs: number = 5 * 60 * 1000; // 5 minutes

	constructor(private authManager: JetNetAuthManager) {}

	/**
	 * Start proactive token refresh scheduling
	 */
	startProactiveRefresh(): void {
		if (this.isRunning) {
			console.warn('⚠️ Token scheduler is already running');
			return;
		}

		console.log('🔄 Starting proactive token refresh scheduler');
		this.isRunning = true;

		// Schedule initial refresh
		this.scheduleNextRefresh();

		// Start health check timer
		this.startHealthCheck();
	}

	/**
	 * Stop the refresh scheduler
	 */
	stopRefresh(): void {
		console.log('⏹️ Stopping token refresh scheduler');
		this.isRunning = false;

		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}

		if (this.healthCheckTimer) {
			clearInterval(this.healthCheckTimer);
			this.healthCheckTimer = null;
		}
	}

	/**
	 * Schedule the next token refresh
	 */
	private async scheduleNextRefresh(): Promise<void> {
		if (!this.isRunning) {
			return;
		}

		try {
			const tokenMetadata = this.authManager.getTokenMetadata();

			if (!tokenMetadata.expiresAt) {
				console.log('⏰ No token expiry information, scheduling refresh in 1 hour');
				this.refreshTimer = setTimeout(
					() => {
						this.performProactiveRefresh();
					},
					60 * 60 * 1000
				); // 1 hour fallback
				return;
			}

			const timeUntilRefresh = tokenMetadata.timeUntilRefresh;

			if (timeUntilRefresh <= 0) {
				console.log('⏰ Token needs immediate refresh');
				await this.performProactiveRefresh();
				return;
			}

			// Add jitter to prevent thundering herd
			const jitter = Math.random() * this.jitterMs;
			const scheduledTime = Math.max(timeUntilRefresh - jitter, 60000); // Minimum 1 minute

			console.log(
				`⏰ Scheduling next token refresh in ${Math.round(scheduledTime / 1000)}s (${Math.round(timeUntilRefresh / 1000)}s until needed + ${Math.round(jitter / 1000)}s jitter)`
			);

			this.refreshTimer = setTimeout(() => {
				this.performProactiveRefresh();
			}, scheduledTime);
		} catch (error) {
			console.error('❌ Error scheduling next refresh:', error);
			// Fallback to 1 hour refresh
			this.refreshTimer = setTimeout(
				() => {
					this.performProactiveRefresh();
				},
				60 * 60 * 1000
			);
		}
	}

	/**
	 * Perform proactive token refresh
	 */
	private async performProactiveRefresh(): Promise<void> {
		if (!this.isRunning) {
			return;
		}

		try {
			console.log('🔄 Performing proactive token refresh...');

			// Get a valid token (this will refresh if needed)
			await this.authManager.getValidToken();

			console.log('✅ Proactive token refresh completed');

			// Schedule next refresh
			this.scheduleNextRefresh();
		} catch (error) {
			console.error('❌ Proactive token refresh failed:', error);

			// Schedule retry in 5 minutes
			this.refreshTimer = setTimeout(
				() => {
					this.performProactiveRefresh();
				},
				5 * 60 * 1000
			);
		}
	}

	/**
	 * Start health check timer
	 */
	private startHealthCheck(): void {
		console.log('🏥 Starting token health check timer');

		this.healthCheckTimer = setInterval(async () => {
			await this.performHealthCheck();
		}, this.healthCheckIntervalMs);
	}

	/**
	 * Perform health check on token
	 */
	private async performHealthCheck(): Promise<void> {
		try {
			const isValid = await this.authManager.validateToken();
			const tokenMetadata = this.authManager.getTokenMetadata();

			if (!isValid) {
				console.warn('⚠️ Token health check failed, forcing refresh');
				await this.performProactiveRefresh();
				return;
			}

			// Check if token is expiring soon but refresh wasn't scheduled
			if (tokenMetadata.timeUntilRefresh <= 0 && this.refreshTimer === null) {
				console.warn('⚠️ Token expiring soon but no refresh scheduled, forcing refresh');
				await this.performProactiveRefresh();
				return;
			}

			console.log(
				`🏥 Token health check passed - expires in ${Math.round(tokenMetadata.timeUntilExpiry / 1000)}s`
			);
		} catch (error) {
			console.error('❌ Token health check failed:', error);
		}
	}

	/**
	 * Force immediate refresh
	 */
	async forceRefresh(): Promise<boolean> {
		try {
			console.log('🔄 Forcing immediate token refresh...');
			await this.performProactiveRefresh();
			return true;
		} catch (error) {
			console.error('❌ Forced refresh failed:', error);
			return false;
		}
	}

	/**
	 * Get scheduler status
	 */
	getStatus(): {
		isRunning: boolean;
		nextRefreshScheduled: boolean;
		timeUntilNextRefresh: number;
		healthCheckActive: boolean;
	} {
		const tokenMetadata = this.authManager.getTokenMetadata();

		return {
			isRunning: this.isRunning,
			nextRefreshScheduled: this.refreshTimer !== null,
			timeUntilNextRefresh: tokenMetadata.timeUntilRefresh,
			healthCheckActive: this.healthCheckTimer !== null,
		};
	}

	/**
	 * Update refresh threshold (for testing or configuration changes)
	 */
	updateRefreshThreshold(threshold: number): void {
		console.log(`⚙️ Updating refresh threshold to ${threshold * 100}%`);
		// Note: This would require updating the auth manager's threshold
		// For now, we'll just log it
	}

	/**
	 * Get detailed scheduler metrics
	 */
	getMetrics(): {
		schedulerStatus: any;
		tokenMetadata: any;
		authMetrics: any;
	} {
		return {
			schedulerStatus: this.getStatus(),
			tokenMetadata: this.authManager.getTokenMetadata(),
			authMetrics: this.authManager.getMetrics(),
		};
	}
}
