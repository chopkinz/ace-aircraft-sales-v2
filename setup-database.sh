#!/bin/bash

# Database Setup Script for Ace Aircraft Sales
# This script helps set up the PostgreSQL database for production

echo "🗄️  Setting up PostgreSQL database for Ace Aircraft Sales..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set."
    echo ""
    echo "Please set up your database:"
    echo "1. Go to https://vercel.com/dashboard"
    echo "2. Select your project: ace-aircraft-sales-v2"
    echo "3. Go to Storage tab"
    echo "4. Create a new Postgres database"
    echo "5. Copy the connection string"
    echo "6. Go to Settings > Environment Variables"
    echo "7. Add DATABASE_URL with your connection string"
    echo ""
    echo "Or use an external PostgreSQL provider:"
    echo "- Supabase (free tier): https://supabase.com"
    echo "- Railway (simple setup): https://railway.app"
    echo "- Neon (serverless): https://neon.tech"
    exit 1
fi

echo "✅ DATABASE_URL is set"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push database schema
echo "📊 Pushing database schema..."
npx prisma db push

# Check if push was successful
if [ $? -eq 0 ]; then
    echo "✅ Database schema pushed successfully!"

    # Ask if user wants to seed the database
    echo ""
    read -p "Do you want to seed the database with sample data? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🌱 Seeding database..."
        npm run seed
        echo "✅ Database seeded successfully!"
    fi

    echo ""
    echo "🎉 Database setup complete!"
    echo "🌐 Your application is ready at: https://ace-aircraft-sales-v2.vercel.app"
else
    echo "❌ Database schema push failed. Please check your DATABASE_URL and try again."
    exit 1
fi
