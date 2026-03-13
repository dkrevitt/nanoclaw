# /discovery-loop

Agentic discovery loop that iteratively discovers, learns, and improves creator sourcing.

## Overview

Unlike `/run-pipeline` (single execution), the discovery loop:
1. **Analyzes** current search performance and approval rates
2. **Learns** patterns from approved vs skipped creators
3. **Ideates** new searches based on successful patterns
4. **Expands** cross-platform (approved on YouTube → find their TikTok)
5. **Executes** discovery with the improved search portfolio
6. **Reports** results and updates learning log
7. **Repeats** until target reached or diminishing returns

## Usage

```bash
/discovery-loop --project-id <uuid>                    # All topics in project
/discovery-loop --project-id <uuid> --topic-id <uuid>  # Specific topic
/discovery-loop --project-id <uuid> --target 50        # Target 50 new approvals
/discovery-loop --project-id <uuid> --max-iterations 3 # Max 3 loops
/discovery-loop --project-id <uuid> --dry-run          # Preview without executing
```

## Workflow Steps

### Step 1: Load Context

```bash
# Get project and topic(s)
npx tsx src/utils/api.ts project $PROJECT_ID
npx tsx src/utils/api.ts topics $PROJECT_ID

# Get review criteria
# (stored in project.review_criteria)

# Read learning log for past insights
# Located at: groups/{group}/workspace/learning-log.md
```

Display context:
```
=== Discovery Loop: Kilo Code ===
Topic: AI model coding benchmarks

Review criteria loaded
Learning log: 3 prior entries (last: 2026-02-10)

Current portfolio: 12 saved searches across 4 platforms
├── YouTube: 3 searches
├── TikTok: 4 searches
├── Instagram: 3 searches
└── Twitter: 2 searches
```

### Step 2: Analyze Current State

Fetch all creators and compute performance metrics:

```bash
# Get all creators with statuses
npx tsx src/utils/api.ts creators --project-id $PROJECT_ID --limit 500
```

Group by saved_search_id and compute:

```
=== Search Performance (Last 30 days) ===

Overall: 47 discovered, 18 approved (38% rate)

By search term:
┌─────────────────────────────────┬──────────┬──────────┬──────────┬─────────┐
│ Search Term                     │ Platform │ Approved │ Skipped  │ Rate    │
├─────────────────────────────────┼──────────┼──────────┼──────────┼─────────┤
│ "Claude Code review"            │ YouTube  │ 6/9      │ 3        │ 67% ⭐  │
│ "AI coding benchmark"           │ YouTube  │ 4/10     │ 6        │ 40%     │
│ #cursorai                       │ TikTok   │ 5/11     │ 6        │ 45%     │
│ #claudecode                     │ TikTok   │ 2/8      │ 6        │ 25%     │
│ #devtok                         │ TikTok   │ 1/9      │ 8        │ 12% ⚠️  │
│ #aitools                        │ Instagram│ 0/5      │ 5        │ 8% ⚠️   │
└─────────────────────────────────┴──────────┴──────────┴──────────┴─────────┘

Legend: ⭐ High performer (>50%) | ⚠️ Underperformer (<20%)
```

### Step 3: Learn from Approved vs Skipped

Compare characteristics of approved vs skipped creators:

```
=== Metric Patterns ===

Follower Distribution:
├── Approved median: 35k
├── Skipped median: 8k
└── Current threshold: 1k (could raise to 15k)

Engagement Distribution:
├── Approved median: 6.2%
├── Skipped median: 2.1%
└── Suggest min engagement: 4%

Platform Distribution:
├── YouTube: 55% approved (most efficient)
├── TikTok: 33% approved
├── Instagram: 15% approved (least efficient)
└── Twitter: 40% approved

Content Patterns (from approved creators):
├── Common hashtags: #claudeai (7), #aiagent (5), #codingtools (4)
├── Common topics: "comparison", "tutorial", "review"
└── Avg post frequency: 3x/week
```

### Step 4: Ideate New Searches

Based on learnings, propose new search terms:

