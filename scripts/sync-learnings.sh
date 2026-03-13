#!/bin/bash
# Sync agent learnings back to git repository
# Runs periodically via systemd timer on the server

set -e

REPO_DIR="/opt/nanoclaw"
BRANCH="agent-learnings"

cd "$REPO_DIR"

# Check if git is configured
if [ ! -d .git ]; then
    echo "Not a git repository, skipping sync"
    exit 0
fi

# Check if there are any workspace changes (force-add since gitignore excludes groups/*)
# We use -f to bypass gitignore, then check if anything was staged
git add -f groups/*/workspace/ 2>/dev/null || true

if git diff --cached --quiet; then
    echo "No workspace changes to sync"
    exit 0
fi

# Ensure we're on the learnings branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    # Check if branch exists remotely
    if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
        git fetch origin "$BRANCH"
        git checkout "$BRANCH"
        git reset --hard "origin/$BRANCH"
    else
        # Create new branch from current state
        git checkout -b "$BRANCH"
    fi
fi

# Pull latest to avoid conflicts (if branch exists remotely)
if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
    git pull --rebase origin "$BRANCH" || true
fi

# Files already staged above with force-add

# Commit with timestamp
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M UTC")
git commit -m "agent: sync learnings ($TIMESTAMP)"

# Push to remote
git push -u origin "$BRANCH"

echo "Synced learnings to origin/$BRANCH"
