# /create-topic

Create a new topic within a project.

## Usage

```
/create-topic --project-id <id> --name "Topic Name"
```

## What it does

Calls `POST /topics` to create a new topic. Topics organize creator discovery within a project - each topic has its own saved searches and review criteria.

## Parameters

- `--project-id` (required): UUID of the parent project
- `--name` (required): Topic name

## Options

- `--description <desc>`: Topic description
- `--review-criteria <json>`: Review criteria for AI evaluation (JSON object)

## Example

```bash
/create-topic --project-id proj-123 --name "AI coding tutorials"

# Output:
# Topic created:
#   ID: topic-abc456
#   Name: AI coding tutorials
#   Project: Acme Launch
#
# Next steps:
#   1. Add saved searches: /create-saved-search --topic-id topic-abc456 ...
#   2. Run discovery: /discover-creators --topic-id topic-abc456
```

## With description

```bash
/create-topic --project-id proj-123 --name "AI coding tutorials" --description "Creators who make tutorials about AI coding agents like Cursor, Claude Code, etc."
```

## With review criteria

```bash
/create-topic --project-id proj-123 --name "AI coding tutorials" --review-criteria '{
  "must_have": ["Posts video content", "Posts at least weekly"],
  "nice_to_have": ["Developer/engineer background", "50k+ subscribers"],
  "exclude_if": ["Company/brand account", "Inactive 30+ days"]
}'

# Output:
# Topic created:
#   ID: topic-abc456
#   Name: AI coding tutorials
#   Review criteria: 2 must_have, 2 nice_to_have, 2 exclude_if
```

## API

```typescript
POST /topics
{
  "projectId": "uuid",
  "topic": "Topic Name",
  "description": "Topic description",
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
    "topic": "Topic Name",
    "description": "...",
    "review_criteria": { ... },
    "status": "active",
    "created_at": "..."
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
  "must_have": ["Posts video content", "3k+ avg views"],
  "nice_to_have": ["Developer/engineer background"],
  "exclude_if": ["Company/brand account"]
}
```

You can also update review criteria later via `/update-topic`.

## Related

- Get topic: `/get-topic`
- Update topic: `/update-topic`
- Create saved search: `/create-saved-search`
- List projects: `/list-projects`
