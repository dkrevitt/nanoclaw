# /run-campaign Command

Orchestrates the full email campaign workflow: find creators, create campaign, select angles, generate drafts, and create Gmail drafts.

## Usage

```bash
/run-campaign --project-id <uuid> --name "Campaign Name" [filters] [options]
```

## Required Arguments

- `--project-id <uuid>` - Project ID
- `--name <string>` - Campaign name

## Creator Filters

- `--platforms <list>` - Comma-separated platforms (youtube,tiktok,instagram,twitter)
- `--max-followers <n>` - Maximum follower count
- `--min-followers <n>` - Minimum follower count
- `--contact-status <list>` - Comma-separated statuses (not_contacted,needs_final_review,drafted,etc)
- `--topic-id <uuid>` - Filter to creators reviewed for specific topic (optional)
- `--has-email` - Only include creators with email addresses (default: true)

## Options

- `--pitch-angles <list>` - Comma-separated angle IDs (default: all project angles)
- `--dry-run` - Preview matching creators without creating campaign
- `--skip-angle-selection` - Skip AI angle selection (use first angle for all)
- `--limit <n>` - Maximum creators to include

## Examples

### TikTok + Instagram creators under 75k followers

```bash
/run-campaign \
  --project-id proj-123 \
  --name "TikTok + Instagram <75k" \
  --platforms tiktok,instagram \
  --max-followers 75000 \
  --contact-status not_contacted,needs_final_review \
  --has-email
```

### All approved creators for a topic

```bash
/run-campaign \
  --project-id proj-123 \
  --name "AI Coding Topic Outreach" \
  --topic-id topic-456 \
  --contact-status not_contacted
```

### Dry run to preview

```bash
/run-campaign \
  --project-id proj-123 \
  --name "Test Campaign" \
  --platforms youtube \
  --max-followers 100000 \
  --dry-run
```

## Workflow Steps

### Step 1: Validate Prerequisites

```typescript
// 1. Fetch project and validate
const project = await api.getProject(projectId);

if (!project.gmail_account_id) {
  error('No Gmail account connected. Use Chrome extension → Project Settings.');
  return;
}

const angles = project.pitch_angles?.angles || [];
if (angles.length === 0) {
  error('No pitch angles configured. Add via Chrome extension → Edit Project.');
  return;
}

// Use specified angles or all
const selectedAngles = pitchAngleIds
  ? angles.filter(a => pitchAngleIds.includes(a.id))
  : angles;

console.log(`Using ${selectedAngles.length} pitch angle(s):`);
selectedAngles.forEach(a => console.log(`  - ${a.name} (${a.id})`));
```

### Step 2: Find Matching Creators

The API supports single-value filters, so we query multiple times and combine:

```typescript
// Query creators for each platform
let allCreators = [];

for (const platform of platforms) {
  for (const status of contactStatuses) {
    const { creators } = await api.getCreators({
      projectId,
      platform,
      contactStatus: status,
      hasEmail: true,
      limit: 500,
    });
    allCreators.push(...creators);
  }
}

// Deduplicate by creator ID
const uniqueCreators = [...new Map(allCreators.map(c => [c.id, c])).values()];

// Apply client-side filters
let filtered = uniqueCreators;

if (maxFollowers) {
  filtered = filtered.filter(c => (c.follower_count || 0) <= maxFollowers);
}

if (minFollowers) {
  filtered = filtered.filter(c => (c.follower_count || 0) >= minFollowers);
}

// Filter by topic if specified (must have been reviewed for that topic)
if (topicId) {
  filtered = filtered.filter(c => c.review_for_topic?.topic_id === topicId);
}

console.log(`Found ${filtered.length} matching creators`);

if (dryRun) {
  console.log('\n=== Dry Run - Matching Creators ===');
  filtered.slice(0, 20).forEach(c => {
    console.log(`  ${c.display_name} (@${c.primary_handle}) - ${c.primary_platform} - ${c.follower_count} followers`);
  });
  if (filtered.length > 20) console.log(`  ... and ${filtered.length - 20} more`);
  return;
}
```

### Step 3: Create Campaign

```typescript
// Create campaign with all selected angles
const { campaign } = await api.post('/campaigns', {
  projectId,
  name: campaignName,
  description: `Auto-created via /run-campaign`,
  pitchAngleIds: selectedAngles.map(a => a.id),
});

console.log(`Created campaign: ${campaign.name} (${campaign.id})`);

// Add creators to campaign
const creatorIds = filtered.map(c => c.id);
const { added, alreadyDraftedIds } = await api.post(`/campaigns/${campaign.id}/creators`, {
  creatorIds,
});

console.log(`Added ${added} creators to campaign`);
if (alreadyDraftedIds.length > 0) {
  console.log(`  (${alreadyDraftedIds.length} already have drafts from previous campaigns)`);
}
```

