// create a route that returns all the endpoints in the api
// displays details and structure of all available endpoints

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
	const endpoints = await prisma.apiEndpoint.findMany();
	console.log(`✅ ${endpoints.length} endpoints found`);
	console.log(`✅ Endpoints: ${endpoints.map(endpoint => endpoint.path).join(', ')}`);
	return NextResponse.json(endpoints);
}
