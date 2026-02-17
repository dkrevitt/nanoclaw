# /link-creator-to-project

Link existing creators to a project for tracking.

## Usage

```
/link-creator-to-project --creator-ids <id1,id2> --project-id <id>
/link-creator-to-project --creator-ids <id> --project-id <id> --topic-id <id>
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--creator-ids` | Yes | Comma-separated creator UUIDs |
| `--project-id` | Yes | UUID of the project |
| `--topic-id` | No | Topic ID (updates creator's saved_search_ids) |

## What it does

1. Creates entries in `creator_project_statuses` junction table
2. Sets initial `contact_status` to `NULL` (pending review)
3. If `--topic-id` provided, updates creators' `saved_search_ids` array
4. Skips creators already linked to the project

## API Call

```bash
curl -s -X POST "$TSG_API_URL/creators/link-to-project" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "creatorIds": ["uuid-1", "uuid-2"],
    "projectId": "<project-id>",
    "topicId": "<topic-id>"
  }' | jq '.'
```

## Response

```json
{
  "linked": 2,
  "alreadyLinked": 0,
  "message": "Linked 2 creators to project"
}
```

## Example

```
/link-creator-to-project --creator-ids abc123,def456 --project-id proj789

Linked creators to project:
  New links: 2
  Already linked: 0
  Project: Q1 Creator Campaign

Creators:
  - Tech Reviewer (@techreviewer) → linked
  - Gadget Guy (@gadgetguy) → linked

Next steps:
  1. Run pipeline: /run-pipeline --project-id proj789
  2. Check status: /list-creators --project-id proj789
```

## Use Cases

- **Cross-project discovery**: Creators found in Project A are relevant to Project B
- **Ad-hoc research**: Created a creator manually, now linking to project
- **Bulk import**: Link multiple creators from external research
- **Internal discovery**: `/search-database` finds existing creators, link them to new project

## Related

- Create creator: `/create-creator`
- Update status: `/update-creator-status`
- List project creators: `/list-creators --project-id <id>`
