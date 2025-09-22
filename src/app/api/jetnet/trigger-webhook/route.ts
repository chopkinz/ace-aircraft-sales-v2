import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { searchParams, timestamp } = body;

		console.log('Triggering n8n webhook for JetNet authentication...' + timestamp);

		// Trigger the n8n webhook
		const webhookUrl =
			'https://autom8god.app.n8n.cloud/webhook/d9d8af7b-7238-4879-8267-84a105112628';

		const webhookResponse = await fetch(webhookUrl, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'Ace-Aircraft-Sales/1.0',
			},
		});

		if (!webhookResponse.ok) {
			throw new Error(`Webhook request failed: ${webhookResponse.statusText}`);
		}

		const webhookResult = await webhookResponse.text();
		console.log('Webhook response:', webhookResult);

		return NextResponse.json({
			success: true,
			message: 'Webhook triggered successfully',
			timestamp: new Date().toISOString(),
			searchParams,
		});
	} catch (error) {
		console.error('Webhook trigger error:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
