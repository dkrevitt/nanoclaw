# /link-marketer-to-project

Link an existing marketer to a project for tracking.

## Usage

```
/link-marketer-to-project --marketer-id <id> --project-id <id>
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--marketer-id` | Yes | UUID of the marketer |
| `--project-id` | Yes | UUID of the project |

## What it does

1. Creates an entry in `project_marketers` junction table
2. Tracks discovery context (how the marketer was added)
3. Enables filtering marketers by project

## API Call

```bash
curl -s -X POST "$TSG_API_URL/projects/<project-id>/marketers" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "marketer_id": "<marketer-id>"
  }' | jq '.'
```

## Response

```json
{
  "link": {
    "id": "uuid",
    "marketer_id": "uuid",
    "project_id": "uuid",
    "added_at": "2024-01-15T10:00:00Z"
  }
}
```

## Example

```
/link-marketer-to-project --marketer-id abc123 --project-id def456

Linked marketer to project:
  Marketer: Jane Smith (VP of Marketing @ Acme Corp)
  Project: Q1 Sponsor Outreach

Next steps:
  1. View in project: /list-marketers --project-id def456
  2. Start outreach: /draft-emails --project-id def456
```

## Use Cases

- **Cross-project discovery**: Marketer from Project A is relevant to Project B
- **Ad-hoc research**: Found a marketing director, created them, now linking to project
- **Team collaboration**: Share discovered contacts across projects

## Related

- Create marketer: `/create-marketer`
- List project marketers: `/list-marketers --project-id <id>`
- Get marketer: `/get-marketer`
