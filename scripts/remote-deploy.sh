#!/bin/bash
# Deploy NanoClaw to a remote VPS
# Usage: ./scripts/remote-deploy.sh <IP> [user]

set -e

IP="${1:?Usage: $0 <IP> [user]}"
USER="${2:-root}"
REMOTE_DIR="/opt/nanoclaw"

echo "=== Deploying NanoClaw to $USER@$IP ==="

# Check for required env vars locally
if [ ! -f .env ]; then
    echo "Error: .env file not found locally"
    echo "Create .env with your API keys first"
    exit 1
fi

# Build locally first
echo ""
echo "Building TypeScript locally..."
npm run build

# Ensure DISABLE_WHATSAPP is set for Slack-only mode
if ! grep -q "DISABLE_WHATSAPP" .env; then
    echo "Adding DISABLE_WHATSAPP=1 to .env for Slack-only mode..."
    echo "DISABLE_WHATSAPP=1" >> .env
fi

# Create deployment package (excluding node_modules, .git)
echo ""
echo "Creating deployment package..."
tar czf /tmp/nanoclaw-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='store/auth' \
    --exclude='store/messages.db' \
    --exclude='data' \
    --exclude='groups/*/logs' \
    --exclude='groups/*/conversations' \
    .

# Upload to server
echo ""
echo "Uploading to $IP..."
scp /tmp/nanoclaw-deploy.tar.gz "$USER@$IP:/tmp/"

# Run deployment on remote
echo ""
echo "Running deployment on remote..."
ssh "$USER@$IP" bash << 'REMOTE_SCRIPT'
set -e

# Install Docker if needed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
fi

# Install Node.js 22 if needed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi

# Create directory
mkdir -p /opt/nanoclaw
cd /opt/nanoclaw

# Extract new code
tar xzf /tmp/nanoclaw-deploy.tar.gz
rm /tmp/nanoclaw-deploy.tar.gz

# Install dependencies
npm ci --omit=dev

# Build agent container
echo "Building agent container..."
./container/build.sh

# Create systemd service
cat > /etc/systemd/system/nanoclaw.service << 'EOF'
[Unit]
Description=NanoClaw Assistant
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/nanoclaw
ExecStart=/usr/bin/node /opt/nanoclaw/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Reload and restart
systemctl daemon-reload
systemctl enable nanoclaw
systemctl restart nanoclaw

echo ""
echo "=== Deployment complete ==="
echo "View logs: journalctl -u nanoclaw -f"
REMOTE_SCRIPT

echo ""
echo "=== Done ==="
echo "SSH in and check logs: ssh $USER@$IP 'journalctl -u nanoclaw -f'"
