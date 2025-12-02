#!/bin/bash

# Start ngrok tunnel for Frontend (port 3000)

echo "Starting ngrok tunnel for Frontend (port 3000)..."
echo ""

# Kill any existing ngrok on port 3000
pkill -f "ngrok http 3000" 2>/dev/null
sleep 1

# Start tunnel
ngrok http 3000

