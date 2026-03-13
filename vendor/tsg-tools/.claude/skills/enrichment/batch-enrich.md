# /batch-enrich

Batch enrich multiple creators.

## Usage

```
/batch-enrich <creator-ids> [--tier <tier>] [--include-email] [--async]
```

## What it does

Calls `POST /creators/batch-enrich` to enrich multiple creators at once.

## Parameters

- `creatorIds` (required): Comma-separated UUIDs of creators to enrich

OR filter by project/topic:
- `--project-id`: Enrich creators in a project
- `--topic-id`: Enrich creators in a topic

## Options

- `--tier 2|3`: Enrichment level (default: 2)
- `--include-email`: Also run email enrichment waterfall
- `--async`: Use Inngest for background processing (recommended for large batches)
- `--force`: Skip staleness check

## Example

```bash
/batch-enrich "id1,id2,id3" --tier 2

# Output:
# Batch enriching 3 creators (Tier 2)...
# Results:
#   - @ai_tutorials: success
#   - @code_master: success
#   - @tech_reviewer: failed (rate limited)
#
# Summary: 2 succeeded, 1 failed
```

## API

**Request body:**
```json
{
  "creatorIds": ["uuid1", "uuid2", "uuid3"],  // OR use projectId/topicId filters
  "projectId": "optional-project-uuid",
  "topicId": "optional-topic-uuid",
  "tier": 2,              // 2 or 3 (default: 2)
  "includeEmail": false,  // Run email enrichment (default: false)
  "force": false,         // Skip staleness check (default: false)
  "async": false,         // Use Inngest for background (default: false)
  "limit": 100            // Max creators to process (default: 100, max: 500)
}
```

```bash
# Tier 2 by IDs
curl -s -X POST "$TSG_API_URL/creators/batch-enrich" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"creatorIds": ["uuid1", "uuid2", "uuid3"]}'

# Tier 3 by project (async via Inngest)
curl -s -X POST "$TSG_API_URL/creators/batch-enrich" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "project-uuid", "tier": 3, "async": true}'

# Tier 2 + email for creators missing email
curl -s -X POST "$TSG_API_URL/creators/batch-enrich" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "project-uuid", "includeEmail": true, "onlyMissingEmail": true}'
```

**Response (sync):**
```json
{
  "total": 3,
  "succeeded": 2,
  "failed": 1,
  "skipped": 0,
  "tier": 2,
  "results": [...]
}
```

**Response (async):**
```json
{
  "executionId": "batch-enrich-123456-abc",
  "creatorCount": 50,
  "message": "Batch enrichment started in background."
}
```
