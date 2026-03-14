# /create-project

Create a new project.

## Usage

```
/create-project --name "Project Name" --description "Description"
```

## What it does

Calls `POST /projects` to create a new project. The creating user automatically becomes the project owner.

## Parameters

- `--name` (required): Project name
- `--description` (optional): Project description

## Options

- `--review-criteria <json>`: Project-wide review criteria (JSON)
- `--pitch-angles <json>`: Email pitch angles configuration (JSON)

## Example

```bash
/create-project --name "Acme Product Launch" --description "Creator outreach for Acme launch"

# Output:
# Project created:
#   ID: proj-abc123
#   Name: Acme Product Launch
#   Owner: you@example.com
#
# Next steps:
#   1. Create topics: /create-topic --project-id proj-abc123 --name "AI reviewers"
#   2. Set review criteria: /update-project proj-abc123 --review-criteria '{...}'
#   3. Connect Gmail: Use Chrome extension → Project Settings
```

## With review criteria

```bash
/create-project --name "Acme Launch" --review-criteria '{
  "must_have": ["Posts video content", "10k+ followers"],
  "nice_to_have": ["Verified account"],
  "exclude_if": ["Primarily promotional"]
}'
```

## API

```typescript
POST /projects
{
  "name": "Project Name",
  "description": "Description",
  "reviewCriteria": {
    "must_have": [...],
    "nice_to_have": [...],
    "exclude_if": [...]
  },
  "pitchAngles": {
    "angles": [...]
  }
}

Response:
{
  "project": {
    "id": "uuid",
    "name": "Project Name",
    "description": "...",
    "review_criteria": {...},
    "pitch_angles": {...},
    "created_by": "user-uuid",
    "created_at": "..."
  }
}
```

## Related

- List projects: `/list-projects`
- Update project: `/update-project`
- Create topic: `/create-topic`
