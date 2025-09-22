# Complete JETNET API Setup for GoHighLevel

## 1. Custom Fields Setup

### Lead/Contact Custom Fields
Navigate to **Settings > Custom Fields > Contact** and create:

```
Field Name: Aircraft Registration
Field Type: Text
API Name: aircraft_registration

Field Name: Aircraft Make
Field Type: Text  
API Name: aircraft_make

Field Name: Aircraft Model
Field Type: Text
API Name: aircraft_model

Field Name: Aircraft Year
Field Type: Number
API Name: aircraft_year

Field Name: Aircraft Value
Field Type: Currency
API Name: aircraft_value

Field Name: Aircraft Status
Field Type: Dropdown
Options: For Sale, Not For Sale, Sale Pending, Sold
API Name: aircraft_status

Field Name: JETNET Aircraft ID
Field Type: Text
API Name: jetnet_aircraft_id

Field Name: Owner Type
Field Type: Dropdown
Options: Owner, Operator, Fractional Owner, Lessee
API Name: owner_type

Field Name: Last Updated
Field Type: Date
API Name: jetnet_last_updated
```

### Company Custom Fields
Navigate to **Settings > Custom Fields > Opportunity** and create:

```
Field Name: Company JETNET ID
Field Type: Text
API Name: jetnet_company_id

Field Name: Business Type
Field Type: Text
API Name: business_type

Field Name: Fleet Size
Field Type: Number
API Name: fleet_size
```

## 2. Webhooks Setup

### Create Webhook Endpoints
Go to **Settings > Integrations > Webhooks**

**Webhook 1: Aircraft Data Update**
- URL: `https://hooks.zapier.com/hooks/catch/YOUR_WEBHOOK_ID/aircraft-update/`
- Events: Contact Created, Contact Updated
- Name: JETNET Aircraft Lookup

**Webhook 2: Market Intelligence**
- URL: `https://hooks.zapier.com/hooks/catch/YOUR_WEBHOOK_ID/market-intel/`
- Events: Opportunity Created
- Name: JETNET Market Intelligence

## 3. Custom Values & Settings

### API Configuration (Store in Custom Values)
Go to **Settings > Company > Custom Values**

```
JETNET_API_EMAIL: [YOUR_EMAIL_HERE]
JETNET_API_PASSWORD: [YOUR_PASSWORD_HERE]
JETNET_BASE_URL: https://customer.jetnetconnect.com/api
JETNET_BEARER_TOKEN: [AUTO_POPULATED]
JETNET_SECURITY_TOKEN: [AUTO_POPULATED]
```

## 4. Workflow Automations

### Workflow 1: Aircraft Registration Lookup
**Trigger:** Contact is created OR Aircraft Registration field is updated

**Actions:**
1. **HTTP Request - Get JETNET Auth Token**
   ```
   Method: POST
   URL: {{JETNET_BASE_URL}}/Admin/APILogin
   Headers: 
     Content-Type: application/json
     Accept: application/json
   Body:
   {
     "emailaddress": "{{JETNET_API_EMAIL}}",
     "password": "{{JETNET_API_PASSWORD}}"
   }
   ```

2. **HTTP Request - Lookup Aircraft by Registration**
   ```
   Method: GET
   URL: {{JETNET_BASE_URL}}/Aircraft/getRegNumber/{{aircraft_registration}}/{{bearer_token}}
   Headers:
     Accept: application/json
   ```

3. **Update Contact Fields**
   - Aircraft Make: `{{response.aircraft.identification.make}}`
   - Aircraft Model: `{{response.aircraft.identification.model}}`
   - Aircraft Year: `{{response.aircraft.identification.yearmfr}}`
   - JETNET Aircraft ID: `{{response.aircraft.identification.aircraftid}}`

4. **Add Tag:** "Aircraft Verified"

5. **Create Task:** "Follow up on aircraft inquiry"

### Workflow 2: Detailed Aircraft Information
**Trigger:** Tag "Aircraft Verified" is added

**Actions:**
1. **HTTP Request - Get Full Aircraft Data**
   ```
   Method: GET
   URL: {{JETNET_BASE_URL}}/Aircraft/getAircraft/{{jetnet_aircraft_id}}/{{security_token}}
   Headers:
     Accept: application/json
   ```

2. **Update Contact Fields with Detailed Info**
   - Aircraft Status: `{{response.aircraft.status.marketstatus}}`
   - Aircraft Value: `{{response.aircraft.status.askingprice}}`
   - Owner Type: `{{response.aircraft.companyrelationships[0].relationtype}}`

3. **Create Opportunity**
   - Name: "Aircraft Sale - {{aircraft_make}} {{aircraft_model}}"
   - Value: `{{aircraft_value}}`
   - Stage: "Prospecting"

### Workflow 3: Market Intelligence Updates
**Trigger:** Weekly schedule (every Monday 9 AM)

**Actions:**
1. **Find Contacts** with tag "Aircraft Owner"

2. **For Each Contact:**
   - **HTTP Request - Get Model Market Trends**
   ```
   Method: POST
   URL: {{JETNET_BASE_URL}}/Model/getModelMarketTrends/{{security_token}}
   Headers:
     Content-Type: application/json
   Body:
   {
     "makes": ["{{aircraft_make}}"],
     "models": ["{{aircraft_model}}"]
   }
   ```

