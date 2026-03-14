#!/bin/bash
# Pull workspace from DO (via agent-learnings branch or direct rsync)
# Usage: ./scripts/pull-workspace.sh [IP]

set -e

IP="${1:-68.183.102.58}"
USER="root"

echo "=== Pulling workspace from $IP ==="

# Option 1: Direct rsync from DO
echo "Syncing workspace from DO..."
rsync -avz --progress "$USER@$IP:/opt/nanoclaw/groups/*/workspace/" groups/ \
    --include="*/" \
    --include="*/workspace/**" \
    --exclude="*" \
    2>/dev/null || {
    echo "rsync failed, trying scp..."
    for group in $(ssh "$USER@$IP" "ls /opt/nanoclaw/groups/"); do
        if ssh "$USER@$IP" "[ -d /opt/nanoclaw/groups/$group/workspace ]"; then
            mkdir -p "groups/$group/workspace"
            scp -r "$USER@$IP:/opt/nanoclaw/groups/$group/workspace/"* "groups/$group/workspace/" 2>/dev/null || true
        fi
    done
}

echo ""
echo "=== Done ==="
echo "Workspace pulled to groups/*/workspace/"
echo ""
echo "To see changes: git status groups/"
echo "To commit: git add groups/*/workspace/ && git commit -m 'sync workspace from DO'"