### Step 4: Select Angles (AI-Powered)

```typescript
if (!skipAngleSelection && selectedAngles.length > 1) {
  console.log('\nStarting AI angle selection...');

  await api.post(`/campaigns/${campaign.id}/select-angles`);

  // Poll for completion
  let status = 'selecting_angles';
  while (status === 'selecting_angles') {
    await sleep(2000);
    const { status: currentStatus, progress } = await api.get(
      `/campaigns/${campaign.id}/angle-selection-status`
    );
    status = currentStatus;
    console.log(`  Progress: ${progress.selected}/${progress.total} angles selected`);
  }

  console.log('Angle selection complete!');

  // Show selection summary
  const { creators } = await api.get(`/campaigns/${campaign.id}/creators`);
  const angleCounts = {};
  creators.forEach(c => {
    const angle = c.selected_pitch_angle_name || 'Pending';
    angleCounts[angle] = (angleCounts[angle] || 0) + 1;
  });

  console.log('\nAngle distribution:');
  Object.entries(angleCounts).forEach(([angle, count]) => {
    console.log(`  ${angle}: ${count} creators`);
  });
}
```

### Step 5: Generate Drafts

```typescript
console.log('\nGenerating email drafts...');

await api.post(`/campaigns/${campaign.id}/generate`);

// Poll for completion
let genStatus = 'generating';
while (genStatus === 'generating') {
  await sleep(3000);
  const { status, progress } = await api.get(
    `/campaigns/${campaign.id}/generation-status`
  );
  genStatus = status;
  console.log(`  Progress: ${progress.generated}/${progress.total} drafts generated`);
}

console.log('Draft generation complete!');
```

### Step 6: Create Gmail Drafts

```typescript
console.log('\nCreating Gmail drafts...');

await api.post(`/campaigns/${campaign.id}/create-drafts`);

// Poll for completion
let draftStatus = 'creating_drafts';
while (draftStatus === 'creating_drafts') {
  await sleep(2000);
  const { status, progress } = await api.get(
    `/campaigns/${campaign.id}/draft-status`
  );
  draftStatus = status;
  console.log(`  Progress: ${progress.created}/${progress.total} Gmail drafts created`);
}

console.log('Gmail draft creation complete!');
```

### Step 7: Summary

```typescript
console.log('\n=== Campaign Complete ===');
console.log(`Campaign: ${campaign.name}`);
console.log(`ID: ${campaign.id}`);
console.log(`Creators: ${added}`);
console.log(`Drafts created: ${progress.created}`);
console.log(`\nView drafts: https://mail.google.com/mail/u/0/#drafts`);
console.log(`\nReview in Chrome extension → Campaigns → ${campaign.name}`);
```

## Campaign Statuses

| Status | Description |
|--------|-------------|
| `draft` | Initial state |
| `selecting_angles` | AI selecting best angles |
| `angles_ready` | Ready to generate |
| `generating` | Generating email content |
| `ready` | Drafts ready |
| `creating_drafts` | Creating Gmail drafts |
| `completed` | All done |

## Error Handling

**No Gmail account:**
```
Error: No Gmail account connected to project.
Action: Open Chrome extension → Project Settings → Connect Gmail Account
```

**No pitch angles:**
```
Error: No pitch angles configured.
Action: Open Chrome extension → Edit Project → Add pitch angles
```

**No matching creators:**
```
Warning: No creators match the specified filters.
Filters applied:
  - Platforms: tiktok, instagram
  - Max followers: 75000
  - Contact status: not_contacted, needs_final_review
  - Has email: true
```

**API errors during campaign:**
- Log error and continue where possible
- Report failures in summary
- Campaign can be resumed via Chrome extension

## Integration with Skills

This command uses the following skills/endpoints internally:

- `/list-creators` - Find matching creators
- `/create-campaign` - Create the campaign
- `POST /campaigns/:id/select-angles` - AI angle selection
- `POST /campaigns/:id/generate` - Generate drafts
- `POST /campaigns/:id/create-drafts` - Create Gmail drafts

## Resuming a Campaign

If the command is interrupted, the campaign can be resumed:

1. **Via Chrome extension:** Open Campaigns → find campaign → continue from current step
2. **Via API:** Call the appropriate endpoint based on campaign status:
   - `selecting_angles` → wait or call `/select-angles` again
   - `angles_ready` → call `/generate`
   - `ready` → call `/create-drafts`
