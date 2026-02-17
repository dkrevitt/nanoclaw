# /draft-emails Command

Creates personalized email drafts for approved creators using AI-generated or template-based emails via the backend API.

**Two approaches:**
- **Individual drafts** (this command): Generate and create drafts one at a time via `/outreach` endpoints
- **Bulk campaigns**: Use email campaigns via Chrome extension for batch operations

## Prerequisites

### 1. Gmail Account Connected

A Gmail account must be connected to the project via the Chrome extension:

1. Open the Chrome extension
2. Go to Project Settings
3. Click "Connect Gmail Account"
4. Complete OAuth authorization in popup

The backend stores OAuth tokens securely - no local `.env` configuration needed.

### 2. Pitch Angles Configured

Pitch angles must be set on the project (via extension Edit Project). See "Pitch Angles Structure" below.

### 3. Approved Creators with Emails

Creators must be:
- Approved for the specified topic (`action='approved'` in `creator_reviews`)
- Have an email address set (`creators.email` is not null)

## Usage

```bash
/draft-emails --project-id <uuid> --topic-id <uuid> [options]
```

**Required Arguments:**
- `--project-id <uuid>` - Project ID containing pitch angles
- `--topic-id <uuid>` - Topic to draft emails for (approved creators from this topic)

**Optional Arguments:**
- `--angle <angle-id>` - Use specific pitch angle ID (default: auto-select best fit)
- `--limit <number>` - Maximum creators to draft for (default: all)
- `--dry-run` - Preview emails without creating drafts
- `--mode dynamic|static` - Generation mode (dynamic=AI personalization, static=template only)

## Workflow Steps

### Step 1: Fetch Project & Validate Prerequisites

```typescript
// Fetch project
const { data: project } = await apiRequest('GET', `/projects/${projectId}`);

// Validate Gmail account is connected
if (!project.gmail_account_id) {
  console.error('No Gmail account connected to project.');
  console.log('Connect one via Chrome extension → Project Settings → Connect Gmail Account');
  return;
}

// Validate pitch angles exist
const angles = project.pitch_angles?.angles || [];
if (angles.length === 0) {
  console.error('No pitch angles configured for this project.');
  console.log('Add pitch angles via the extension (Edit Project).');
  return;
}

console.log(`Found ${angles.length} pitch angle(s):`);
angles.forEach(a => console.log(`  - ${a.name} (${a.id})`));
```

### Step 2: Fetch Approved Creators with Emails

```typescript
// Fetch approved creators for this topic
const { data: creatorsResponse } = await apiRequest('GET',
  `/creators?topic_id=${topicId}&pipeline_status=approved&limit=${limit}`
);
const { creators } = creatorsResponse;

// Filter to only those with emails
const creatorsWithEmail = creators.filter(c => c.email && c.email.trim());

// Check which already have drafts for this topic
const { data: pending } = await apiRequest('GET',
  `/outreach/pending?project_id=${projectId}&topic_id=${topicId}`
);
const draftedIds = new Set(pending.drafted_creator_ids);

const creatorsToProcess = creatorsWithEmail.filter(c => !draftedIds.has(c.id));

console.log(`Found ${creatorsWithEmail.length} approved creators with emails`);
console.log(`Already drafted: ${draftedIds.size}`);
console.log(`To process: ${creatorsToProcess.length}`);
```

### Step 3: Generate and Create Drafts

For each creator, use the backend to generate and create drafts:

```typescript
for (const creator of creatorsToProcess) {
  // Step 3a: Generate email with Claude AI
  const { data: generated } = await apiRequest('POST', '/outreach/generate', {
    creatorId: creator.id,
    projectId,
    topicId,
    pitchAngleId: preferredAngleId || undefined,
  });

  console.log(`Generated email for ${creator.display_name}`);
  console.log(`  Subject: ${generated.subject}`);
  console.log(`  Angle: ${generated.pitchAngleUsed}`);

  if (dryRun) {
    console.log(`  Body preview: ${generated.body.substring(0, 100)}...`);
    continue;
  }

  // Step 3b: Create Gmail draft
  const { data: draft } = await apiRequest('POST', '/outreach/create-draft', {
    creatorId: creator.id,
    projectId,
    topicId,
    pitchAngleId: preferredAngleId || 'auto',
    pitchAngleName: generated.pitchAngleUsed,
    recipientEmail: creator.email,
    subject: generated.subject,
    body: generated.body,
  });

  console.log(`  ✓ Created draft (ID: ${draft.draftId})`);
}
```

### Step 4: Summary

