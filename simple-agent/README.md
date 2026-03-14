# Simple Self-Improving Agent

A minimal single-process agent that:
- Responds to one Slack channel
- Uses Claude Agent SDK with skills + CLAUDE.md
- Can update its own instructions (self-improving)
- Runs continuously with scheduled tasks
- Auto-syncs workspace to GitHub

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. (Optional) Initialize workspace as git repo:
   ```bash
   cd workspace
   git init
   git remote add origin git@github.com:you/agent-workspace.git
   git push -u origin main
   ```

4. Run the agent:
   ```bash
   npm run dev
   ```

## Structure

```
simple-agent/
├── src/
│   ├── index.ts       # Main loop + agent invocation
│   ├── slack.ts       # Slack Socket Mode
│   ├── db.ts          # SQLite (sessions, messages, tasks)
│   ├── scheduler.ts   # Scheduled task runner
│   └── git-sync.ts    # Auto-commit workspace changes
├── workspace/
│   ├── CLAUDE.md      # Agent instructions (self-modifiable)
│   └── learnings.md   # Agent's accumulated knowledge
├── .claude/skills/    # Skills (auto-loaded by Claude)
├── mcp-servers/       # MCP servers (Apify)
└── vendor/            # TSG tools
```

## Self-Improvement

The agent can update its own instructions:
1. `workspace/CLAUDE.md` - Primary instructions
2. `workspace/learnings.md` - Accumulated knowledge

After completing tasks, the agent reflects and updates these files.

## Git Sync

If workspace is a git repo:
- Pulls latest changes before each agent run
- Auto-commits and pushes after modifications
- Commit message: "Agent: <summary of changes>"

This allows you to:
- Pull agent's changes locally
- Push instruction updates from your machine
- Track agent's learning over time

## Scheduled Tasks

Tasks are stored in SQLite and checked every minute:

```typescript
// Create via agent prompt:
"Schedule a task to check my email every morning at 9am"

// Task types:
// - once: Run once at specified time
// - cron: Cron expression (e.g., "0 9 * * *")
// - interval: Milliseconds between runs
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_BOT_TOKEN` | Yes | Slack bot OAuth token (xoxb-...) |
| `SLACK_APP_TOKEN` | Yes | Slack app-level token (xapp-...) |
| `SLACK_CHANNEL` | Yes | Slack channel ID to listen to |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `APIFY_TOKEN` | No | Apify API token for social search |
| `APIFY_DAILY_BUDGET` | No | Daily Apify budget (default: $5) |
| `TSG_API_KEY` | No | TSG backend API key |
| `TSG_API_URL` | No | TSG backend URL |

## Deployment

### Systemd Service

```ini
[Unit]
Description=Simple Agent
After=network.target

[Service]
Type=simple
User=agent
WorkingDirectory=/opt/simple-agent
ExecStart=/usr/bin/node dist/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Docker

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
COPY workspace ./workspace
COPY .claude ./. claude
CMD ["node", "dist/index.js"]
```

## Verification

1. Start the agent: `npm run dev`
2. In Slack: `@Agent hello`
3. Verify response appears
4. Ask: `@Agent update your learnings.md with a note about this test`
5. Check `workspace/learnings.md` was modified
6. If git sync enabled, check GitHub for new commit
