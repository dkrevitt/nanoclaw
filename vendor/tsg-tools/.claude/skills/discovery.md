# Discovery Skills

Execute and manage saved searches for creator discovery.

> **For running discovery pipelines, use `/discover-creators` command** which calls `POST /workflows/start-combined` with Inngest orchestration. The skills below are for individual operations and testing.

## Available Skills

| Skill | Description |
|-------|-------------|
| [/execute-search](discovery/execute-search.md) | Execute a single search (legacy, sync) |
| [/test-search](discovery/test-search.md) | Test a search without saving results |
| [/create-saved-search](discovery/create-saved-search.md) | Create a new saved search |
| [/list-saved-searches](discovery/list-saved-searches.md) | List saved searches for a topic |
| [/internal-discovery](discovery/internal-discovery.md) | Search existing database with saved search |
| [/search-by-content](discovery/search-by-content.md) | Ad-hoc keyword search across database |
| [/explore-replies](discovery/explore-replies.md) | Discover creators from Twitter thread replies |

## Discovery Modes (Twitter)

Twitter saved searches support two discovery modes:

| Mode | Description | Finds |
|------|-------------|-------|
| `standard` | Search tweets → extract authors | People who POST about a topic |
| `reply_mining` | Search viral tweets → explore replies | People who ENGAGE with viral content |

**Reply mining** is powerful for finding "regular developers" who discuss topics in replies but don't post original content. Configure via:

```bash
curl -s -X POST "$TSG_API_URL/saved-searches" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "topicId": "...",
    "searchQuery": "topic min_retweets:5",
    "platform": "twitter",
    "discoveryMode": "reply_mining",
    "replyMiningConfig": {"minReplies": 20, "maxTweetsToExplore": 5, "minFollowers": 500}
  }'
```

See [/explore-replies](discovery/explore-replies.md) for details.

## Recommended: Use /discover-creators

For production discovery, always use the `/discover-creators` command which calls:

```bash
POST /workflows/start-combined
```

This uses Inngest for:
- Parallel search execution
- Automatic retries on failures
- Pipeline progress tracking
- Proper serverless support (Vercel)

## Test Search (Dry Run)

`POST /apify/test-execute` with `dryRun: true` previews results **without persisting data**:

```bash
POST /apify/test-execute
{
  "savedSearchId": "<uuid>",
  "dryRun": true,
  "maxResults": 10
}
```

**⚠️ Important**: Even with `dryRun: false`, `test-execute` does NOT run enrichment or AI review, and does NOT update `last_executed_at` on the saved search. For production discovery with full pipeline (enrichment + review), use `/discover-creators` command.

## Legacy: Execute Single Search (Sync)

For synchronous single-search execution (not recommended for production):

```bash
POST /apify/execute-search
{
  "savedSearchId": "<uuid>",
  "autoEnrich": true,      // Default: true
  "autoAiReview": true     // Default: true
}
```

This runs enrichment and review but is synchronous and doesn't have Inngest retry/parallelization.

**Platforms:**
- YouTube, TikTok, Instagram, Twitter → Apify actors
- Newsletter/Substack → Tavily web search + LLM filtering

### Test before committing
```bash
/test-search <saved-search-id>
```
Preview results (max 10) without creating creator records.

### Create a new search
```bash
/create-saved-search --topic-id <id> --platform youtube --query "AI coding tutorials"
```

### View existing searches
```bash
/list-saved-searches --topic-id <id>
```

## Typical Workflow

1. **List existing searches** to see what's already configured
2. **Test new search terms** to evaluate quality before saving
3. **Create saved searches** for high-quality terms
4. **Execute searches** to discover creators

For a full automated workflow, use the `/discover-creators` command instead.

For cross-project database search (free and instant), use `/search-database` command or the `/internal-discovery` and `/search-by-content` skills.
