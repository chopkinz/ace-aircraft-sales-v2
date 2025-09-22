// Lightweight logging utility
export const log = {
	info: (message: string, meta?: any) => {
		console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
	},
	warn: (message: string, meta?: any) => {
		console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
	},
	error: (message: string, meta?: any, error?: Error) => {
		console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta, null, 2) : '', error);
	},
	debug: (message: string, meta?: any) => {
		if (process.env.NODE_ENV === 'development') {
			console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
		}
	},
};
