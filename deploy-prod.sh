#!/bin/bash

# Production Deployment Script for Ace Aircraft Sales
# This script sets up the production environment and deploys to Vercel

echo "🚀 Starting production deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Warning: DATABASE_URL environment variable is not set."
    echo "   Please set it to your PostgreSQL connection string."
    echo "   Example: postgresql://username:password@host:port/database"
fi

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma db push

# Build the application
echo "🏗️  Building application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🌐 Your application should be available at the Vercel URL."
echo "📊 Don't forget to:"
echo "   1. Set up your PostgreSQL database"
echo "   2. Configure environment variables in Vercel dashboard"
echo "   3. Run database migrations on production"
echo "   4. Seed the database with initial data"
