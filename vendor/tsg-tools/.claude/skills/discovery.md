# Discovery Skills

Execute and manage saved searches for creator discovery.

## Available Skills

| Skill | Description |
|-------|-------------|
| [/execute-search](discovery/execute-search.md) | Execute a saved search to discover creators |
| [/test-search](discovery/test-search.md) | Test a search without saving results |
| [/create-saved-search](discovery/create-saved-search.md) | Create a new saved search |
| [/list-saved-searches](discovery/list-saved-searches.md) | List saved searches for a topic |
| [/internal-discovery](discovery/internal-discovery.md) | Search existing database with saved search |
| [/search-by-content](discovery/search-by-content.md) | Ad-hoc keyword search across database |

## Quick Reference

### Execute a search
```bash
/execute-search <saved-search-id>
```
Runs discovery with automatic Tier 2 enrichment.

**Platforms:**
- YouTube, TikTok, Instagram, Twitter → Apify actors
- Newsletter/Substack (Substack, Beehiiv, Ghost, ConvertKit, Buttondown) → Tavily web search + LLM filtering

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

For a full automated workflow, use the `/run-pipeline` command instead.

For cross-project database search (free and instant), use `/search-database` command or the `/internal-discovery` and `/search-by-content` skills.
