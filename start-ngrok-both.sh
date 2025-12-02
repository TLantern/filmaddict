#!/bin/bash

# Start both ngrok tunnels using config file
# This uses ngrok 3.x's ability to run multiple tunnels from one instance

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/ngrok.yml"

echo "Starting ngrok tunnels (backend + frontend)..."
echo ""

# Kill any existing ngrok processes
pkill -f "ngrok" 2>/dev/null
sleep 2

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Error: Config file not found at $CONFIG_FILE"
  exit 1
fi

# Start both tunnels using config file
echo "Starting tunnels from config..."
ngrok start --config="$CONFIG_FILE" --all > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
echo "ngrok started (PID: $NGROK_PID)"
echo ""

echo "Waiting for tunnels to initialize..."
sleep 5

echo ""
echo "=== Public Tunnel URLs ==="
echo ""

# Get URLs from ngrok API
API_RESPONSE=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null)

if [ -z "$API_RESPONSE" ]; then
  echo "⚠️  Could not connect to ngrok API"
  echo "   Check if ngrok is running: ps aux | grep ngrok"
  echo "   Check logs: tail -f /tmp/ngrok.log"
  exit 1
fi

# Extract backend URL (tunnel named "backend")
BACKEND_URL=$(echo "$API_RESPONSE" | grep -o '"name":"backend"[^}]*"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)
if [ -z "$BACKEND_URL" ]; then
  # Fallback: get first tunnel URL
  BACKEND_URL=$(echo "$API_RESPONSE" | grep -o '"public_url":"https://[^"]*' | head -1 | sed 's/"public_url":"//')
fi

# Extract frontend URL (tunnel named "frontend")
FRONTEND_URL=$(echo "$API_RESPONSE" | grep -o '"name":"frontend"[^}]*"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)
if [ -z "$FRONTEND_URL" ]; then
  # Fallback: get second tunnel URL
  FRONTEND_URL=$(echo "$API_RESPONSE" | grep -o '"public_url":"https://[^"]*' | tail -1 | sed 's/"public_url":"//')
fi

echo "Backend (port 8000):"
if [ -n "$BACKEND_URL" ]; then
  echo "  ✅ $BACKEND_URL"
  echo "  (forwards to http://localhost:8000)"
else
  echo "  ⚠️  Could not get URL"
fi

echo ""
echo "Frontend (port 3000):"
if [ -n "$FRONTEND_URL" ] && [ "$FRONTEND_URL" != "$BACKEND_URL" ]; then
  echo "  ✅ $FRONTEND_URL"
  echo "  (forwards to http://localhost:3000)"
else
  echo "  ⚠️  Could not get URL"
fi

echo ""
echo "💡 These are PUBLIC URLs - anyone with the link can access your app!"
echo ""
echo "📋 View tunnel details: http://localhost:4040"
echo ""

# Update frontend .env.local with backend URL for thumbnails
if [ -n "$BACKEND_URL" ]; then
  ENV_FILE="$SCRIPT_DIR/main/filmaddict/.env.local"
  echo "Updating frontend environment..."
  
  # Remove old NEXT_PUBLIC_API_URL if exists
  if [ -f "$ENV_FILE" ]; then
    sed -i.bak '/^NEXT_PUBLIC_API_URL=/d' "$ENV_FILE" 2>/dev/null || true
  fi
  
  # Add or update NEXT_PUBLIC_API_URL
  echo "NEXT_PUBLIC_API_URL=$BACKEND_URL" >> "$ENV_FILE"
  echo "✅ Updated $ENV_FILE with backend URL"
  echo "   ⚠️  Restart your Next.js dev server for thumbnails to work!"
fi

echo ""
echo "To stop tunnels: kill $NGROK_PID"
echo "Or: pkill -f 'ngrok start'"

