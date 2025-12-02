#!/bin/bash

# Script to update ngrok domain in next.config.ts
# Usage: ./update-ngrok-domain.sh <ngrok-domain>
# Example: ./update-ngrok-domain.sh 458132522b31.ngrok-free.app

if [ -z "$1" ]; then
  echo "❌ Error: Please provide ngrok domain"
  echo ""
  echo "Usage: ./update-ngrok-domain.sh <ngrok-domain>"
  echo "Example: ./update-ngrok-domain.sh 458132522b31.ngrok-free.app"
  echo ""
  echo "To get your current domain, run: curl -s http://localhost:4040/api/tunnels | grep public_url"
  exit 1
fi

NGROK_DOMAIN=$1
# Remove protocol if present
NGROK_DOMAIN=${NGROK_DOMAIN#https://}
NGROK_DOMAIN=${NGROK_DOMAIN#http://}

CONFIG_FILE="main/filmaddict/next.config.ts"

echo "Updating $CONFIG_FILE with domain: $NGROK_DOMAIN"

# Update the next.config.ts file
cat > "$CONFIG_FILE" << EOF
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok domains - updated by ./update-ngrok-domain.sh
  allowedDevOrigins: [
    "$NGROK_DOMAIN",
  ],
};

export default nextConfig;
EOF

echo "✅ Updated $CONFIG_FILE"
echo ""
echo "⚠️  IMPORTANT: Restart your frontend dev server (npm run dev) for changes to take effect!"

