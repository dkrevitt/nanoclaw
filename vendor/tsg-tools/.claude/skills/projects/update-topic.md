# /update-topic

Update a topic's name, description, status, or review criteria.

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
- `--review-criteria <json>`: Update review criteria (JSON object)

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

### Update review criteria

```bash
/update-topic topic-123 --review-criteria '{
  "must_have": ["Creates AI/coding content", "Posts video content"],
  "nice_to_have": ["50k+ subscribers", "High engagement"],
  "exclude_if": ["Company/brand account", "Inactive 30+ days"]
}'

# Output:
# Topic updated: AI Developer Tools Reviews
# Review criteria updated with 2 must_have, 2 nice_to_have, 2 exclude_if
```

## API

```typescript
PATCH /topics/:id
{
  "topic": "Updated Name",
  "description": "Updated description",
  "status": "active",
  "reviewCriteria": {
    "must_have": ["..."],
    "nice_to_have": ["..."],
    "exclude_if": ["..."]
  }
}

Response:
{
  "topic": {
    "id": "uuid",
    "project_id": "uuid",
    "topic": "...",
    "description": "...",
    "status": "active",
    "review_criteria": { ... },
    "updated_at": "..."
  }
}
```

## Review Criteria Format

Review criteria is a JSON object with three arrays:

| Field | Description |
|-------|-------------|
| `must_have` | Required criteria - creator must meet ALL of these |
| `nice_to_have` | Bonus criteria - not required but preferred |
| `exclude_if` | Disqualifying criteria - reject if ANY match |

```json
{
  "must_have": ["Posts video content", "Posts at least weekly"],
  "nice_to_have": ["Verified account", "Engagement rate > 5%"],
  "exclude_if": ["Primarily promotional content", "Inactive 30+ days"]
}
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
- Update project: `/update-project`
