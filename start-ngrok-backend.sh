#!/bin/bash

# Start ngrok tunnel for Backend (port 8000)

echo "Starting ngrok tunnel for Backend (port 8000)..."
echo ""

# Kill any existing ngrok on port 8000
pkill -f "ngrok http 8000" 2>/dev/null
sleep 1

# Start tunnel
ngrok http 8000

