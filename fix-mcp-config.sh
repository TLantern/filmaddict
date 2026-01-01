#!/bin/bash

# Fix Stripe MCP configuration - move it inside mcpServers

CURSOR_MCP_CONFIG="$HOME/.cursor/mcp.json"
TEMP_FILE=$(mktemp)

# Read current config and fix it
python3 << 'PYTHON_SCRIPT'
import json
import sys

try:
    with open('/Users/tenbandz/.cursor/mcp.json', 'r') as f:
        config = json.load(f)
    
    # Check if stripe is outside mcpServers
    if 'stripe' in config and 'stripe' not in config.get('mcpServers', {}):
        # Move stripe into mcpServers
        stripe_config = config.pop('stripe')
        if 'mcpServers' not in config:
            config['mcpServers'] = {}
        config['mcpServers']['stripe'] = stripe_config
        
        # Write back
        with open('/Users/tenbandz/.cursor/mcp.json', 'w') as f:
            json.dump(config, f, indent=2)
        
        print("✅ Fixed Stripe MCP configuration!")
        print("⚠️  Please restart Cursor for changes to take effect.")
    else:
        if 'stripe' in config.get('mcpServers', {}):
            print("✅ Stripe MCP is already correctly configured!")
        else:
            print("❌ Stripe MCP not found in configuration")
            sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
PYTHON_SCRIPT

