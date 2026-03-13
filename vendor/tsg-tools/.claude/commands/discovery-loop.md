# /discovery-loop Command

Orchestrates an iterative discovery loop that learns from results to improve creator sourcing over time.

## Usage

```bash
/discovery-loop --project-id <uuid>
/discovery-loop --project-id <uuid> --topic-id <uuid>
/discovery-loop --project-id <uuid> --target 50
/discovery-loop --project-id <uuid> --max-iterations 3
/discovery-loop --project-id <uuid> --dry-run
```

**Required Arguments:**
- `--project-id <uuid>` - Project ID

**Optional Arguments:**
- `--topic-id <uuid>` - Specific topic (default: all topics in project)
- `--target <n>` - Target number of new approvals to reach
- `--max-iterations <n>` - Maximum loop iterations (default: 3)
- `--dry-run` - Preview actions without executing
- `--skip-cross-platform` - Skip finding creators on other platforms
- `--skip-ideation` - Run existing searches only, no new ideas
- `--auto-apply` - Apply changes without asking for confirmation

## What It Does

The discovery loop is an **agentic workflow** that improves itself over time:

```
┌─────────────────────────────────────────────────────────────────┐
│  1. ANALYZE                                                      │
│  ├── Load project, topics, review criteria                       │
│  ├── Compute approval rates per saved search                     │
│  ├── Identify high performers (>50%) and underperformers (<20%) │
│  └── Compare approved vs skipped creator metrics                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. LEARN                                                        │
│  ├── Mine hashtags from approved creators' posts                 │
│  ├── Identify common patterns in approved content                │
│  ├── Note metric thresholds (follower, engagement)               │
│  └── Read past learnings from workspace/learning-log.md         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. IDEATE                                                       │
│  ├── Generate new search terms from approved content             │
│  ├── Create variations of high-performing searches               │
│  ├── Flag underperforming searches for removal                   │
│  └── Suggest criteria adjustments (with guardrails)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. EXPAND (Cross-Platform)                                      │
│  ├── For each approved creator, check other platform handles     │
│  ├── Search for creators on platforms they weren't found on      │
│  └── Link discovered profiles to creator records                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. EXECUTE                                                      │
│  ├── Create new saved searches                                   │
│  ├── Run discovery on high-performing + new searches             │
│  ├── Auto-chain to AI review                                     │
│  └── Trigger cross-platform searches                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. REPORT                                                       │
│  ├── Summarize results (discovered, approved, skipped)           │
│  ├── Highlight new search performance                            │
│  ├── Record learnings to workspace/learning-log.md              │
│  └── Schedule or suggest next run                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    (repeat if target not reached)
```

## Difference from /run-pipeline

| Feature | /run-pipeline | /discovery-loop |
|---------|---------------|-----------------|
| Execution | Single pass | Iterative |
| Learning | No | Analyzes results, improves searches |
| Ideation | No | Proposes new search terms |
| Cross-platform | No | Finds creators on other platforms |
| History | No | Maintains learning log |

Use `/run-pipeline` for simple one-shot discovery. Use `/discovery-loop` for ongoing, improving discovery.

## Example Output

```
=== Discovery Loop: Kilo Code ===
Topic: AI model coding benchmarks
Loop iteration: #1

=== Current State ===
Portfolio: 12 saved searches across 4 platforms
Last 30 days: 47 discovered, 18 approved (38% rate)

=== Search Performance ===
┌─────────────────────────────┬──────────┬───────┬───────┐
│ Search Term                 │ Platform │ Rate  │ Flag  │
├─────────────────────────────┼──────────┼───────┼───────┤
│ "Claude Code review"        │ YouTube  │ 67%   │ ⭐    │
│ "AI coding benchmark"       │ YouTube  │ 40%   │       │
│ #cursorai                   │ TikTok   │ 45%   │       │
│ #devtok                     │ TikTok   │ 12%   │ ⚠️    │
│ #aitools                    │ Instagram│ 8%    │ ⚠️    │
└─────────────────────────────┴──────────┴───────┴───────┘

=== Learning Insights ===
Metric patterns:
├── Approved median followers: 35k vs skipped: 8k
├── Approved median engagement: 6.2% vs skipped: 2.1%
└── YouTube most efficient (55% approval rate)

From approved content:
├── Common hashtags: #claudeai (7), #aiagent (5)
└── Common topics: "comparison", "tutorial", "review"

=== Proposed Actions ===
New searches:
├── "#claudeai" (TikTok) - from approved content
├── "AI agent tutorial" (YouTube) - from title patterns

Disable:
├── #devtok (TikTok) - 12% approval
├── #aitools (Instagram) - 8% approval

Cross-platform:
├── 4 approved creators to search on other platforms

Proceed? [y/n]
> y

=== Executing ===
Creating new saved searches... done
Running discovery... 31 new creators
Running AI review... 14 approved (45%)
Cross-platform search... 3 found

=== Results ===
Discovered: 31 creators
├── Auto-approved: 14 (45%, up from 38%)
├── Flagged for review: 8
└── Skipped: 9

New search results:
├── "#claudeai": 58% approval ⭐
└── "AI agent tutorial": 42%

Cross-platform: 3/4 creators found

Learnings recorded to: workspace/learning-log.md

Next suggested run: Monday 9am
```

## Cost Estimates

| Component | Cost | Notes |
|-----------|------|-------|
| Discovery (Apify) | ~$0.50/search | Per saved search executed |
| AI Review | ~$0.01/creator | Claude API |
| Cross-platform | ~$0.10-0.20/creator | Social Media Finder |

Typical loop: 5-8 searches + 30-50 creators ≈ $5-10

## Guardrails

The loop has built-in safety limits:

- **Won't adjust criteria** with <20 reviews (insufficient data)
- **Won't change thresholds** by >3x in one update
- **Asks confirmation** before disabling searches (unless `--auto-apply`)
- **Documents reasoning** in learning log before making changes
- **Stops on diminishing returns** (last iteration <10% approval)

## Scheduling

Run the loop automatically:

```
/schedule --cron "0 9 * * 1" --prompt "/discovery-loop --project-id <uuid>"
```

This schedules weekly Monday 9am runs.

## Learning Log

Each loop appends to `workspace/learning-log.md`:

```markdown
### 2026-02-18 - Kilo Code (Discovery Loop #3)

**Reviews:** 31 new (14 approved, 9 skipped, 8 flagged) - 45%

**Search performance:**
- "#claudeai" (TikTok): 58% ⭐
- "AI agent tutorial" (YouTube): 42%
- Disabled: #devtok (12%), #aitools (8%)

**Cross-platform:** 3/4 found

**Actions:**
- [x] Created 2 new searches
- [x] Disabled 2 underperformers
- [ ] Consider raising minFollowers to 10k

**Insights:**
- "#claudeai" > "#claudecode" (community preference)
- YouTube highest precision (55% vs 38% avg)
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/projects/:id` | Load review criteria |
| GET | `/topics?project_id=X` | List topics |
| GET | `/creators?project_id=X&limit=500` | Get creators for analysis |
| GET | `/saved-searches?topic_id=X` | List current searches |
| POST | `/saved-searches` | Create new search |
| PATCH | `/saved-searches/:id` | Disable search |
| POST | `/workflows/start-combined` | Execute discovery+review |
| POST | `/creators/search-cross-platform` | Find on other platforms |

## Related Commands

- `/run-pipeline` - Single-pass discovery+review
- `/identify-search-terms` - Manual search term research
- `/learn` - Standalone analysis without execution
- `/check-projects` - View current status
