# N8N JetNet Sync Workflow Documentation

## Overview

This N8N workflow automatically syncs aircraft data from the JetNet API to the ACE Aircraft Sales database. It performs comprehensive data enrichment and generates market analysis reports.

## Workflow Structure

### Main Flow

1. **📋 Initialize Workflow1** - Sets up workflow state and tracking
2. **🔐 JetNet Authentication1** - Authenticates with JetNet API
3. **✅ Validate Authentication1** - Validates and stores authentication tokens
4. **⏳ Auth Stabilization1** - Waits for authentication to stabilize
5. **✈️ Fetch Aircraft Data1** - Retrieves bulk aircraft data from JetNet
6. **🔄 Process Aircraft Data1** - Normalizes and transforms aircraft data
7. **🧩 Split Aircraft1** - Splits data into batches for processing
8. **🧪 Prepare Enrichment Context1** - Prepares context for enrichment
9. **Enrichment Nodes** - Multiple parallel API calls for detailed aircraft data
10. **🧵 Combine Enrichment1** - Combines all enrichment data
11. **📦 Collect Enriched1** - Collects all enriched aircraft data
12. **💾 Database Sync1** - Syncs data to database
13. **📊 Generate Reports1** - Generates market analysis reports
14. **📢 Send Data to GHL1** - Sends data to webhook endpoint
15. **Respond to Webhook1** - Responds to webhook caller
16. **🎉 Workflow Complete1** - Finalizes workflow execution

### Enrichment Nodes (Parallel Execution)

- **GET Status1** - Aircraft status information
- **GET Airframe1** - Airframe specifications
- **GET Engines1** - Engine details
- **GET APU1** - APU information
- **GET Avionics1** - Avionics suite details
- **GET Features1** - Aircraft features
- **GET AdditionalEquipment1** - Additional equipment
- **GET Interior1** - Interior specifications
- **GET Exterior1** - Exterior details
- **GET Maintenance1** - Maintenance information
- **GET Relationships1** - Company relationships

## Configuration

### Environment Variables

Set these in your N8N environment:

```bash
JETNET_USERNAME=chase@theskylinebusinessgroup.com
JETNET_PASSWORD=Smiley654!
NEXTAUTH_URL=https://ace-aircraft-sales-v2.vercel.app
```

### Webhook Configuration

- **URL**: `{{ $env.NEXTAUTH_URL || 'https://ace-aircraft-sales-v2.vercel.app' }}/api/jetnet/webhook-callback`
- **Method**: POST
- **Content-Type**: application/json

### Batch Processing

- **Batch Size**: 25 aircraft per batch
- **Timeout**: 60 seconds per API call
- **Continue on Fail**: Enabled for enrichment nodes

## Data Flow

### Input Data

- JetNet API bulk export response
- Aircraft data with basic information

### Processing Steps

1. **Authentication**: Secure token-based authentication
2. **Data Fetching**: Bulk aircraft data retrieval
3. **Data Transformation**: Normalize and clean data
4. **Batch Processing**: Process aircraft in manageable batches
5. **Enrichment**: Parallel API calls for detailed information
6. **Database Sync**: Upsert aircraft records
7. **Report Generation**: Market analysis and statistics
8. **Webhook Delivery**: Send results to application

### Output Data

- Enriched aircraft records
- Market analysis reports
- Database sync statistics
- Workflow execution metrics

## Error Handling

### Authentication Errors

- Token validation with detailed error messages
- Automatic retry with exponential backoff
- Fallback to re-authentication

### API Errors

- Individual node error handling with `continueOnFail`
- Detailed error logging in workflow state
- Graceful degradation for missing data

### Data Processing Errors

- Validation of required fields
- Error collection and reporting
- Partial success handling

## Performance Optimizations

### Parallel Processing

- All enrichment API calls run in parallel
- Batch processing to manage memory usage
- Optimized timeout settings

### Error Recovery

- Continue processing on individual failures
- Comprehensive error logging
- Workflow state preservation

### Resource Management

- Reasonable batch sizes (25 aircraft)
- Timeout controls (60s per API call)
- Memory-efficient data processing

## Monitoring and Logging

### Workflow State Tracking

- Step-by-step execution tracking
- Error collection and reporting
- Performance metrics collection

### Logging Levels

- **INFO**: Normal workflow progression
- **WARN**: Non-critical issues
- **ERROR**: Critical failures
- **DEBUG**: Detailed execution information

## Testing

### Validation Script

Run the test script to validate the workflow:

```bash
node scripts/test-n8n-workflow.js
```

### Test Coverage

- JSON structure validation
- Node connectivity verification
- Environment variable usage
- Error handling implementation
- Performance considerations

## Deployment

### Prerequisites

1. N8N instance running
2. Environment variables configured
3. Webhook endpoint accessible
4. JetNet API credentials valid

### Import Steps

1. Copy the `sync.json` file to your N8N instance
2. Import the workflow
3. Configure environment variables
4. Test with a small batch first
5. Monitor execution logs

### Production Considerations

- Set up monitoring and alerting
- Configure backup and recovery
- Implement rate limiting
- Monitor API usage limits

## Troubleshooting

### Common Issues

#### Authentication Failures

- Verify JetNet credentials
- Check API endpoint availability
- Review token expiration settings

#### Data Processing Errors

- Check aircraft data format
- Verify required fields presence
- Review transformation logic

#### Webhook Delivery Failures

- Verify webhook URL accessibility
- Check authentication requirements
- Review payload format

#### Performance Issues

- Adjust batch sizes
- Review timeout settings
- Monitor resource usage

### Debug Mode

Enable debug logging by setting:

```javascript
console.log('Debug information:', data);
```

## Security Considerations

### Credential Management

- Use environment variables for sensitive data
- Implement proper access controls
- Regular credential rotation

### Data Protection

- Encrypt sensitive data in transit
- Implement proper authentication
- Follow data privacy regulations

### API Security

- Rate limiting implementation
- Request validation
- Error message sanitization

## Maintenance

### Regular Tasks

- Monitor workflow execution
- Review error logs
- Update API credentials
- Performance optimization

### Updates

- JetNet API changes
- Workflow improvements
- Security patches
- Feature enhancements

## Support

### Documentation

- This documentation file
- N8N workflow documentation
- JetNet API documentation

### Monitoring

- Workflow execution logs
- Error tracking
- Performance metrics
- User activity logs

---

**Last Updated**: January 2025
**Version**: 1.0
**Status**: Production Ready
