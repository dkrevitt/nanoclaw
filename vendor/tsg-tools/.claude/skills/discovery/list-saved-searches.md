# /list-saved-searches

List saved searches for a topic.

## Usage

```
/list-saved-searches --topic-id <id>
```

## What it does

Calls `GET /saved-searches?topic_id=<id>` to list all saved search queries for a topic, grouped by platform.

## Parameters

- `--topic-id` (required): UUID of the topic

## Example

```bash
/list-saved-searches --topic-id topic-123

# Output:
# Saved searches for topic "AI model benchmarks":
#
# YouTube (3):
#   - "AI coding agent comparison" (last run: 2 days ago, 15 results)
#   - "Claude vs GPT coding" (last run: never)
#   - "Cursor AI review" (last run: 5 days ago, 8 results)
#
# TikTok (2):
#   - #claudeai (last run: 1 day ago, 23 results)
#   - #aicodingtools (last run: never)
```

## API

```typescript
GET /saved-searches?topic_id=<uuid>

Response:
{
  "saved_searches": [
    {
      "id": "uuid",
      "search_query": "...",
      "platform": "youtube",
      "last_executed_at": "2024-01-10T...",
      "last_execution_result_count": 15
    }
  ]
}
```
