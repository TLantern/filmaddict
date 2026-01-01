#!/bin/bash

# Setup script for Stripe MCP Server in Cursor
# This script creates/updates the Cursor MCP configuration

CURSOR_MCP_CONFIG="$HOME/.cursor/mcp.json"
STRIPE_SECRET_KEY="your_stripe_secret_key_here"

# Check if mcp.json already exists
if [ -f "$CURSOR_MCP_CONFIG" ]; then
    echo "Found existing MCP config at $CURSOR_MCP_CONFIG"
    echo "Please manually add the Stripe MCP server configuration:"
    echo ""
    echo '{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp", "--tools=all"],
      "env": {
        "STRIPE_SECRET_KEY": "'"$STRIPE_SECRET_KEY"'"
      }
    }
  }
}'
    echo ""
    echo "Or merge the stripe server into your existing mcpServers object."
else
    echo "Creating MCP config at $CURSOR_MCP_CONFIG"
    mkdir -p "$HOME/.cursor"
    cat > "$CURSOR_MCP_CONFIG" << EOF
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp", "--tools=all"],
      "env": {
        "STRIPE_SECRET_KEY": "$STRIPE_SECRET_KEY"
      }
    }
  }
}
EOF
    echo "✅ MCP config created successfully!"
    echo "⚠️  Please restart Cursor for changes to take effect."
fi

