#!/bin/bash

# Start both ngrok tunnels (backend + frontend)
# Uses ngrok config file to run both tunnels from one instance

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Use the both script if it exists, otherwise fall back to single tunnel
if [ -f "$SCRIPT_DIR/start-ngrok-both.sh" ]; then
  exec "$SCRIPT_DIR/start-ngrok-both.sh"
else
  echo "Starting ngrok tunnel for Backend (port 8000)..."
  echo ""
  echo "⚠️  For both tunnels, use: ./start-ngrok-both.sh"
  echo ""
  
  # Kill any existing ngrok processes
  pkill -f "ngrok http 8000" 2>/dev/null
  sleep 1
  
  # Start backend tunnel (port 8000) - runs in foreground so you can see the URL
  ngrok http 8000
fi

