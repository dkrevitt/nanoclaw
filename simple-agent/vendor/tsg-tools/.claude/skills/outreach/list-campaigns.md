# /list-campaigns

List email campaigns for a project.

## Usage

```
/list-campaigns --project-id <id>
```

## What it does

Calls `GET /campaigns?project_id=<id>` to list all email campaigns for a project with their status and progress.

## Parameters

- `--project-id` (required): UUID of the project

## Options

- `--status <status>`: Filter by status (draft, generating, ready, creating_drafts, completed)
- `--limit <n>`: Max results (default: 50)

## Example

```bash
/list-campaigns --project-id proj-123

# Output:
# Email campaigns for "Kilo Code":
#
#   1. AI Reviewers Outreach (completed)
#      Pitch angle: Product Review Request
#      Creators: 25 | Drafts: 25 | Created: Jan 10
#
#   2. Tutorial Creators (ready)
#      Pitch angle: Collaboration Pitch
#      Creators: 15 | Drafts: 15 | Created: Jan 11
#
#   3. New Batch (draft)
#      Pitch angle: Product Review Request
#      Creators: 8 | Drafts: 0 | Created: Jan 11
```

## API

```typescript
GET /campaigns?project_id=<uuid>&status=<status>&limit=<n>

Response:
{
  "campaigns": [
    {
      "id": "uuid",
      "name": "AI Reviewers Outreach",
      "status": "completed",
      "pitch_angle_name": "Product Review Request",
      "total_creators": 25,
      "drafts_generated": 25,
      "drafts_created": 25,
      "created_at": "2024-01-10T..."
    }
  ]
}
```
