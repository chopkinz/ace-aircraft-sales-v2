import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
	});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function checkDatabaseHealth() {
	try {
		// Test database connection
		await prisma.$queryRaw`SELECT 1`;

		// Test basic operations
		const aircraftCount = await prisma.aircraft.count();

		return {
			status: 'healthy',
			message: 'Database connection successful',
			aircraftCount,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		return {
			status: 'unhealthy',
			message: error instanceof Error ? error.message : 'Database connection failed',
			error: error instanceof Error ? error.message : 'Unknown error',
			timestamp: new Date().toISOString(),
		};
	}
}
