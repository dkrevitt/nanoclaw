# Outreach Skills

Generate emails, create Gmail drafts, and manage email campaigns with AI-powered pitch angle selection.

## Available Skills

| Skill | Description |
|-------|-------------|
| [/generate-email](outreach/generate-email.md) | Generate email with Claude AI |
| [/create-draft](outreach/create-draft.md) | Create Gmail draft and record outreach |
| [/create-campaign](outreach/create-campaign.md) | Create email campaign with multi-angle selection |
| [/list-campaigns](outreach/list-campaigns.md) | List email campaigns |
| [/campaign-status](outreach/campaign-status.md) | Check campaign angle selection/generation/draft progress |

## Quick Reference

### Individual Emails

```bash
# Generate an email
/generate-email --creator-id <id> --project-id <id>

# Create Gmail draft
/create-draft --creator-id <id> --project-id <id> --email "creator@example.com" --subject "Subject" --body "Body..."
```

### Email Campaigns (Multi-Angle)

```bash
# Create campaign with multiple pitch angles
/create-campaign --project-id proj-123 --name "January Outreach" --topic-id topic-456 --pitch-angles product-review,collab,tutorial

# Create empty campaign
/create-campaign --project-id proj-123 --name "VIP Outreach" --pitch-angles collab,product-review

# Check campaign status (includes angle selection progress)
/list-campaigns --project-id <id>
/campaign-status <campaign-id>
```

## Individual vs Bulk Outreach

### Individual (single emails)
- Use `/generate-email` + `/create-draft`
- Best for: high-priority creators, custom outreach, testing

### Bulk (campaigns with multi-angle selection)
- Use `/create-campaign` to set up
- AI selects best pitch angle per creator
- Batch AI generation and Gmail draft creation
- Best for: 10+ creators, personalized at scale

## Campaign Workflow (4 Steps)

Campaigns now support **multi-angle pitch selection** where AI chooses the best angle for each creator:

```
1. Create Campaign & Add Creators
   └── Select multiple pitch angles to make available
   └── Add creators from topic or by ID
   └── POST /campaigns + POST /campaigns/:id/creators

2. Select Angles (AI-Powered) ← NEW
   └── POST /campaigns/:id/select-angles
   └── AI analyzes each creator's content and bio
   └── Selects best pitch angle per creator
   └── Provides reasoning and relevant post context

3. Review Angles
   └── Use Chrome extension to review AI selections
   └── Override individual selections if needed
   └── PATCH /campaigns/:id/creators/:creatorId/angle

4. Generate Drafts
   └── POST /campaigns/:id/generate
   └── Uses per-creator selected angle
   └── AI generates personalized emails

5. Create Gmail Drafts
   └── POST /campaigns/:id/create-drafts
   └── Opens in Gmail as drafts
   └── Send manually from Gmail
```

## Campaign Statuses

| Status | Description |
|--------|-------------|
| `draft` | Initial state, adding creators |
| `selecting_angles` | AI selecting best angles per creator |
| `angles_ready` | Angles selected, ready to review/generate |
| `generating` | AI generating email content |
| `ready` | Drafts generated, ready for Gmail |
| `creating_drafts` | Creating Gmail drafts |
| `completed` | All drafts created in Gmail |

## Creator Statuses

| Status | Description |
|--------|-------------|
| `pending` | Added to campaign |
| `missing_email` | No email address |
| `selecting_angle` | AI selecting angle |
| `angle_selected` | Angle chosen, ready for generation |
| `generating` | Generating draft |
| `generated` | Draft ready |
| `edited` | Manually edited |
| `draft_created` | Gmail draft created |

## Multi-Angle Selection

The AI selects the best pitch angle for each creator based on:

1. **Creator's recent posts** - Content type, topics, style
2. **Creator's bio and niche** - Areas of expertise
3. **Pitch angle "best for" tags** - Who each angle works for
4. **Generation mode** - Static angles are more universally applicable

**Per-creator output:**
- `selected_pitch_angle_id` - Chosen angle ID
- `selected_pitch_angle_name` - Angle name
- `pitch_selection_reasoning` - Why this angle was chosen
- `relevant_post_context` - Posts that informed the decision

## Generation Modes

| Mode | Description | Best For |
|------|-------------|----------|
| `dynamic` | AI personalizes each email | High-value outreach |
| `static` | Template variable replacement | High volume campaigns |

Note: Generation mode is set per pitch angle in project settings.

## Prerequisites

1. **Gmail account connected** to project (via Chrome extension)
2. **Pitch angles configured** in project settings (via `/update-project`)
3. **Creators have email addresses** (from Tier 3 enrichment)

## Typical Workflows

### Quick individual outreach
1. `/generate-email --creator-id X --project-id Y`
2. Review generated content
3. `/create-draft --creator-id X ...`
4. Open Gmail and send

### Bulk campaign (recommended)
1. `/create-campaign --project-id X --name "Name" --topic-id Y --pitch-angles angle1,angle2,angle3`
2. AI selects best angle per creator
3. Review angle selections in Chrome extension
4. Generate drafts
5. Create Gmail drafts
6. Send from Gmail

For the full automated workflow, use the `/draft-emails` command instead.

## API Endpoints

### Campaign Management
```
POST /campaigns                              # Create campaign
GET  /campaigns?project_id=<id>              # List campaigns
GET  /campaigns/:id                          # Get campaign details
PATCH /campaigns/:id                         # Update campaign
DELETE /campaigns/:id                        # Delete campaign
```

### Campaign Creators
```
GET  /campaigns/:id/creators                 # List creators in campaign
POST /campaigns/:id/creators                 # Add creators
DELETE /campaigns/:id/creators/:creatorId    # Remove creator
PATCH /campaigns/:id/creators/:creatorId/angle  # Override angle selection
```

### Campaign Actions
```
POST /campaigns/:id/select-angles            # Trigger AI angle selection
GET  /campaigns/:id/angle-selection-status   # Poll angle selection progress
POST /campaigns/:id/generate                 # Generate email drafts
GET  /campaigns/:id/generation-status        # Poll generation progress
POST /campaigns/:id/create-drafts            # Create Gmail drafts
GET  /campaigns/:id/draft-status             # Poll draft creation progress
```

### Individual Outreach
```
POST /outreach/generate                      # Generate single email with AI
POST /outreach/create-draft                  # Create single Gmail draft
GET  /outreach/pending?project_id=<id>       # Check who already has drafts
```
