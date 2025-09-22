import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Initializing database with sample data...');

    // Try to clear existing data, but don't fail if database doesn't exist
    try {
      await prisma.marketData.deleteMany();
      await prisma.aircraft.deleteMany();
      await prisma.marketStats.deleteMany();
      await prisma.apiSyncLog.deleteMany();
    } catch (error) {
      console.log('Database not initialized yet, creating new one...');
    }

    // Create sample aircraft data
    const aircraft = await prisma.aircraft.createMany({
      data: [
        {
          manufacturer: 'Cessna',
          model: 'Citation CJ4',
          year: 2020,
          price: 8500000,
          currency: 'USD',
          location: 'Van Nuys, CA',
          status: 'AVAILABLE',
          description: 'Low-time Citation CJ4 with excellent maintenance records. Perfect for corporate travel.',
          registration: 'N123CJ',
          serialNumber: '525C-0123',
          forSale: true,
          totalTimeHours: 1200,
          engineHours: 1200,
          dateListed: new Date('2024-01-15'),
        },
        {
          manufacturer: 'Gulfstream',
          model: 'G650',
          year: 2022,
          price: 75000000,
          currency: 'USD',
          location: 'Teterboro, NJ',
          status: 'AVAILABLE',
          description: 'Ultra-long-range business jet with state-of-the-art avionics and luxurious interior.',
          registration: 'N456G6',
          serialNumber: 'G650-0456',
          forSale: true,
          totalTimeHours: 500,
          engineHours: 500,
          dateListed: new Date('2024-02-01'),
        },
        {
          manufacturer: 'Bombardier',
          model: 'Challenger 350',
          year: 2021,
          price: 28000000,
          currency: 'USD',
          location: 'Dallas, TX',
          status: 'AVAILABLE',
          description: 'Super-midsize jet with exceptional range and performance. Well-maintained with recent inspections.',
          registration: 'N789CL',
          serialNumber: 'CL350-0789',
          forSale: true,
          totalTimeHours: 800,
          engineHours: 800,
          dateListed: new Date('2024-01-20'),
        },
        {
          manufacturer: 'Embraer',
          model: 'Phenom 300E',
          year: 2023,
          price: 12000000,
          currency: 'USD',
          location: 'Miami, FL',
          status: 'AVAILABLE',
          description: 'Light jet with impressive range and efficiency. Perfect for short to medium-haul flights.',
          registration: 'N321PH',
          serialNumber: 'P300E-0321',
          forSale: true,
          totalTimeHours: 200,
          engineHours: 200,
          dateListed: new Date('2024-03-01'),
        },
        {
          manufacturer: 'Pilatus',
          model: 'PC-24',
          year: 2020,
          price: 9500000,
          currency: 'USD',
          location: 'Denver, CO',
          status: 'AVAILABLE',
          description: 'Versatile light jet with short-field capability. Ideal for challenging airports.',
          registration: 'N654PC',
          serialNumber: 'PC24-0654',
          forSale: true,
          totalTimeHours: 1000,
          engineHours: 1000,
          dateListed: new Date('2024-01-10'),
        },
        {
          manufacturer: 'Dassault',
          model: 'Falcon 7X',
          year: 2019,
          price: 35000000,
          currency: 'USD',
          location: 'West Palm Beach, FL',
          status: 'AVAILABLE',
          description: 'Ultra-long-range trijet with exceptional performance and luxury interior.',
          registration: 'N987FX',
          serialNumber: 'F7X-0987',
          forSale: true,
          totalTimeHours: 1500,
          engineHours: 1500,
          dateListed: new Date('2024-02-15'),
        },
        {
          manufacturer: 'Hawker',
          model: '4000',
          year: 2018,
          price: 18000000,
          currency: 'USD',
          location: 'Chicago, IL',
          status: 'AVAILABLE',
          description: 'Super-midsize jet with excellent range and fuel efficiency.',
          registration: 'N555HK',
          serialNumber: 'H4000-0555',
          forSale: true,
          totalTimeHours: 2000,
          engineHours: 2000,
          dateListed: new Date('2024-01-25'),
        },
        {
          manufacturer: 'Learjet',
          model: '75',
          year: 2021,
          price: 15000000,
          currency: 'USD',
          location: 'Las Vegas, NV',
          status: 'AVAILABLE',
          description: 'Light jet with modern avionics and comfortable cabin.',
          registration: 'N777LJ',
          serialNumber: 'LJ75-0777',
          forSale: true,
          totalTimeHours: 600,
          engineHours: 600,
          dateListed: new Date('2024-03-10'),
        },
      ],
    });

    // Create market data
    const marketData = await prisma.marketData.createMany({
      data: [
        {
          make: 'Cessna',
          model: 'Citation CJ4',
          category: 'Light Jet',
          avgPrice: 8500000,
          minPrice: 7500000,
          maxPrice: 9500000,
          totalListings: 12,
          avgDaysOnMarket: 45,
          priceTrend: 'STABLE',
          marketTrend: 'WARM',
          dataDate: new Date(),
          source: 'JetNet',
        },
        {
          make: 'Gulfstream',
          model: 'G650',
          category: 'Ultra Long Range',
          avgPrice: 75000000,
          minPrice: 70000000,
          maxPrice: 80000000,
          totalListings: 8,
          avgDaysOnMarket: 90,
          priceTrend: 'RISING',
          marketTrend: 'HOT',
          dataDate: new Date(),
          source: 'JetNet',
        },
        {
          make: 'Bombardier',
          model: 'Challenger 350',
          category: 'Super Mid Size',
          avgPrice: 28000000,
          minPrice: 25000000,
          maxPrice: 31000000,
          totalListings: 15,
          avgDaysOnMarket: 60,
          priceTrend: 'STABLE',
          marketTrend: 'WARM',
          dataDate: new Date(),
          source: 'JetNet',
        },
        {
          make: 'Embraer',
          model: 'Phenom 300E',
          category: 'Light Jet',
          avgPrice: 12000000,
          minPrice: 11000000,
          maxPrice: 13000000,
          totalListings: 20,
          avgDaysOnMarket: 35,
          priceTrend: 'RISING',
          marketTrend: 'HOT',
          dataDate: new Date(),
          source: 'JetNet',
        },
        {
          make: 'Pilatus',
          model: 'PC-24',
          category: 'Light Jet',
          avgPrice: 9500000,
          minPrice: 8500000,
          maxPrice: 10500000,
          totalListings: 10,
          avgDaysOnMarket: 50,
          priceTrend: 'STABLE',
          marketTrend: 'WARM',
          dataDate: new Date(),
          source: 'JetNet',
        },
      ],
    });

    // Create market stats
    await prisma.marketStats.create({
      data: {
        totalAircraft: 8,
        monthlyGrowth: 12.5,
        activeListings: 8,
        avgPrice: 25000000,
        lastUpdated: new Date(),
      },
    });

    console.log('✅ Database initialized successfully!');
    console.log(`📊 Created ${aircraft.count} aircraft records`);
    console.log(`📈 Created ${marketData.count} market data records`);

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      data: {
        aircraftCount: aircraft.count,
        marketDataCount: marketData.count,
      },
    });
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
