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
APIFY_TOKEN=$(grep "^APIFY_TOKEN=" .env | cut -d= -f2-)
APIFY_DAILY_BUDGET=$(grep "^APIFY_DAILY_BUDGET=" .env | cut -d= -f2-)

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
    --exclude='groups/*/workspace' \
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

# Fix group directory permissions so agent can edit CLAUDE.md and workspace files
for group_dir in /opt/nanoclaw/groups/*/; do
    chown -R 1000:1000 "\$group_dir"
done

# Seed workspace if it doesn't exist (never overwrite existing)
for group_dir in /opt/nanoclaw/groups/*/; do
    group_name=\$(basename "\$group_dir")
    workspace_dir="\${group_dir}workspace"

    if [ ! -d "\$workspace_dir" ] || [ -z "\$(ls -A "\$workspace_dir" 2>/dev/null)" ]; then
        echo "Seeding workspace for \$group_name (empty or missing)..."
        mkdir -p "\$workspace_dir"
        # Will be seeded by separate scp if local has content
    else
        echo "Preserving existing workspace for \$group_name"
    fi
done

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
Environment="ASSISTANT_NAME=TSG Discovery"
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
if [ -n "$APIFY_TOKEN" ]; then
    echo "Environment=APIFY_TOKEN=$APIFY_TOKEN" >> /etc/systemd/system/nanoclaw.service
fi
if [ -n "$APIFY_DAILY_BUDGET" ]; then
    echo "Environment=APIFY_DAILY_BUDGET=$APIFY_DAILY_BUDGET" >> /etc/systemd/system/nanoclaw.service
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

# === Git sync setup for agent learnings ===
echo ""
echo "Setting up git sync for agent learnings..."

# Generate deploy key if not exists
DEPLOY_KEY="/root/.ssh/nanoclaw_deploy_key"
if [ ! -f "\$DEPLOY_KEY" ]; then
    echo "Generating deploy key..."
    ssh-keygen -t ed25519 -f "\$DEPLOY_KEY" -N "" -C "nanoclaw-deploy@\$(hostname)"
    echo ""
    echo "=================================================="
    echo "DEPLOY KEY GENERATED - ADD TO GITHUB"
    echo "=================================================="
    echo "Add this key to: https://github.com/dkrevitt/nanoclaw/settings/keys"
    echo "Enable 'Allow write access' checkbox"
    echo ""
    cat "\${DEPLOY_KEY}.pub"
    echo ""
    echo "=================================================="
fi

# Configure SSH to use deploy key for github
cat > /root/.ssh/config << 'SSHEOF'
Host github.com
    IdentityFile /root/.ssh/nanoclaw_deploy_key
    StrictHostKeyChecking accept-new
SSHEOF
chmod 600 /root/.ssh/config

# Initialize git repo if needed
cd /opt/nanoclaw
git config --global --add safe.directory /opt/nanoclaw
if [ ! -d .git ]; then
    echo "Initializing git repository..."
    git init
    git remote add origin git@github.com:dkrevitt/nanoclaw.git
fi

# Configure git user for commits
git config user.email "nanoclaw@$(hostname)"
git config user.name "NanoClaw Agent"

# Ensure remote uses SSH
git remote set-url origin git@github.com:dkrevitt/nanoclaw.git || true

# Make sync script executable
chmod +x /opt/nanoclaw/scripts/sync-learnings.sh

# Create systemd timer for hourly sync
cat > /etc/systemd/system/nanoclaw-sync.service << 'SYNCSERVICEEOF'
[Unit]
Description=Sync NanoClaw agent learnings to git
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=/opt/nanoclaw
ExecStart=/opt/nanoclaw/scripts/sync-learnings.sh
User=root
Environment=HOME=/root
SYNCSERVICEEOF

cat > /etc/systemd/system/nanoclaw-sync.timer << 'SYNCTIMEREOF'
[Unit]
Description=Run NanoClaw sync hourly

[Timer]
OnBootSec=5min
OnUnitActiveSec=1h
Persistent=true

[Install]
WantedBy=timers.target
SYNCTIMEREOF

# Enable and start timer
systemctl daemon-reload
systemctl enable nanoclaw-sync.timer
systemctl start nanoclaw-sync.timer

echo ""
echo "=== Deployment complete ==="
echo "View logs: journalctl -u nanoclaw -f"
echo "Sync timer: systemctl status nanoclaw-sync.timer"
REMOTE_SCRIPT

# Seed workspace directories that are empty on DO but have content locally
echo ""
echo "Checking if workspace needs seeding..."
for group_dir in groups/*/; do
    group_name=$(basename "$group_dir")
    local_workspace="$group_dir/workspace"

    if [ -d "$local_workspace" ] && [ -n "$(ls -A "$local_workspace" 2>/dev/null)" ]; then
        # Check if remote workspace is empty
        remote_empty=$(ssh "$USER@$IP" "[ -z \"\$(ls -A /opt/nanoclaw/groups/$group_name/workspace 2>/dev/null)\" ] && echo 'yes' || echo 'no'")

        if [ "$remote_empty" = "yes" ]; then
            echo "Seeding workspace for $group_name..."
            scp -r "$local_workspace"/* "$USER@$IP:/opt/nanoclaw/groups/$group_name/workspace/"
            ssh "$USER@$IP" "chown -R 1000:1000 /opt/nanoclaw/groups/$group_name/workspace"
        else
            echo "Workspace for $group_name already has content, skipping"
        fi
    fi
done

echo ""
echo "=== Done ==="
echo "SSH in and check logs: ssh $USER@$IP 'journalctl -u nanoclaw -f'"
echo ""
echo "To pull workspace changes back: ./scripts/pull-workspace.sh $IP"
