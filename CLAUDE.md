# Claude Code Configuration - Ace Aircraft Sales

## GoHighLevel MCP Integration

This project includes a GoHighLevel MCP (Model Context Protocol) integration that allows Claude Code to interact directly with the Ace Aircraft Sales GoHighLevel sub-account.

### MCP Server Details
- **Server Name**: `ace-aircraft-sales-ghl`
- **Type**: Remote HTTP server via stdio
- **URL**: `https://services.leadconnectorhq.com/mcp/`
- **Scope**: Project-level (specific to this Ace Aircraft Sales project)

### Authentication
The integration uses Bearer token authentication with the following headers:
- `Authorization`: Bearer token for API access
- `locationId`: Specific to the Ace Aircraft Sales GHL sub-account

### Configuration Files
- `.mcp.json`: Contains the MCP server configuration
- Claude Code automatically manages the connection via the local config

### Usage
Once configured, you can use Claude Code to:
- Access GHL contacts and leads
- Manage campaigns and automations
- Retrieve analytics and reporting data
- Interact with the CRM functionality
- And more GoHighLevel features via the MCP interface

### Commands Used
- `claude mcp add ace-aircraft-sales-ghl` - Adds the MCP server
- `claude mcp list` - Lists configured MCP servers
- `claude mcp remove ace-aircraft-sales-ghl` - Removes the server if needed

### Troubleshooting
If you encounter connection issues:
1. Verify the Bearer token is still valid
2. Check that the locationId matches the correct GHL sub-account
3. Ensure `npx` and `mcp-remote` are available in your environment