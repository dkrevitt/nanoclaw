# /get-creator

Get full details for a specific creator.

## Usage

```
/get-creator <creator-id>
```

## What it does

Calls `GET /creators/:id` to fetch complete creator data including enrichment metadata, recent posts, and cross-platform handles.

## Parameters

- `creatorId` (required): UUID of the creator

## Example

```bash
/get-creator abc123-def456

# Output:
# Creator: John Smith (@johnsmith)
# Platform: YouTube
# Followers: 47,234
# Engagement: 8.2%
# Pipeline: approved
# Enrichment: Tier 3
#
# Email: john@example.com
# Cross-platform: Twitter @johnsmith_dev
#
# Recent posts (3):
#   - "Claude vs GPT-4 for Coding" (45K views)
#   - "Building AI Agents" (32K views)
#   ...
```

## API

```typescript
GET /creators/:id

Response:
{
  "id": "uuid",
  "display_name": "John Smith",
  "primary_handle": "johnsmith",
  "primary_platform": "youtube",
  "follower_count": 47234,
  "engagement_rate": 0.082,
  "pipeline_status": "approved",
  "enrichment_tier": 3,
  "email": "john@example.com",
  "recent_posts": [...],
  "enrichment_metadata": {...}
}
```
