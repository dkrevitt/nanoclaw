# /create-campaign

Create an email campaign and add creators to it. Campaigns now support multi-angle pitch selection with AI-powered angle matching per creator.

## Usage

```
/create-campaign --project-id <id> --name "Campaign Name"
```

## What it does

Calls `POST /campaigns` to create a new email campaign, then optionally adds creators via `POST /campaigns/:id/creators`. Campaigns enable bulk email drafting with AI-generated or template-based emails.

**New:** Campaigns now support selecting multiple pitch angles, with AI automatically choosing the best angle for each creator based on their content.

## Parameters

- `--project-id` (required): UUID of the project
- `--name` (required): Campaign name

## Options

- `--description <desc>`: Campaign description
- `--pitch-angles <ids>`: Comma-separated pitch angle IDs from project settings (multi-select)
- `--topic-id <id>`: Add approved creators from this topic
- `--creator-ids <ids>`: Comma-separated creator IDs to add
- `--status <status>`: Filter creators by pipeline status (default: approved)

## Examples

### Create campaign with multiple pitch angles

```bash
/create-campaign --project-id proj-123 --name "January Outreach" --topic-id topic-456 --pitch-angles product-review,collaboration,tutorial-feature

# Output:
# Campaign created:
#   ID: camp-abc789
#   Name: January Outreach
#   Pitch Angles: 3 selected
#     - Product Review Request (dynamic)
#     - Collaboration Pitch (static)
#     - Tutorial Feature (dynamic)
#
# Added 23 creators from topic "AI coding tutorials"
#   - 23 with email addresses (ready)
#   - 0 missing email (need Tier 3 enrichment)
#
# Next steps:
#   1. Trigger angle selection: POST /campaigns/camp-abc789/select-angles
#   2. Review AI-selected angles in Chrome extension
#   3. Generate drafts: POST /campaigns/camp-abc789/generate
#   4. Create Gmail drafts: POST /campaigns/camp-abc789/create-drafts
```

### Create empty campaign (add creators later)

```bash
/create-campaign --project-id proj-123 --name "VIP Outreach" --pitch-angles collab,product-review

# Output:
# Campaign created:
#   ID: camp-def012
#   Name: VIP Outreach
#   Pitch Angles: 2 selected
#   Creators: 0
#
# Add creators with:
#   /campaign-add-creators camp-def012 --creator-ids id1,id2,id3
```

### Create campaign with specific creators

```bash
/create-campaign --project-id proj-123 --name "Top Creators" --creator-ids creator-1,creator-2,creator-3 --pitch-angles product-review

# Output:
# Campaign created: Top Creators
# Added 3 creators
```

## Workflow (4-Step Process)

The campaign workflow now has 4 steps with AI-powered angle selection:

```
1. Create Campaign & Add Creators
   └── Select multiple pitch angles
   └── Add creators from topic or by ID

2. Select Angles (NEW)
   └── POST /campaigns/:id/select-angles
   └── AI analyzes each creator's content
   └── Selects best pitch angle per creator
   └── Provides reasoning and relevant post context

3. Review Angles
   └── Use Chrome extension to review AI selections
   └── Override angle choices if needed
   └── PATCH /campaigns/:id/creators/:creatorId/angle

4. Generate Drafts
   └── POST /campaigns/:id/generate
   └── Uses per-creator selected angle
   └── AI generates personalized emails

5. Create Gmail Drafts
   └── POST /campaigns/:id/create-drafts
   └── Opens in Gmail as drafts
```

## API

### Create Campaign

```typescript
POST /campaigns
{
  "projectId": "uuid",
  "name": "Campaign Name",
  "description": "Optional description",
  "pitchAngleIds": ["angle-1", "angle-2", "angle-3"]  // Array of angle IDs
}

Response:
{
  "campaign": {
    "id": "uuid",
    "project_id": "uuid",
    "name": "...",
    "pitch_angle_ids": ["angle-1", "angle-2", "angle-3"],
    "status": "draft",
    "total_creators": 0,
    "drafts_generated": 0,
    "drafts_created": 0
  }
}
```

### Add Creators

```typescript
POST /campaigns/:id/creators
{
  "creatorIds": ["uuid1", "uuid2", ...]
}

Response:
{
  "added": 23,
  "alreadyDraftedIds": ["uuid5"]  // Already have outreach records
}
```

### Select Angles (AI-Powered)

```typescript
POST /campaigns/:id/select-angles

Response:
{
  "success": true,
  "message": "Angle selection started for 23 creators"
}

// Poll status with:
GET /campaigns/:id/angle-selection-status

Response:
{
  "status": "selecting_angles",  // or "angles_ready"
  "progress": {
    "total": 23,
    "selected": 15,
    "pending": 5,
    "selecting": 3
  }
}
```

### Override Creator Angle

```typescript
PATCH /campaigns/:id/creators/:creatorId/angle
{
  "pitchAngleId": "new-angle-id"
}

Response:
{
  "success": true,
  "creator": {
    "selected_pitch_angle_id": "new-angle-id",
    "selected_pitch_angle_name": "Product Review Request"
  }
}
```

## Campaign Statuses

| Status | Description |
|--------|-------------|
| `draft` | Initial state, adding creators |
| `selecting_angles` | AI selecting best angles per creator |
| `angles_ready` | Angles selected, ready to generate |
| `generating` | AI generating email content |
| `ready` | Drafts generated, ready for Gmail |
| `creating_drafts` | Creating Gmail drafts |
| `completed` | All drafts created in Gmail |

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

## Multi-Angle Selection

The AI selects the best pitch angle for each creator based on:

1. **Creator's recent posts** - Content type, topics, style
2. **Creator's bio and niche** - Areas of expertise
3. **Pitch angle "best for" tags** - Who each angle works for
4. **Generation mode** - Static angles are more universally applicable

**Output per creator:**
- `selected_pitch_angle_id` - Chosen angle ID
- `selected_pitch_angle_name` - Angle name
- `pitch_selection_reasoning` - Why this angle was chosen
- `relevant_post_context` - Posts that informed the decision

## Prerequisites

1. **Gmail account connected** to project
2. **Pitch angles configured** in project settings (multiple recommended)
3. **Creators have emails** (from Tier 3 enrichment)

## Related

- List campaigns: `/list-campaigns`
- Campaign status: `/campaign-status`
- Angle selection: Uses `POST /campaigns/:id/select-angles`
- Generate emails: Uses `POST /campaigns/:id/generate`
- Create drafts: Uses `POST /campaigns/:id/create-drafts`
