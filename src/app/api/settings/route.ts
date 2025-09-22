import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
	return NextResponse.json({
		success: true,
		message: 'Settings API endpoint',
		data: {
			theme: 'light',
			notifications: true,
			language: 'en',
		},
	});
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		return NextResponse.json({
			success: true,
			message: 'Settings updated successfully',
			data: body,
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: 'Failed to update settings',
			},
			{ status: 400 }
		);
	}
}
