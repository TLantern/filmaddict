#!/bin/bash

# Get the backend ngrok URL and update .env.local

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/main/filmaddict/.env.local"

echo "Getting backend ngrok URL..."

# Try to get backend tunnel URL from ngrok API
BACKEND_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | \
  python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for tunnel in data.get('tunnels', []):
        addr = tunnel.get('config', {}).get('addr', '')
        if '8000' in str(addr):
            print(tunnel.get('public_url', ''))
            break
except:
    pass
" 2>/dev/null)

if [ -z "$BACKEND_URL" ]; then
  # Fallback: try grep method
  BACKEND_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | \
    grep -o '"addr":"http://localhost:8000"[^}]*"public_url":"https://[^"]*' | \
    grep -o 'https://[^"]*' | head -1)
fi

if [ -z "$BACKEND_URL" ]; then
  echo "❌ Could not find backend ngrok tunnel"
  echo "   Make sure backend tunnel is running: ./start-ngrok-backend.sh"
  exit 1
fi

echo "✅ Found backend URL: $BACKEND_URL"

# Update .env.local
if [ -f "$ENV_FILE" ]; then
  # Remove old NEXT_PUBLIC_API_URL if exists
  sed -i.bak '/^NEXT_PUBLIC_API_URL=/d' "$ENV_FILE"
fi

# Add or update NEXT_PUBLIC_API_URL
echo "NEXT_PUBLIC_API_URL=$BACKEND_URL" >> "$ENV_FILE"

echo ""
echo "✅ Updated $ENV_FILE"
echo "   NEXT_PUBLIC_API_URL=$BACKEND_URL"
echo ""
echo "⚠️  Restart your Next.js dev server for changes to take effect!"

