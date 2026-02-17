# /update-project

Update a project's settings, review criteria, or pitch angles.

## Usage

```
/update-project <project-id> [options]
```

## What it does

Calls `PATCH /projects/:id` to update project settings. Requires member role or higher.

## Parameters

- `project-id` (required): UUID of the project to update

## Options

- `--name <name>`: Update project name
- `--description <desc>`: Update description
- `--review-criteria <json>`: Set project-wide review criteria
- `--pitch-angles <json>`: Set email pitch angles
- `--gmail-account-id <id>`: Link Gmail account for sending
- `--sheets-id <id>`: Google Sheets spreadsheet ID
- `--sheets-tab <name>`: Tab name for creator sync

## Examples

### Update review criteria

```bash
/update-project proj-123 --review-criteria '{
  "must_have": [
    "Posts video content primarily",
    "At least 10,000 followers",
    "Posts weekly or more"
  ],
  "nice_to_have": [
    "Verified account",
    "Engagement rate > 5%"
  ],
  "exclude_if": [
    "Primarily promotional content",
    "Based in restricted regions"
  ]
}'

# Output:
# Project updated: Acme Launch
# Review criteria set with 3 must_have, 2 nice_to_have, 2 exclude_if
```

### Update pitch angles

```bash
/update-project proj-123 --pitch-angles '{
  "angles": [
    {
      "id": "product-review",
      "name": "Product Review Request",
      "subject_template": "Quick question about {{product}}",
      "body_template": "Hi {{creator_name}},\n\nLoved your video on...",
      "best_for": ["youtube", "tiktok"],
      "generation_mode": "dynamic"
    },
    {
      "id": "collab",
      "name": "Collaboration Pitch",
      "subject_template": "Collaboration opportunity",
      "body_template": "Hi {{creator_name}},\n\nWe have been following...",
      "best_for": ["instagram", "twitter"],
      "generation_mode": "static"
    }
  ]
}'
```

### Update Sheets configuration

```bash
/update-project proj-123 --sheets-id "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" --sheets-tab "Approved Creators"
```

## API

```typescript
PATCH /projects/:id
{
  "name": "Updated Name",
  "description": "Updated description",
  "review_criteria": {
    "must_have": [...],
    "nice_to_have": [...],
    "exclude_if": [...]
  },
  "pitch_angles": {
    "angles": [...]
  },
  "gmail_account_id": "uuid",
  "sheets_spreadsheet_id": "google-sheets-id",
  "sheets_tab_name": "Tab Name"
}

Response:
{
  "project": {
    "id": "uuid",
    "name": "...",
    // ... all project fields
  }
}
```

## Review Criteria Format

Project-wide criteria apply to ALL topics. Topics can have additional criteria.

```json
{
  "must_have": [
    "Plain-English requirement that must be met"
  ],
  "nice_to_have": [
    "Optional criteria that improves fit"
  ],
  "exclude_if": [
    "Disqualifying factors"
  ]
}
```

## Pitch Angles Format

```json
{
  "angles": [
    {
      "id": "unique-id",
      "name": "Display Name",
      "subject_template": "Email subject with {{variables}}",
      "body_template": "Email body with {{creator_name}}, {{product}}, etc.",
      "best_for": ["platform1", "platform2"],
      "generation_mode": "dynamic"  // or "static" for mail merge
    }
  ]
}
```

**Generation modes:**
- `dynamic`: AI personalizes email based on creator profile
- `static`: Simple variable replacement (mail merge)

## Related

- List projects: `/list-projects`
- Create project: `/create-project`
- Update topic criteria: `/update-topic`