3. **Send Email** with market update if significant price changes

### Workflow 4: Lead Qualification Enhancement
**Trigger:** New lead created from website form

**Actions:**
1. **Check if Aircraft Registration provided**

2. **If Yes:**
   - Run Aircraft Lookup (Workflow 1)
   - Add tag "High Value Prospect"
   - Assign to senior sales rep

3. **If No:**
   - Send email requesting aircraft details
   - Add to nurture sequence

## 5. Forms Setup

### Aircraft Owner Form
Create new form: **Settings > Sites > Funnels > Forms**

**Fields:**
- First Name (required)
- Last Name (required)  
- Email (required)
- Phone (required)
- Aircraft Registration (required)
- Interest Level (dropdown): Selling, Buying, General Information

**Form Actions:**
- Create Contact
- Add Tag: "Aircraft Owner"
- Trigger Workflow: "Aircraft Registration Lookup"

### Aircraft Inquiry Form
**Fields:**
- Name (required)
- Email (required)
- Aircraft Make (dropdown with common makes)
- Aircraft Model
- Year Range
- Budget Range
- Timeline

## 6. Pipelines Setup

### Sales Pipeline: Aircraft Sales
**Stages:**
1. **Lead** - Initial inquiry
2. **Qualified** - Aircraft verified in JETNET
3. **Proposal** - Pricing/market analysis sent
4. **Negotiation** - Active discussions
5. **Contract** - Paperwork stage
6. **Closed Won** - Sale completed
7. **Closed Lost** - Deal lost

### Service Pipeline: Aircraft Services
**Stages:**
1. **Inquiry** - Service request
2. **Assessment** - Aircraft evaluation
3. **Quote** - Service proposal
4. **Scheduled** - Service booked
5. **In Progress** - Work being done
6. **Completed** - Service finished

## 7. Email Templates

### Template 1: Aircraft Verification Success
```
Subject: We found your {{aircraft_make}} {{aircraft_model}}!

Hi {{first_name}},

Great news! We've verified your {{aircraft_year}} {{aircraft_make}} {{aircraft_model}} 
(Registration: {{aircraft_registration}}) in our database.

Based on current market data:
- Estimated Value: {{aircraft_value}}
- Market Status: {{aircraft_status}}

Would you like a detailed market analysis for your aircraft?

Best regards,
[Your Team]
```

### Template 2: Market Update
```
Subject: Market Update for Your {{aircraft_make}} {{aircraft_model}}

Hi {{first_name}},

Here's this week's market update for your aircraft:

{{market_trends_summary}}

If you're considering selling, now might be a great time to discuss your options.

[Schedule a call button]
```

## 8. Dashboard & Reports

### Custom Dashboard Widgets
1. **Aircraft Inventory** - Count of verified aircraft
2. **Market Value Total** - Sum of all aircraft values
3. **Hot Prospects** - Contacts with high-value aircraft
4. **Recent Lookups** - Latest JETNET API calls

### Automated Reports
1. **Weekly Market Report** - Sent every Monday
2. **New Aircraft Registrations** - Daily summary
3. **High Value Prospects** - Weekly alert

## 9. API Monitoring & Error Handling

### Workflow: API Health Check
**Trigger:** Daily at 8 AM

**Actions:**
1. **Test API Connection**
2. **If Failed:** Send alert to admin
3. **Log API Usage** in custom field

### Error Handling in Main Workflows
- Add **If/Else** conditions for API failures
- Create tasks for manual follow-up on errors
- Log errors to contact timeline

## 10. Tags & Organization

### Automatic Tags
- "Aircraft Verified" - JETNET lookup successful
- "High Value Aircraft" - Value > $5M
- "Commercial Owner" - Business aircraft
- "For Sale" - Aircraft listed for sale
- "API Error" - Lookup failed

### Manual Tags for Segmentation
- "Hot Prospect"
- "Past Customer"
- "Referral Source"
- "VIP Client"

## 11. Integration Testing Checklist

When you get your API keys:

### Phase 1: Basic Setup
- [ ] Add API credentials to Custom Values
- [ ] Test authentication endpoint
- [ ] Verify bearer token generation

### Phase 2: Core Functionality
- [ ] Test aircraft lookup by registration
- [ ] Verify custom field population
- [ ] Test workflow triggers

### Phase 3: Advanced Features
- [ ] Test market intelligence updates
- [ ] Verify email automations
- [ ] Test error handling

### Phase 4: Go Live
- [ ] Import existing aircraft data
- [ ] Train team on new features
- [ ] Monitor API usage and costs

## 12. Quick Activation Instructions

**Once you have API keys:**

1. Go to **Settings > Company > Custom Values**
2. Update `JETNET_API_EMAIL` and `JETNET_API_PASSWORD`
3. Activate the "Aircraft Registration Lookup" workflow
4. Test with a known aircraft registration
5. Verify data populates correctly
6. Enable remaining workflows one by one

**Ready to activate immediately when your API access is confirmed!**