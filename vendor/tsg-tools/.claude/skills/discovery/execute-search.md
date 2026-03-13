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

```bash
curl -s -X POST "$TSG_API_URL/apify/execute-search" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "savedSearchId": "uuid",
    "autoEnrich": true
  }'
```

**Request body:**
- `savedSearchId` (required): UUID of the saved search to execute
- `autoEnrich` (optional, default: `true`): Run Tier 2 enrichment automatically
