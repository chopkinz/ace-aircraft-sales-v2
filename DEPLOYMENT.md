# Ace Aircraft Sales - Production Deployment Guide

## Overview

This guide covers deploying the Ace Aircraft Sales application to production using Vercel with PostgreSQL.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- Vercel CLI installed (`npm i -g vercel`)
- Git repository set up

## Database Setup

### 1. PostgreSQL Database

Set up a PostgreSQL database (recommended providers):

- **Vercel Postgres** (easiest integration)
- **Supabase** (free tier available)
- **Railway** (simple setup)
- **AWS RDS** (enterprise)
- **Google Cloud SQL** (enterprise)

### 2. Database Connection String

Format: `postgresql://username:password@host:port/database`

Example:

```
postgresql://ace_user:secure_password@db.example.com:5432/ace_aircraft_sales
```

## Environment Variables

Set these in your Vercel dashboard under Project Settings > Environment Variables:

### Required Variables

```bash
DATABASE_URL=postgresql://username:password@host:port/database
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret-key-here
```

### JetNet API (Optional)

```bash
JETNET_API_URL=https://api.jetnetconnect.com
JETNET_CLIENT_ID=your_client_id
JETNET_CLIENT_SECRET=your_client_secret
JETNET_USERNAME=your_username
JETNET_PASSWORD=your_password
```

### File Storage

```bash
STORAGE_PROVIDER=local
STORAGE_PATH=./uploads
```

## Deployment Steps

### 1. Quick Deployment

```bash
# Run the deployment script
./deploy-prod.sh
```

### 2. Manual Deployment

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build the application
npm run build

# Deploy to Vercel
vercel --prod
```

### 3. Database Migration

After deployment, run database migrations:

```bash
# Connect to your production database
npx prisma db push

# Or use Prisma migrate for production
npx prisma migrate deploy
```

### 4. Seed Database (Optional)

```bash
# Seed with sample data
npm run seed

# Or seed with JetNet data
npm run seed:jetnet
```

## Post-Deployment Checklist

- [ ] Database is connected and accessible
- [ ] Environment variables are set correctly
- [ ] Database migrations have been run
- [ ] Application loads without errors
- [ ] All API endpoints are working
- [ ] File uploads are working (if applicable)
- [ ] JetNet API integration is working (if configured)

## Troubleshooting

### Common Issues

1. **Database Connection Errors**

   - Verify DATABASE_URL format
   - Check database server is accessible
   - Ensure database exists and user has permissions

2. **Build Failures**

   - Check for TypeScript errors: `npm run build`
   - Verify all dependencies are installed
   - Check Prisma schema is valid

3. **Runtime Errors**
   - Check Vercel function logs
   - Verify environment variables are set
   - Check database connection

### Logs and Monitoring

- Vercel Dashboard > Functions tab for serverless function logs
- Vercel Dashboard > Analytics for performance metrics
- Database provider dashboard for database metrics

## Security Considerations

1. **Environment Variables**

   - Never commit sensitive data to git
   - Use Vercel's environment variable system
   - Rotate secrets regularly

2. **Database Security**

   - Use strong passwords
   - Enable SSL connections
   - Restrict database access by IP if possible

3. **API Security**
   - Implement rate limiting
   - Validate all inputs
   - Use HTTPS in production

## Performance Optimization

1. **Database**

   - Add indexes for frequently queried fields
   - Use connection pooling
   - Monitor query performance

2. **Application**
   - Enable Vercel's Edge Functions where appropriate
   - Use CDN for static assets
   - Implement caching strategies

## Backup and Recovery

1. **Database Backups**

   - Set up automated backups
   - Test restore procedures
   - Store backups securely

2. **Code Backups**
   - Use Git for version control
   - Tag releases
   - Keep deployment logs

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Vercel documentation
3. Check Prisma documentation for database issues
4. Contact the development team

## Version History

- v1.0.0 - Initial production deployment
- v1.1.0 - Added JetNet API integration
- v1.2.0 - Enhanced reporting features
- v1.3.0 - Improved UI/UX and performance
