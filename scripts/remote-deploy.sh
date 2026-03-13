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

# Extract env vars needed for systemd
CLAUDE_CODE_OAUTH_TOKEN=$(grep "^CLAUDE_CODE_OAUTH_TOKEN=" .env | cut -d= -f2-)
ANTHROPIC_API_KEY=$(grep "^ANTHROPIC_API_KEY=" .env | cut -d= -f2-)
SLACK_BOT_TOKEN=$(grep "^SLACK_BOT_TOKEN=" .env | cut -d= -f2-)
SLACK_APP_TOKEN=$(grep "^SLACK_APP_TOKEN=" .env | cut -d= -f2-)
TSG_BACKEND_URL=$(grep "^TSG_BACKEND_URL=" .env | cut -d= -f2-)
TSG_API_KEY=$(grep "^TSG_API_KEY=" .env | cut -d= -f2-)

# Need either OAuth token or API key
if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: Need CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY in .env"
    exit 1
fi
if [ -z "$SLACK_BOT_TOKEN" ] || [ -z "$SLACK_APP_TOKEN" ]; then
    echo "Error: SLACK_BOT_TOKEN and SLACK_APP_TOKEN required in .env"
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
    --exclude='vendor/tsg-tools/node_modules' \
    --exclude='.git' \
    --exclude='store/auth' \
    --exclude='store/messages.db' \
    --exclude='data' \
    --exclude='logs' \
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
ssh "$USER@$IP" bash << REMOTE_SCRIPT
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

# Install TSG tools dependencies (for content-biz group)
if [ -d vendor/tsg-tools ]; then
    echo "Installing TSG tools dependencies..."
    cd vendor/tsg-tools && npm ci --omit=dev && cd ../..
    # Make readable by container user (UID 1000)
    chmod -R a+rX vendor/tsg-tools
fi

# Build agent container
echo "Building agent container..."
./container/build.sh

# Fix data directory permissions for container user (UID 1000)
mkdir -p /opt/nanoclaw/data/sessions /opt/nanoclaw/data/ipc
chown -R 1000:1000 /opt/nanoclaw/data/sessions /opt/nanoclaw/data/ipc

# Create systemd service with environment variables
cat > /etc/systemd/system/nanoclaw.service << 'SERVICEEOF'
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
Environment=HOME=/root
Environment=ASSISTANT_NAME=TSG Discovery
Environment=DISABLE_WHATSAPP=1
SERVICEEOF

# Append environment variables (these are expanded from local .env)
if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
    echo "Environment=CLAUDE_CODE_OAUTH_TOKEN=$CLAUDE_CODE_OAUTH_TOKEN" >> /etc/systemd/system/nanoclaw.service
fi
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "Environment=ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" >> /etc/systemd/system/nanoclaw.service
fi
echo "Environment=SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN" >> /etc/systemd/system/nanoclaw.service
echo "Environment=SLACK_APP_TOKEN=$SLACK_APP_TOKEN" >> /etc/systemd/system/nanoclaw.service
if [ -n "$TSG_BACKEND_URL" ]; then
    echo "Environment=TSG_BACKEND_URL=$TSG_BACKEND_URL" >> /etc/systemd/system/nanoclaw.service
fi
if [ -n "$TSG_API_KEY" ]; then
    echo "Environment=TSG_API_KEY=$TSG_API_KEY" >> /etc/systemd/system/nanoclaw.service
fi

# Add install section
cat >> /etc/systemd/system/nanoclaw.service << 'SERVICEEOF'

[Install]
WantedBy=multi-user.target
SERVICEEOF

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
