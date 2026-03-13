# /create-topic

Create a new topic within a project.

## Usage

```
/create-topic --project-id <id> --name "Topic Name"
```

## What it does

Calls `POST /topics` to create a new topic. Topics organize creator discovery within a project - each topic has its own saved searches.

## Parameters

- `--project-id` (required): UUID of the parent project
- `--name` (required): Topic name

## Options

- `--description <desc>`: Topic description

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

## API

```typescript
POST /topics
{
  "projectId": "uuid",
  "topic": "Topic Name",
  "description": "Topic description"
}

Response:
{
  "topic": {
    "id": "uuid",
    "project_id": "uuid",
    "topic": "Topic Name",
    "description": "...",
    "status": "active",
    "created_at": "..."
  }
}
```

## Review Criteria

> **Note**: Topic-level `review_criteria` is deprecated. Review criteria should be set at the **project level** only.

To set review criteria for a project:
```bash
/update-project <project-id> --review-criteria '{
  "must_have": ["Posts video content", "3k+ avg views"],
  "nice_to_have": ["Developer/engineer background"],
  "exclude_if": ["Company/brand account"]
}'
```

## Related

- Get topic: `/get-topic`
- Update topic: `/update-topic`
- Create saved search: `/create-saved-search`
- List projects: `/list-projects`
