#!/bin/bash
# Deploy NanoClaw to a VPS
# Run this script on your DigitalOcean droplet

set -e

echo "=== NanoClaw Deployment ==="

# Check Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker installed. Please log out and back in, then run this script again."
    exit 1
fi

# Check .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Create .env with:"
    echo "  ANTHROPIC_API_KEY=your-key"
    echo "  # or CLAUDE_CODE_OAUTH_TOKEN=your-token"
    exit 1
fi

# Build the agent container image
echo ""
echo "Building agent container image..."
./container/build.sh

# Build and start the host
echo ""
echo "Building and starting NanoClaw host..."
npm run build
docker compose up -d --build

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "View logs: docker compose logs -f"
echo "Stop: docker compose down"
echo ""
echo "WhatsApp auth: Check logs for QR code on first run"