```
=== Email Draft Summary ===
Total creators: 25
Already drafted: 5
Processed: 20
Drafts created: 18
Errors: 2

View drafts: https://mail.google.com/mail/u/0/#drafts
```

## Pitch Angles Structure

Pitch angles are stored in `projects.pitch_angles` as JSONB:

```json
{
  "angles": [
    {
      "id": "product-review",
      "name": "Product Review Request",
      "subject_template": "{{creator_name}} - would love your take on {{product}}",
      "body_template": "Hi {{creator_name}},\n\nI've been following your {{content_type}} content...",
      "best_for": ["reviewers", "comparison content", "tutorial creators"],
      "generation_mode": "dynamic"
    },
    {
      "id": "collaboration",
      "name": "Collaboration Pitch",
      "subject_template": "Collab idea for {{creator_name}}",
      "body_template": "Hi {{creator_name}},\n\nLoved your recent {{content_type}}...",
      "best_for": ["high engagement", "brand-friendly"],
      "generation_mode": "static"
    }
  ]
}
```

### Generation Modes

- **`dynamic`**: Uses Claude AI to personalize the email based on creator's content, saved posts, and bio
- **`static`**: Simple template variable replacement (mail merge style)

### Available Template Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{{creator_name}}` | `creator.display_name` or `primary_handle` | "John Smith" |
| `{{creator_handle}}` | `creator.primary_handle` | "johnsmith" |
| `{{platform}}` | `creator.primary_platform` | "youtube" |
| `{{content_type}}` | Derived from platform | "video" / "posts" |
| `{{topic}}` | `topic.topic` | "AI coding tools" |
| `{{product}}` | `project.name` | "Kilo Code" |
| `{{saved_post_title}}` | First saved post title | "Claude vs GPT-4 Comparison" |
| `{{saved_post_topic}}` | First saved post relevance note | "AI comparison content" |

## Dry Run Mode

Preview emails without creating drafts:

```bash
/draft-emails --project-id <uuid> --topic-id <uuid> --dry-run
```

Output:
```
--- John Smith (john@example.com) ---
Angle: Product Review Request
Subject: John Smith - would love your take on Kilo Code
Body preview: Hi John Smith, I've been following your video content...

--- Jane Doe (jane@example.com) ---
...

=== Dry Run Summary ===
Would create 23 draft(s)
```

## Alternative: Email Campaigns (Bulk with Multi-Angle Selection)

For large-scale email drafting with AI-powered pitch angle selection, use email campaigns via the Chrome extension:

1. Open Chrome extension → Email tab
2. Click "Create Campaign"
3. Add creators from a topic or by selection
4. **Select multiple pitch angles** to make available for the campaign
5. **AI selects best angle** for each creator based on their content
6. Review and optionally override angle selections
7. Generate personalized drafts using per-creator angles
8. Create Gmail drafts in batch

**New 4-Step Campaign Workflow:**
```
Step 1: Select Creators      - Add creators to the campaign
Step 2: Select Angles        - Choose multiple pitch angles for the campaign
Step 3: Review Angles        - AI selects best angle per creator, review/override
Step 4: Review & Send        - Generate drafts and create Gmail drafts
```

Campaigns provide:
- **Multi-angle pitch selection** - AI matches creators to best pitch angle
- **Per-creator reasoning** - See why each angle was selected
- Batch AI generation with progress tracking
- Draft editing before Gmail creation
- Status tracking per creator
- Error handling and retry

**Campaign API Endpoints:**
```
POST /campaigns/:id/select-angles          # Trigger AI angle selection
GET  /campaigns/:id/angle-selection-status # Poll selection progress
PATCH /campaigns/:id/creators/:id/angle    # Override angle choice
POST /campaigns/:id/generate               # Generate drafts
POST /campaigns/:id/create-drafts          # Create Gmail drafts
```

## API Endpoints Used

```
POST /outreach/generate         # Generate email with Claude AI
POST /outreach/create-draft     # Create Gmail draft + record outreach
GET  /outreach/pending          # Check which creators already have drafts
```

## Error Handling

**No Gmail account connected:**
- Exit with instructions to connect via Chrome extension

**No pitch angles configured:**
- Exit with instructions to add angles via extension

**No approved creators with emails:**
- Exit with suggestion to approve creators or add email addresses

**Individual email generation/creation fails:**
- Log error, continue with remaining creators
- Report failed count in summary

## Integration with Other Commands

Typical workflow:

1. `/discover-creators` - Find creators
2. `/review-creators` - Approve/skip based on criteria
3. Set pitch angles on project (via extension)
4. `/draft-emails` - Create outreach drafts
5. Review and send from Gmail
