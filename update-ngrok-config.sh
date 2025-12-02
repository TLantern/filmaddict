#!/bin/bash

# Update next.config.ts with current ngrok URLs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/main/filmaddict/next.config.ts"

echo "Getting ngrok URLs..."

# Get all tunnel URLs
URLS=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | \
  python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    urls = [t['public_url'] for t in data.get('tunnels', []) if 'public_url' in t]
    for url in urls:
        print(url)
except:
    pass
" 2>/dev/null)

if [ -z "$URLS" ]; then
  echo "❌ No ngrok tunnels found"
  echo "   Make sure ngrok is running: ./start-ngrok-both.sh"
  exit 1
fi

echo "✅ Found ngrok URLs:"
echo "$URLS"

# Build the config array
CONFIG_ARRAY=""
while IFS= read -r url; do
  CONFIG_ARRAY="$CONFIG_ARRAY    \"$url\",\n"
done <<< "$URLS"

# Remove trailing comma
CONFIG_ARRAY=$(echo -e "$CONFIG_ARRAY" | sed '$ s/,$//')

# Update the config file
cat > "$CONFIG_FILE" <<EOF
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    // Current ngrok URLs (auto-updated by update-ngrok-config.sh)
$(echo -e "$CONFIG_ARRAY")
  ],
};

export default nextConfig;
EOF

echo ""
echo "✅ Updated $CONFIG_FILE"
echo ""
echo "⚠️  Restart your Next.js dev server for changes to take effect!"

