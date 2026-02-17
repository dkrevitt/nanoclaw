# /search-by-content

Search creators by keywords in their post content.

## Usage

```
/search-by-content "<keywords>"
```

## What it does

Calls `POST /creators/search-by-content` to find creators whose recent posts contain the specified keywords.

## Parameters

- `keywords` (required): Comma-separated keywords to search

## Options

- `--topic-id <id>`: Limit to creators in a specific topic
- `--limit <n>`: Max results (default: 50)

## Example

```bash
/search-by-content "claude, cursor, copilot" --topic-id topic-123

# Output:
# Found 12 creators with matching content:
#   1. @ai_tutorials - "Claude vs Cursor comparison..." (3 matches)
#   2. @code_master - "Why I switched from Copilot..." (2 matches)
#   ...
```

## API

```typescript
POST /creators/search-by-content
{
  "keywords": ["claude", "cursor", "copilot"],
  "topicId": "uuid",  // optional
  "limit": 50
}

Response:
{
  "matches": [
    {
      "creator": {...},
      "matchingPosts": [...],
      "matchCount": 3
    }
  ]
}
```
