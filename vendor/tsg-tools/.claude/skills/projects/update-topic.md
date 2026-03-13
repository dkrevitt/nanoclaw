# /update-topic

Update a topic's name, description, or status.

## Usage

```
/update-topic <topic-id> [options]
```

## What it does

Calls `PATCH /topics/:id` to update topic settings. Requires member role or higher on the parent project.

## Parameters

- `topic-id` (required): UUID of the topic to update

## Options

- `--name <name>`: Update topic name
- `--description <desc>`: Update description
- `--status <status>`: Set status (active/paused/completed)

## Examples

### Update name and description

```bash
/update-topic topic-123 --name "AI Developer Tools Reviews" --description "Creators who review AI coding assistants like Cursor, Copilot, Claude"
```

### Pause a topic

```bash
/update-topic topic-123 --status paused

# Output:
# Topic updated: AI coding tutorials
# Status: paused
```

## API

```typescript
PATCH /topics/:id
{
  "topic": "Updated Name",
  "description": "Updated description",
  "status": "active"
}

Response:
{
  "topic": {
    "id": "uuid",
    "project_id": "uuid",
    "topic": "...",
    "description": "...",
    "status": "active",
    "updated_at": "..."
  }
}
```

## Review Criteria

> **Note**: Topic-level `review_criteria` is deprecated. AI pre-review uses **project-level criteria only**.

To update review criteria, use `/update-project` instead:

```bash
/update-project <project-id> --review-criteria '{
  "must_have": ["Creates AI/coding content", "Posts video content"],
  "nice_to_have": ["50k+ subscribers", "High engagement"],
  "exclude_if": ["Company/brand account", "Inactive 30+ days"]
}'
```

## Topic Statuses

| Status | Description |
|--------|-------------|
| `active` | Normal operation, discovery and review enabled |
| `paused` | Temporarily stopped, preserves data |
| `completed` | Finished, no more discovery needed |

## Related

- Get topic: `/get-topic`
- Create topic: `/create-topic`
- Update project criteria: `/update-project`
