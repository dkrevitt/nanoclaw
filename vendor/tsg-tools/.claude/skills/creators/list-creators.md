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

```typescript
GET /creators?topic_id=<id>&pipeline_status=approved&limit=10

Response:
{
  "creators": [...],
  "total": 47
}
```
