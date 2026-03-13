# /list-creators

List creators with optional filters.

## Usage

```
/list-creators [options]
```

## What it does

Calls `GET /creators` with query parameters to list creators filtered by project, topic, status, or platform.

## Options

- `--project-id <id>`: Filter by project
- `--topic-id <id>`: Filter by topic
- `--status <status>`: Filter by pipeline status (discovered, enriched, approved, skipped)
- `--platform <platform>`: Filter by platform (youtube, tiktok, instagram, twitter)
- `--limit <n>`: Max results (default: 50)
- `--offset <n>`: Pagination offset

## Example

```bash
/list-creators --topic-id topic-123 --status approved --limit 10

# Output:
# Approved creators for "AI model benchmarks" (10 of 47):
#   1. @ai_tutorials (YouTube, 47K followers)
#   2. @code_master (TikTok, 125K followers)
#   ...
```

## API

```bash
curl -s "$TSG_API_URL/creators?topic_id=<id>&pipeline_status=approved&limit=10" \
  -H "X-API-Key: $TSG_API_KEY"
```

**Additional query parameters:**
- `project_id` - Filter by project
- `contact_status` - Filter by contact status (needs_final_review, not_contacted, drafted, etc.)
- `platform` - Filter by platform
- `search` - Text search across name, bio, handle
- `follower_count_min` / `follower_count_max` - Filter by follower count
- `offset` - Pagination offset

**Response:**
```json
{
  "creators": [...],
  "total": 47
}
```
