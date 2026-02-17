# /run-pipeline Command

Orchestrates a full creator discovery pipeline: Discovery → Review. This is the primary command for automated creator sourcing.

## Usage

```bash
/run-pipeline --project-id <uuid> --topic-id <uuid>
/run-pipeline --project-id <uuid> --topic-id <uuid> --saved-search-ids <id1,id2>
/run-pipeline --project-id <uuid> --topic-id <uuid> --skip-discovery
/run-pipeline --project-id <uuid> --topic-id <uuid> --dry-run
```

**Required Arguments:**
- `--project-id <uuid>` - Project ID
- `--topic-id <uuid>` - Topic ID

**Optional Arguments:**
- `--saved-search-ids <id1,id2,...>` - Comma-separated list of specific saved searches to run
- `--skip-discovery` - Skip discovery, only run review on existing creators
- `--no-auto-review` - Do not auto-chain to review after discovery
- `--dry-run` - Show what would happen without executing

## Workflow Steps

### Step 1: Validate Inputs

```bash
# Verify project and topic exist
npx tsx src/utils/api.ts project $PROJECT_ID
npx tsx src/utils/api.ts topic $TOPIC_ID

# List available saved searches
npx tsx src/utils/api.ts saved-searches --topic-id $TOPIC_ID
```

Display summary:
```
=== Pipeline Setup ===
Project: Kilo Code
Topic: AI model coding benchmarks (12 saved searches)

Saved searches to run:
├── YouTube: "AI coding agent comparison" (last run: 3 days ago)
├── YouTube: "claude vs gpt benchmark" (last run: never)
├── TikTok: "cursor ai tutorial" (last run: 5 days ago)
└── ... (9 more)

Review criteria: ✅ Set
```

### Step 2: Start Pipeline

```bash
# Via API utility (when available)
npx tsx src/utils/api.ts start-pipeline \
  --project-id $PROJECT_ID \
  --topic-id $TOPIC_ID \
  --saved-search-ids $SEARCH_IDS

# Or via curl
curl -X POST "$TSG_API_URL/workflows/start-combined" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"topicId\": \"$TOPIC_ID\",
    \"savedSearchIds\": [$SEARCH_IDS],
    \"config\": {
      \"autoReview\": true
    }
  }"
```

**Response:**
```json
{
  "pipelineId": "pipeline-uuid",
  "executionId": "discovery-execution-uuid",
  "status": "running"
}
```

### Step 3: Monitor Progress

Poll the pipeline status endpoint:

```bash
curl "$TSG_API_URL/pipelines/$PIPELINE_ID/status" \
  -H "X-API-Key: $TSG_API_KEY"
```

Display progress:
```
=== Pipeline Progress ===
Status: in_progress
Current Step: discovery

Steps:
├── ✅ search_terms: completed (15/15)
├── 🔄 discovery: running (5/10) - Searching TikTok...
├── ⏳ review: pending
└── ⏳ campaign: pending

Discovered so far: 47 creators
```

### Step 4: Completion

When pipeline completes:

```
=== Pipeline Complete ===
Status: completed

Results:
├── Discovery: 47 creators found
├── Review: 12 approved (24%), 35 skipped
└── Ready for outreach: 12 creators

Next steps:
1. View approved creators: /check-projects --project-id <uuid>
2. Create email campaign: /run-campaign --project-id <uuid> --topic-id <uuid>
3. View in Chrome extension: Projects → Kilo Code → AI model coding benchmarks
```

## Review-Only Mode

Run `--skip-discovery` to review existing creators without running new discovery:

```bash
/run-pipeline --project-id <uuid> --topic-id <uuid> --saved-search-ids <ids> --skip-discovery
```

This will:
1. Snapshot creators currently associated with the specified saved searches
2. Skip the discovery step
3. Run AI review on the snapshotted creators
4. Update `creator_project_statuses` with review results

**Use cases:**
- Re-review creators after updating review criteria
- Review creators discovered manually or via internal search
- Run review on a subset of creators from specific searches

## Dry Run Mode

Preview what would happen without executing:

```bash
/run-pipeline --project-id <uuid> --topic-id <uuid> --dry-run
```

Output:
```
=== Dry Run Preview ===
Would execute pipeline with:
├── 12 saved searches (5 YouTube, 4 TikTok, 3 Instagram)
├── Estimated creators to discover: ~150-300
├── Auto-review: enabled
└── Review criteria: ✅ Set

No changes made (dry run mode).
```

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/workflows/start-combined` | Start discovery+review pipeline |
| GET | `/pipelines/:id/status` | Poll pipeline progress |
| GET | `/pipelines/:id` | Get full pipeline details |
| GET | `/workflows/:id/records` | Get created records |
| POST | `/pipelines/:id/cancel` | Cancel running pipeline |

## Pipeline States

| State | Meaning |
|-------|---------|
| `in_progress` | Pipeline is running |
| `completed` | All steps finished successfully |
| `failed` | A step failed (check error details) |
| `cancelled` | User cancelled the pipeline |

## Step States

| State | Meaning |
|-------|---------|
| `pending` | Not yet started |
| `running` | Currently executing |
| `completed` | Finished successfully |
| `failed` | Step failed |
| `cancelled` | Step was cancelled |

## Error Handling

If discovery fails:
```
=== Pipeline Error ===
Status: failed
Failed Step: discovery
Error: [APIFY_RATE_LIMIT] Rate limit exceeded

Options:
1. Wait and retry: /run-pipeline --project-id <uuid> --topic-id <uuid>
2. Cancel: POST /pipelines/<id>/cancel
3. Run remaining searches individually
```

If review fails:
```
=== Pipeline Error ===
Status: failed
Failed Step: review
Error: [ANTHROPIC_ERROR] API timeout

Discovery completed with 47 creators.
Options:
1. Retry review only: /run-pipeline --project-id <uuid> --topic-id <uuid> --skip-discovery
2. Manual review via Chrome extension
```

## Related Commands

- `/check-projects` - View project status and creator counts
- `/discover-creators` - Legacy discovery (without auto-review)
- `/draft-emails` - Create email drafts for approved creators
- `/run-campaign` - Start email campaign for approved creators

## Related Skills

- See `skills/workflows.md` for individual workflow API calls
