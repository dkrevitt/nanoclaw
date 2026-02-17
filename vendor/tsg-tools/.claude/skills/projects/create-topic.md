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
- `--review-criteria <json>`: Topic-specific review criteria (JSON)

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
#   1. Set review criteria: /update-topic topic-abc456 --review-criteria '{...}'
#   2. Add saved searches: /create-saved-search --topic-id topic-abc456 ...
#   3. Run discovery: /discover-creators --topic-id topic-abc456
```

## With review criteria

```bash
/create-topic --project-id proj-123 --name "AI coding tutorials" --review-criteria '{
  "must_have": [
    "Creates coding tutorials or walkthroughs",
    "Covers AI/ML tools or coding assistants",
    "Posts at least monthly"
  ],
  "nice_to_have": [
    "Has reviewed similar products",
    "High engagement on technical content"
  ],
  "exclude_if": [
    "Only covers beginner content",
    "Focuses on non-coding AI topics"
  ]
}'

# Output:
# Topic created: AI coding tutorials
# Review criteria set with 3 must_have, 2 nice_to_have, 2 exclude_if
```

## API

```typescript
POST /topics
{
  "projectId": "uuid",
  "topic": "Topic Name",
  "description": "Topic description",
  "reviewCriteria": {
    "must_have": [...],
    "nice_to_have": [...],
    "exclude_if": [...]
  }
}

Response:
{
  "topic": {
    "id": "uuid",
    "project_id": "uuid",
    "topic": "Topic Name",
    "description": "...",
    "review_criteria": {...},
    "status": "active",
    "created_at": "..."
  }
}
```

## Review Criteria

Topic criteria are combined with project-wide criteria during review:
- **Global baseline** (hardcoded): 1k+ followers, posted in 30 days, English, US/Europe
- **Project criteria**: Apply to all topics in project
- **Topic criteria**: Specific to this topic

## Related

- Get topic: `/get-topic`
- Update topic: `/update-topic`
- Create saved search: `/create-saved-search`
- List projects: `/list-projects`
