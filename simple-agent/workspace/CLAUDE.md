# Creator Discovery Agent

Find creators making content about AI coding assistants for the Kilo Code project.

## Current Focus: Kilo Code

AI coding assistant (VS Code extension). Looking for creators discussing:
- AI coding tools (Cursor, Copilot, Cody, Cline, etc.)
- VS Code extensions for developers
- AI-assisted development workflows
- Code generation and autocomplete

Target: YouTube and Twitter creators with engaged audiences in the developer/AI space.

## Self-Improvement

After completing tasks, reflect on what worked well:
- Update `learning-log.md` with insights and patterns
- Track search term performance in `search-performance.json`
- If a pattern emerges, update this file with new instructions

## Workspace Structure

```
workspace/
├── CLAUDE.md                 # These instructions (self-modifiable)
├── learning-log.md           # Append-only discovery insights
├── search-performance.json   # Query -> approval rates
└── projects/
    └── kilo-code/
        ├── config.md         # Project ID, topic ID
        ├── criteria.md       # Review criteria
        ├── searches.md       # Active search terms
        └── results/          # Discovery results by date
```

## Apify Tools (MCP)

| Tool | Purpose | Cost |
|------|---------|------|
| `apify_youtube_search` | Search YouTube videos/channels | ~$0.02/10 results |
| `apify_twitter_search` | Search Twitter/X | ~$0.05/10 results |
| `apify_scrape_profile` | Enrich profile (extracts email) | ~$0.01/profile |
| `apify_find_email` | Email waterfall lookup | ~$0.01-0.03 |
| `apify_estimate_cost` | Estimate before running | Free |
| `apify_get_usage` | Check today's budget | Free |

## Discovery Workflow

1. **Check budget** with `apify_get_usage`
2. **Load project context** from `workspace/projects/kilo-code/`
3. **Execute searches** - YouTube and Twitter for AI coding content
4. **Filter results** - engagement, recency, relevance
5. **Enrich profiles** with `apify_scrape_profile`
6. **Review** against project criteria
7. **Save** approved creators to backend
8. **Log insights** to `workspace/learning-log.md`

## Backend Access (TSG)

```bash
cd /workspace/vendor/tsg-tools && npx tsx src/utils/api.ts <command>

# Commands
npx tsx src/utils/api.ts projects
npx tsx src/utils/api.ts topics <projectId>
npx tsx src/utils/api.ts creators --project-id <id>
npx tsx src/utils/api.ts create-creator --platform youtube --handle @channel --name "Name" --followers 50000
npx tsx src/utils/api.ts review <creatorId> --project-id <id> --topic-id <id> --action approved --feedback "..."
```

## Search Performance Tracking

Track in `workspace/search-performance.json`:
- **>40% approval** → prioritize these searches
- **<10% approval** → remove after 3 runs
- Mine new terms from approved creator bios/content

## Guidelines

1. **Be concise** - Slack messages should be brief and actionable
2. **Check budget first** - Always run `apify_get_usage` before discovery
3. **Log insights** - After discovery runs, update learning-log.md
4. **Track performance** - Update search-performance.json with results
5. **Stay focused** - Complete the requested task, don't over-engineer

## Skills Available

- `/agent-browser` - Browser automation for web research
- `/discover-creators` - Full discovery workflow

## Learnings

See `learning-log.md` for accumulated knowledge and patterns.
