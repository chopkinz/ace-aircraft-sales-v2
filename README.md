# Ace Aircraft Sales v2

🚀 **Advanced aircraft market evaluation and reporting platform with JetNet API integration**

## 🌐 Live Application
**Production URL:** https://ace-aircraft-sales-v2.vercel.app

## 📋 Quick Setup Guide

### 1. Database Setup
The application requires a PostgreSQL database. Choose one of these options:

#### Option A: Vercel Postgres (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project: `ace-aircraft-sales-v2`
3. Go to **Storage** tab
4. Click **Create Database** → **Postgres**
5. Name it: `ace-aircraft-sales-db`
6. Copy the connection string

#### Option B: External Providers
- **Supabase** (free tier): https://supabase.com
- **Railway** (simple setup): https://railway.app  
- **Neon** (serverless): https://neon.tech

### 2. Environment Variables
In your Vercel project settings, add these environment variables:

```bash
# Required
DATABASE_URL=postgresql://username:password@host:port/database
NEXTAUTH_URL=https://ace-aircraft-sales-v2.vercel.app
NEXTAUTH_SECRET=your-secret-key-here

# Optional - JetNet API Integration
JETNET_API_URL=https://api.jetnetconnect.com
JETNET_CLIENT_ID=your_client_id
JETNET_CLIENT_SECRET=your_client_secret
JETNET_USERNAME=your_username
JETNET_PASSWORD=your_password
```

### 3. Database Migration
After setting up the database, run:

```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed with sample data (optional)
npm run seed
```

## 🚀 Features

### ✨ Core Features
- **Aircraft Market Evaluation** - Comprehensive market analysis
- **Advanced Reporting** - Generate PDF, Excel, CSV, and HTML reports
- **Real-time Data Sync** - JetNet API integration for live data
- **Modern UI/UX** - Clean, responsive design with dark/light themes
- **Data Export** - Multiple export formats for reports
- **Activity Tracking** - Complete audit trail of all operations

### 🔧 Technical Features
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Prisma** ORM with PostgreSQL
- **Tailwind CSS** for styling
- **Radix UI** components
- **Vercel** deployment ready
- **JetNet API** integration

## 📊 Data Management

### Aircraft Data
- Comprehensive aircraft information
- Market pricing analysis
- Location and availability tracking
- Maintenance and flight hours
- Serial numbers and registrations

### Market Analysis
- Price trend analysis
- Market value calculations
- Comparative evaluations
- Historical data tracking

### Reporting System
- **PDF Reports** - Professional formatted reports
- **Excel Export** - Spreadsheet-compatible data
- **CSV Export** - Raw data for analysis
- **HTML Reports** - Web-viewable reports

## 🛠️ Development

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Git

### Local Development
```bash
# Clone the repository
git clone https://github.com/chopkinz/ace-aircraft-sales-v2.git
cd ace-aircraft-sales-v2

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database URL

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run seed         # Seed database with sample data
npm run seed:jetnet  # Seed with JetNet API data
```

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/            # API routes
│   ├── aircraft/       # Aircraft management
│   ├── market/         # Market analysis
│   └── reports/        # Reporting system
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   └── providers/      # Context providers
├── lib/                 # Utility libraries
│   ├── database/       # Database utilities
│   ├── jetnet/         # JetNet API integration
│   └── reports/        # Report generation
└── types/              # TypeScript type definitions
```

## 🔌 JetNet API Integration

The application includes comprehensive JetNet API integration:

- **Authentication** - Secure API access
- **Aircraft Data** - Real-time aircraft information
- **Company Data** - Dealer and broker information
- **Contact Management** - Lead and contact tracking
- **Data Sync** - Automated data synchronization

### JetNet API Documentation
See the `JetNetAPI/` folder for complete API documentation and examples.

## 🚀 Deployment

### Automatic Deployment
The application is automatically deployed to Vercel when you push to the main branch.

### Manual Deployment
```bash
# Build and deploy
npm run build
vercel --prod
```

### Database Setup
```bash
# Run the database setup script
./setup-database.sh
```

## 📈 Performance

- **Static Generation** - Optimized for speed
- **Edge Functions** - Global CDN distribution
- **Database Optimization** - Indexed queries
- **Caching** - Intelligent data caching
- **PWA Ready** - Progressive Web App features

## 🔒 Security

- **Environment Variables** - Secure configuration
- **Database Security** - SSL connections
- **API Security** - Rate limiting and validation
- **Authentication** - NextAuth.js integration

## 📞 Support

For issues or questions:
1. Check the [Deployment Guide](DEPLOYMENT.md)
2. Review the [JetNet API Documentation](JetNetAPI/)
3. Check the troubleshooting section
4. Contact the development team

## 📄 License

This project is proprietary software developed for Ace Aircraft Sales.

## 🎯 Roadmap

- [ ] Enhanced market analytics
- [ ] Mobile app development
- [ ] Advanced reporting features
- [ ] Integration with additional APIs
- [ ] Machine learning insights

---

**Built with ❤️ for Ace Aircraft Sales**