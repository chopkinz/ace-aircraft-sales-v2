import { NextResponse } from 'next/server';

export async function GET() {
	try {
		// This would typically trigger a daily sync process
		// For now, just return a success response
		return NextResponse.json({
			success: true,
			message: 'Daily sync completed',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('Daily sync error:', error);
		return NextResponse.json({ success: false, error: 'Daily sync failed' }, { status: 500 });
	}
}
