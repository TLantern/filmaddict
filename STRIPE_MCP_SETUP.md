# Stripe MCP Server Setup

This project uses Stripe MCP (Model Context Protocol) server for Stripe API interactions.

## Setup Instructions

### Step 1: Configure MCP Server in Cursor

Run the setup script:
```bash
./setup-stripe-mcp.sh
```

Or manually configure:

**Option A: Local MCP Server (Recommended for development)**

1. Open or create `~/.cursor/mcp.json` in your home directory
2. Add the following configuration:

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp", "--tools=all"],
      "env": {
        "STRIPE_SECRET_KEY": "your_stripe_secret_key_here"
      }
    }
  }
}
```

**Option B: Remote MCP Server (OAuth)**

1. Open or create `~/.cursor/mcp.json`
2. Add:

```json
{
  "mcpServers": {
    "stripe": {
      "url": "https://mcp.stripe.com"
    }
  }
}
```

Then authenticate via OAuth when prompted.

### Step 2: Restart Cursor

After adding the configuration, restart Cursor to load the MCP server.

### Step 3: Verify Setup

The AI assistant will automatically detect Stripe MCP tools when available. You can verify by asking it to use Stripe MCP tools.

## Available MCP Tools

- `create_product` - Create products
- `create_price` - Create prices
- `create_customer` - Create customers
- `create_invoice` - Create invoices
- `create_invoice_item` - Create invoice items
- `finalize_invoice` - Finalize invoices
- `list_products` - List products
- `list_prices` - List prices
- And more...

## Environment Variables

Make sure your Stripe secret key is available:
- The local MCP server reads from `STRIPE_SECRET_KEY` environment variable
- Or from the `env` section in `mcp.json`

## Current Implementation

The checkout route (`/app/api/checkout/route.ts`) uses:
- **Product IDs**:
  - Monthly: `prod_Th91VZrp7AqGqV`
  - Yearly: `prod_Th9l611E4BEzeK`
- **Pricing**:
  - Monthly: $10/month (1000 cents)
  - Yearly: $100/year (10000 cents)
- **Trial**: 3-day trial with $1 upfront fee

The code automatically:
1. Lists existing prices for your product
2. Finds matching prices by interval and amount
3. Creates new prices if they don't exist

Once MCP is configured, the AI assistant can help migrate specific operations to use MCP tools.

