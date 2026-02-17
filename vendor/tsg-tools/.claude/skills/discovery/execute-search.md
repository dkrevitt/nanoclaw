# /execute-search

Execute a saved search to discover new creators.

## Usage

```
/execute-search <saved-search-id>
```

## What it does

Calls `POST /apify/execute-search` to run a saved search query. Automatically triggers Tier 2 enrichment for discovered creators.

**Platform-specific behavior:**
- **YouTube, TikTok, Instagram, Twitter**: Uses Apify search actors
- **Newsletter/Substack** (Substack, Beehiiv, Ghost, ConvertKit, Buttondown, custom domains): Uses Tavily web search with LLM filtering to identify actual newsletter homepages

## Parameters

- `savedSearchId` (required): UUID of the saved search to execute

## Options

- `--no-enrich`: Skip automatic Tier 2 enrichment

## Example

```bash
/execute-search abc123-def456

# Output:
# Executing search: "AI coding tutorials" (YouTube)
# Discovered: 15 new creators
# Enrichment: 15 requested, 14 succeeded, 1 failed
```

## API

```typescript
POST /apify/execute-search
{
  "savedSearchId": "uuid",
  "autoEnrich": true  // default
}
```