```
=== Search Ideation ===

From approved creator content:
├── "#claudeai" (TikTok) - used by 6/18 approved, not in portfolio
├── "AI agent tutorial" (YouTube) - appears in 5 approved titles
└── "#aiagent" (Instagram) - used by 4/18 approved

Variations of high performers:
├── "Claude vs GPT coding" (YouTube) - variation of top performer
└── "#cursorcode" (TikTok) - variation of #cursorai

Flagged for removal/review:
├── #devtok (TikTok) - 12% approval, project avg 38%
└── #aitools (Instagram) - 8% approval, consistently off-topic
```

### Step 5: Cross-Platform Expansion

Find approved creators on platforms we haven't searched:

```bash
# For each approved creator missing handles
npx tsx src/utils/api.ts search-cross-platform $CREATOR_ID
```

```
=== Cross-Platform Expansion ===

Approved YouTube creators active elsewhere:
├── @creator1 → TikTok found: @creator1_tok (12k followers)
├── @creator2 → Twitter found: @creator2 (8k followers)
└── @creator3 → No additional platforms found

Approved TikTok creators active elsewhere:
├── @tiktoker1 → YouTube found: TikToker One (45k subs)
└── @tiktoker2 → Instagram found: @tiktoker2 (22k followers)

Cross-platform links added: 4 new profile associations
```

### Step 6: Confirm & Execute

Present proposed actions for confirmation:

```
=== Proposed Actions ===

Discovery:
[x] Run 5 existing high-performing searches (>40% approval)
[x] Skip 2 underperforming searches (<20% approval)

New searches to create:
[x] "#claudeai" (TikTok) - from approved content mining
[x] "AI agent tutorial" (YouTube) - from title analysis
[ ] "Claude vs GPT coding" (YouTube) - variation (optional)

Searches to disable:
[ ] #devtok (TikTok) - 12% approval (requires confirmation)
[ ] #aitools (Instagram) - 8% approval (requires confirmation)

Cross-platform:
[x] Search 4 creators on discovered platforms

Estimated discovery: 30-50 new creators
Estimated Apify cost: ~$3-5

Proceed? [y/n/edit]
```

### Step 7: Execute Discovery + Review

Run the approved actions:

```bash
# Create new saved searches
npx tsx src/utils/api.ts create-saved-search \
  --topic-id $TOPIC_ID --platform tiktok --query "#claudeai"

# Execute pipeline for selected searches
npx tsx src/utils/api.ts start-pipeline \
  --project-id $PROJECT_ID --topic-id $TOPIC_ID \
  --saved-search-ids $HIGH_PERFORMER_IDS

# Cross-platform searches
npx tsx src/utils/api.ts search-cross-platform $CREATOR_ID
```

Monitor progress:
```
=== Execution Progress ===

Discovery:
├── YouTube searches: 2/2 complete (15 new)
├── TikTok searches: 3/4 running...
├── Cross-platform: 4/4 complete (3 found)
└── Total discovered: 31 creators

AI Review:
├── Reviewed: 31/31
├── Auto-approved: 14 (45%)
├── Skipped: 9
└── Flagged for review: 8

Enrichment:
├── Tier 2: 31/31 complete
└── Tier 3 (approved): 14/14 running...
```

### Step 8: Update Learnings

Record insights to learning log:

```bash
# Append to workspace/learning-log.md
```

Entry format:
```markdown
### 2026-02-18 - Kilo Code (Discovery Loop #3)

**Reviews:** 31 new (14 approved, 9 skipped, 8 flagged) - 45% approval rate (up from 38%)

**Search performance:**
- "#claudeai" (TikTok): 58% approval ⭐ strong start
- "AI agent tutorial" (YouTube): 42% approval - promising
- Disabled: #devtok (was 12%), #aitools (was 8%)

**Cross-platform:** Found 3/4 creators on other platforms

**Actions taken:**
- [x] Created 2 new searches from content mining
- [x] Disabled 2 underperforming searches
- [x] Updated 4 creator profiles with cross-platform handles
- [ ] Consider raising minFollowers from 1k to 10k (85% of approvals exceed 10k)

**Insights:**
- "#claudeai" outperforming "#claudecode" - community prefers this hashtag
- YouTube continues to have highest precision (55% vs project avg 38%)
- Cross-platform search is high-value: 75% hit rate
```

