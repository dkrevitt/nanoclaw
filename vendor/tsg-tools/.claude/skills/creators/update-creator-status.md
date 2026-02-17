# /update-creator-status

Update the contact status for a creator within a specific project.

## Usage

```
/update-creator-status --creator-id <id> --project-id <id> --status contacted
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--creator-id` | Yes | UUID of the creator |
| `--project-id` | Yes | UUID of the project |
| `--status` | Yes | New contact status |

## Valid Statuses

| Status | Description |
|--------|-------------|
| `needs_final_review` | Agent-approved, awaiting human QA |
| `skipped` | Failed review criteria |
| `no_fit` | Human confirmed not a fit |
| `not_contacted` | Human-approved, ready for outreach |
| `drafted` | Email draft created |
| `contacted` | Initial outreach sent |
| `in_progress` | Active conversation |
| `closed_won` | Deal closed successfully |
| `closed_lost` | Deal fell through |
| `save_for_later` | Paused for future consideration |

## API Call

```bash
curl -s -X PUT "$TSG_API_URL/creators/<creator-id>/project-status/<project-id>" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "contactStatus": "contacted"
  }' | jq '.'
```

## Response

```json
{
  "status": {
    "creator_id": "uuid",
    "project_id": "uuid",
    "contact_status": "contacted",
    "updated_at": "2024-01-15T12:00:00Z",
    "updated_by": "user-uuid"
  }
}
```

## Example

```
/update-creator-status --creator-id abc123 --project-id def456 --status contacted

Updated creator status:
  Creator: Tech Reviewer (@techreviewer)
  Project: Q1 Creator Campaign
  Status: drafted → contacted
```

## Batch Update

For updating multiple creators at once:

```bash
curl -s -X POST "$TSG_API_URL/creators/batch-update-status" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "projectId": "<project-id>",
    "creatorIds": ["id1", "id2", "id3"],
    "contactStatus": "contacted"
  }' | jq '.'
```

Response:
```json
{
  "updated": 3,
  "errors": [],
  "message": "Updated 3 creator(s) to 'contacted'"
}
```

## Get Current Status

```bash
curl -s "$TSG_API_URL/creators/<creator-id>/project-status/<project-id>" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

## Get All Project Statuses for a Creator

```bash
curl -s "$TSG_API_URL/creators/<creator-id>/project-statuses" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

## Related

- List creators: `/list-creators`
- Get creator: `/get-creator`
- Link to project: `/link-creator-to-project`
