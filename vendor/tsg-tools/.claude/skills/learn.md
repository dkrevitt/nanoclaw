# /learn

Reflect on recent review outcomes and suggest/apply improvements.

## Usage

```
/learn --project-id <uuid>              # Analyze and suggest
/learn --project-id <uuid> --apply      # Analyze and apply confident changes
```

## Workflow

1. **Fetch all creators** for the project with contact_status
2. **Compute per-search approval rates** by grouping creators by saved_search_ids
3. **Analyze metric distributions** (followers, engagement) for approved vs skipped
4. **Identify patterns** worth acting on
5. **If --apply:** make changes to criteria/searches
6. **Document findings** in workspace/learning-log.md

## Analysis Steps

### 1. Get Review Data

```bash
npx tsx src/utils/api.ts creators --project-id <id> --limit 500
```

Group by `contact_status`:
- `needs_final_review` or `not_contacted` = approved
- `skipped` or `no_fit` = skipped

### 2. Compute Search Performance

For each unique `saved_search_id` in the creators:
- Count approved vs skipped
- Calculate approval rate
- Compare to project average

### 3. Analyze Metric Distributions

Compare approved vs skipped:
- Median/mean follower counts
- Median/mean engagement rates
- Platform distribution
- Post frequency patterns

### 4. Generate Insights

Flag searches that are:
- **Underperforming**: <15% approval rate when project average is 30%+
- **Overperforming**: 2x+ project approval rate (create variations)

Flag criteria adjustments:
- If 90%+ of approvals exceed current threshold, raise it
- If good creators are being missed, lower threshold or add exceptions

### 5. Take Action (if --apply)

```bash
# Update review criteria
/update-project --project-id <id> --review-criteria '{
  "must_have": ["Updated criteria..."],
  "nice_to_have": ["..."],
  "exclude_if": ["..."]
}'

# Create new search based on successful patterns
/create-saved-search --topic-id <id> --platform youtube --query "new search term"
```

### 6. Document

Write findings to `workspace/learning-log.md` with:
- Date and project name
- Reviews analyzed (counts)
- Search performance summary
- Metric patterns observed
- Actions taken
- Reasoning

## Example Output

```
Analyzing project: Kilo Code Creator Program

Reviews: 47 total (12 approved, 35 skipped) - 26% approval rate

Search Performance:
┌─────────────────────────────┬──────────┬──────────┬───────────┐
│ Search Term                 │ Platform │ Approved │ Rate      │
├─────────────────────────────┼──────────┼──────────┼───────────┤
│ AI coding benchmark         │ YouTube  │ 4/9      │ 44% ⬆️    │
│ cursor vs claude code       │ YouTube  │ 3/8      │ 38%       │
│ vibe coding tutorial        │ TikTok   │ 2/12     │ 17% ⬇️    │
│ claude tutorial             │ TikTok   │ 1/12     │ 8% ⬇️     │
└─────────────────────────────┴──────────┴──────────┴───────────┘

Metric Patterns:
- Approved median followers: 28k vs skipped: 3.2k
- Approved median engagement: 4.2% vs skipped: 2.1%
- Current minFollowers threshold: 1,000

Suggested Changes:
1. ⬆️ Raise minFollowers to 8,000 (10th percentile of approvals)
2. ➕ Create variations of "AI coding benchmark" (top performer)
3. ⚠️ Review "claude tutorial" TikTok search (8% approval)

Apply these changes? Use --apply flag to execute.
```

## Options

| Option | Description |
|--------|-------------|
| `--project-id <uuid>` | Required. Project to analyze |
| `--apply` | Apply confident changes (criteria updates, new searches) |
| `--topic-id <uuid>` | Optional. Limit analysis to specific topic |
| `--min-reviews <n>` | Minimum reviews before suggesting changes (default: 20) |

## Guardrails

- Won't suggest changes with <20 reviews (insufficient data)
- Won't change thresholds by more than 3x in one update
- Always documents reasoning before making changes
- Flags borderline cases for human review instead of auto-applying
