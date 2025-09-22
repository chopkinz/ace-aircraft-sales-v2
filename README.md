# ACE Aircraft Sales v2

A modern, lightweight aircraft intelligence platform with full JetNet integration.

## Quick Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Setup environment variables:**
   Create `.env.local` with:

   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/ace_aircraft_sales"

   # NextAuth
   NEXTAUTH_SECRET="ace-aircraft-intelligence-secret-key-2025-development"
   NEXTAUTH_URL="http://localhost:8000"

   # JetNet API
   JETNET_EMAIL="chase@theskylinebusinessgroup.com"
   JETNET_PASSWORD="Smiley654!"
   JETNET_BASE_URL="https://customer.jetnetconnect.com/api"

   # App Configuration
   NODE_ENV="development"
   ```

3. **Setup database:**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Features

- ✅ **Full Database Integration** - PostgreSQL with Prisma ORM
- ✅ **JetNet API Sync** - Real-time aircraft data synchronization
- ✅ **Authentication** - NextAuth with role-based access control
- ✅ **Responsive UI** - Clean, modern interface with shadcn/ui
- ✅ **Real-time Data** - No mock data, all live from JetNet API
- ✅ **Aircraft Management** - Add, edit, delete aircraft listings
- ✅ **Market Analysis** - Comprehensive aircraft market intelligence

## API Endpoints

- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/database/aircraft` - Aircraft listings with pagination
- `POST /api/database/aircraft` - Create new aircraft
- `POST /api/jetnet/sync-aircraft` - Sync with JetNet API
- `GET /api/jetnet/sync-aircraft` - View sync logs

## Architecture

- **Frontend:** Next.js 15 + React 19 + TypeScript
- **UI Components:** shadcn/ui + Tailwind CSS
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** NextAuth.js
- **API Integration:** JetNet Connect API
- **State Management:** TanStack Query

## Development

```bash
# Database operations
npm run db:studio      # Open Prisma Studio
npm run db:reset       # Reset database
npm run db:migrate     # Run migrations

# Development
npm run dev           # Start dev server on port 8000
npm run build         # Build for production
npm run lint          # Run ESLint
```

## Production Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run `npm run db:migrate`
4. Deploy with `npm run build && npm start`

## JetNet Integration

The application includes full JetNet API integration for:

- Aircraft data synchronization
- Real-time market intelligence
- Comprehensive aircraft details
- Automated data updates

All data is live from the JetNet API - no mock data used.
