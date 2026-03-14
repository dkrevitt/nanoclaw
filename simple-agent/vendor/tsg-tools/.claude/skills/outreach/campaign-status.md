# /campaign-status

Check the status of an email campaign's angle selection, generation, or draft creation.

## Usage

```
/campaign-status <campaign-id>
```

## What it does

Calls the following endpoints to show current progress:
- `GET /campaigns/:id` - Campaign details and overall status
- `GET /campaigns/:id/angle-selection-status` - Angle selection progress
- `GET /campaigns/:id/generation-status` - Email generation progress
- `GET /campaigns/:id/draft-status` - Gmail draft creation progress

## Parameters

- `campaignId` (required): UUID of the campaign

## Examples

### Angle Selection in Progress

```bash
/campaign-status abc123-def456

# Output:
# Campaign: "AI Reviewers Outreach"
# Status: selecting_angles
# Pitch Angles: 3 selected
#   - Product Review Request (dynamic)
#   - Collaboration Pitch (static)
#   - Tutorial Feature (dynamic)
#
# Angle Selection Progress:
#   Total: 25
#   Selected: 18
#   Pending: 5
#   Selecting: 2
#
# Most common angles:
#   - Product Review Request: 10 creators
#   - Tutorial Feature: 6 creators
#   - Collaboration Pitch: 2 creators
```

### Generation in Progress

```bash
/campaign-status abc123-def456

# Output:
# Campaign: "AI Reviewers Outreach"
# Status: generating
# Pitch Angles: 3 available
#
# Generation Progress:
#   Total: 25
#   Pending: 5
#   Generating: 2
#   Generated: 18
#   Errors: 0
```

### Draft Creation in Progress

```bash
/campaign-status abc123-def456

# Output:
# Campaign: "Tutorial Creators"
# Status: creating_drafts
#
# Draft Creation Progress:
#   Total: 15
#   Created: 12
#   Creating: 1
#   Pending: 2
#   Failed: 0
```

### Angles Ready (Waiting for Review)

```bash
/campaign-status abc123-def456

# Output:
# Campaign: "January Outreach"
# Status: angles_ready
# Pitch Angles: 3 available
#
# Angle Distribution:
#   - Product Review Request: 12 creators (48%)
#   - Tutorial Feature: 8 creators (32%)
#   - Collaboration Pitch: 5 creators (20%)
#
# Next steps:
#   1. Review angles in Chrome extension
#   2. Override any angle selections if needed
#   3. Run: POST /campaigns/:id/generate
```

## API

### Campaign Status

```typescript
GET /campaigns/:id

Response:
{
  "campaign": {
    "id": "uuid",
    "name": "Campaign Name",
    "status": "selecting_angles",
    "pitch_angle_ids": ["angle-1", "angle-2", "angle-3"],
    "total_creators": 25,
    "drafts_generated": 0,
    "drafts_created": 0
  }
}
```

### Angle Selection Status

```typescript
GET /campaigns/:id/angle-selection-status

Response:
{
  "status": "selecting_angles",  // or "angles_ready"
  "progress": {
    "total": 25,
    "selected": 18,
    "pending": 5,
    "selecting": 2
  }
}
```

### Generation Status

```typescript
GET /campaigns/:id/generation-status

Response:
{
  "status": "generating",
  "progress": {
    "total": 25,
    "pending": 5,
    "generating": 2,
    "generated": 18,
    "edited": 0,
    "error": 0
  }
}
```

### Draft Status

```typescript
GET /campaigns/:id/draft-status

Response:
{
  "status": "creating_drafts",
  "progress": {
    "total": 15,
    "created": 12,
    "creating": 1,
    "pending": 2,
    "failed": 0
  },
  "errors": []
}
```

## Campaign Statuses

| Status | Description | Next Step |
|--------|-------------|-----------|
| `draft` | Initial state, adding creators | Add creators, select angles |
| `selecting_angles` | AI selecting best angles per creator | Wait for completion |
| `angles_ready` | Angles selected, review before generating | Review in extension, then generate |
| `generating` | AI generating email content | Wait for completion |
| `ready` | Drafts generated, ready for Gmail | Create Gmail drafts |
| `creating_drafts` | Creating Gmail drafts | Wait for completion |
| `completed` | All drafts created in Gmail | Send from Gmail |

## Creator Statuses

| Status | Description |
|--------|-------------|
| `pending` | Added to campaign, no action yet |
| `missing_email` | No email address |
| `selecting_angle` | AI selecting angle |
| `angle_selected` | Angle chosen, ready for generation |
| `generating` | Generating email draft |
| `generated` | Draft generated |
| `edited` | Draft manually edited |
| `creating_draft` | Creating Gmail draft |
| `draft_created` | Gmail draft created |
| `error` | Error occurred |

## Related

- Create campaign: `/create-campaign`
- List campaigns: `/list-campaigns`
