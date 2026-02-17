# /update-topic

Update a topic's name, description, or review criteria.

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
- `--review-criteria <json>`: Set topic-specific review criteria
- `--status <status>`: Set status (active/paused/completed)

## Examples

### Update review criteria

```bash
/update-topic topic-123 --review-criteria '{
  "must_have": [
    "Creates AI/coding content",
    "Has reviewed developer tools",
    "Posts video content weekly"
  ],
  "nice_to_have": [
    "Has 50k+ subscribers",
    "High engagement (>5% rate)",
    "Active on multiple platforms"
  ],
  "exclude_if": [
    "Only does sponsored content",
    "Primarily entertainment/gaming focus",
    "Hasnt posted in 30+ days"
  ]
}'

# Output:
# Topic updated: AI coding tutorials
# Review criteria: 3 must_have, 3 nice_to_have, 3 exclude_if
```

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
  "reviewCriteria": {
    "must_have": [...],
    "nice_to_have": [...],
    "exclude_if": [...]
  },
  "status": "active"
}

Response:
{
  "topic": {
    "id": "uuid",
    "project_id": "uuid",
    "topic": "...",
    "description": "...",
    "review_criteria": {...},
    "status": "active",
    "updated_at": "..."
  }
}
```

## Review Criteria Guidelines

Write criteria in plain English - Claude interprets them during review:

**Good criteria:**
- "Creates tutorial or educational content"
- "Has reviewed similar products in the past"
- "Engagement rate above 3%"
- "Posts at least weekly"

**Bad criteria:**
- "Good creator" (too vague)
- "follower_count > 10000" (use plain English instead)

**Hierarchy:**
1. Global baseline (hardcoded) - applies to all
2. Project criteria - applies to all topics in project
3. Topic criteria - specific to this topic

All three levels are combined during `/review-creators`.

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
- Review creators: `/review-creators` command