### Step 9: Report & Schedule Next

```
=== Discovery Loop Complete ===

Topic: AI model coding benchmarks
Loop iteration: #3

Results:
├── Discovered: 31 creators
├── Auto-approved: 14 (45% rate, up from 38%)
├── Flagged for review: 8
├── Skipped: 9
└── Cross-platform hits: 3

New search performance:
├── "#claudeai" (TikTok): 58% ⭐ strong start
└── "AI agent tutorial" (YouTube): 42%

Portfolio changes:
├── Added: 2 searches
├── Disabled: 2 searches
└── Net portfolio: 12 searches

Learnings recorded to: workspace/learning-log.md

Next actions:
├── 8 creators flagged for human review
├── Consider raising minFollowers threshold
└── Next loop: Monday 9am (scheduled)
```

## Options

| Option | Description |
|--------|-------------|
| `--project-id <uuid>` | Required. Project to run loop for |
| `--topic-id <uuid>` | Optional. Specific topic (default: all topics) |
| `--target <n>` | Target number of new approvals (loop until reached) |
| `--max-iterations <n>` | Maximum loop iterations (default: 3) |
| `--dry-run` | Preview actions without executing |
| `--skip-cross-platform` | Skip cross-platform expansion |
| `--skip-ideation` | Run existing searches only, no new ideation |
| `--auto-apply` | Apply changes without confirmation |

## Loop Termination

The loop stops when:
1. Target approvals reached (`--target`)
2. Max iterations reached (`--max-iterations`)
3. Diminishing returns detected (last iteration <10% approval rate)
4. All searches exhausted (no new searches to ideate)
5. User cancels

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/:id` | Get project with review criteria |
| GET | `/topics?project_id=X` | List topics |
| GET | `/creators?project_id=X` | Get all creators with statuses |
| GET | `/saved-searches?topic_id=X` | List saved searches |
| POST | `/saved-searches` | Create new search |
| PATCH | `/saved-searches/:id` | Disable underperforming search |
| POST | `/workflows/start-combined` | Execute discovery + review |
| POST | `/creators/search-cross-platform` | Find creator on other platforms |

## Learning Log Format

The loop appends entries to `workspace/learning-log.md` in this format:

```markdown
### YYYY-MM-DD - Project Name (Discovery Loop #N)

**Reviews:** X new (Y approved, Z skipped, W flagged) - X% approval rate

**Search performance:**
- "query" (platform): X% approval [status]
- ...

**Cross-platform:** Found X/Y creators on other platforms

**Actions taken:**
- [x] Action completed
- [ ] Action pending/suggested

**Insights:**
- Key observation 1
- Key observation 2
```

## Scheduling

To run the discovery loop automatically:

```
/schedule --cron "0 9 * * 1" --prompt "/discovery-loop --project-id <uuid>"
```

This schedules a weekly Monday 9am run.

## Related Commands

- `/run-pipeline` - Single execution (no learning loop)
- `/identify-search-terms` - Manual search term identification
- `/learn` - Standalone learning analysis
- `/check-projects` - View project status

## Example Session

```
User: /discovery-loop --project-id 2df4e0dc-5ab8-4d16-a1cc-0599273e473d

Agent: Loading context for Kilo Code...

=== Discovery Loop: Kilo Code ===
Topic: AI model coding benchmarks

Current state: 47 discovered, 18 approved (38% approval rate)

Analyzing search performance...
[Performance table shown]

High performers (>50%): 2 searches
Average (20-50%): 4 searches
Underperformers (<20%): 2 searches

Learning from approved creators...
[Metric patterns shown]

Ideating new searches...
Found 3 candidates from approved creator content

Cross-platform analysis...
Found 4 approved creators with undiscovered profiles

=== Proposed Actions ===
[Actions listed]

Proceed? [y/n]

User: y

Agent: Executing discovery loop...
[Progress updates]

=== Loop Complete ===
31 new creators, 14 approved (45% rate, up from 38%)

Learnings recorded to workspace/learning-log.md
Next suggested run: Monday 9am
```
