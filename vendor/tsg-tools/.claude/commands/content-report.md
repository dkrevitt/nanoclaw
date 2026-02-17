# Content Report Command

**Command**: `/content-report`

**Purpose**: Generate a market intelligence report summarizing recent content from creators matched to a project. Helps content strategists track what top creators are doing, identify trends, and spot new sponsorship opportunities.

---

## Usage

```bash
/content-report --project-id <uuid>                    # Analyze last 30 days
/content-report --project-id <uuid> --days 14          # Custom time window
/content-report --project-id <uuid> --refresh          # Refresh posts before analysis
/content-report --project-id <uuid> --output ./report.md
/content-report --project-id <uuid> --dry-run          # Preview what would be analyzed
```

---

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--project-id` | Yes | - | Project to analyze |
| `--days` | No | 30 | How many days back to analyze |
| `--refresh` | No | false | Refresh posts before analysis (calls batch-refresh-posts) |
| `--limit` | No | 100 | Max creators to include |
| `--output` | No | auto | Custom output path for report |
| `--dry-run` | No | false | Preview what would be analyzed without generating report |

---

## What the Report Analyzes

For creators in a project (any contact_status except `no_fit` and `skipped`):

1. **High-performing posts** - Posts with above-average engagement for that creator
2. **New sponsors** - Brands/sponsors detected via #ad, #sponsored, "paid partnership" patterns
3. **Trending topics** - Most common hashtags and themes emerging in recent content
4. **Format shifts** - Platform distribution changes (more TikTok? less YouTube?)

---

## Workflow

### Step 1: Fetch Project Details

```bash
npx tsx src/utils/api.ts project <project-id>
```

Get the project name for the report header.

### Step 2: Fetch Matched Creators

```bash
npx tsx src/utils/api.ts creators --project-id <id> --limit 100
```

Filter response to exclude creators with `contact_status` of `no_fit` or `skipped`. Only include creators with `recent_posts` data.

**Contact statuses to include:**
- `NULL` (pending review)
- `needs_final_review`
- `not_contacted`
- `drafted`
- `contacted`
- `in_progress`
- `closed_won`
- `closed_lost`

### Step 3: Optionally Refresh Posts

If `--refresh` flag is set:

```bash
curl -X POST "$TSG_API_URL/creators/batch-refresh-posts" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "creatorIds": ["<uuid>", ...],
    "maxDaysBack": 30
  }'
```

**Cost**: ~$0.01-0.05 per platform per creator. For 50 creators across 2 platforms avg = ~$2-5.

### Step 4: Analyze Posts

For each creator, filter `recent_posts` to the analysis window (posts from last N days), then:

#### a) High-Performing Posts

1. Calculate each creator's average engagement: `(likes + comments + views) / post_count`
2. Flag posts with engagement > 1.5x their creator's average
3. Rank all flagged posts by absolute engagement numbers
4. Select top 10-20 for the report

#### b) Sponsored Content Detection

Use these patterns to detect sponsored content:
- `is_sponsored: true` field (if available)
- `sponsorship_signals` field (if available)
- Caption patterns: `#ad`, `#sponsored`, `#partner`, `paid partnership`, `sponsored by`, `in partnership with`

Extract brand names by looking at:
- Words immediately following sponsor signals
- @mentions in sponsored posts
- Hashtags like `#BrandPartner` or `#BrandAmbassador`

Group findings by detected brand/sponsor.

#### c) Topic/Hashtag Analysis

1. Aggregate all hashtags from posts in the analysis window
2. Count frequency of each hashtag
3. Rank by most common
4. Note hashtags that appear across multiple creators (indicates trend)

#### d) Emerging Themes (Claude's Analysis)

Read through post captions and identify:
- Topic clusters beyond just hashtags (e.g., "agentic coding", "model comparisons")
- Content strategy patterns (tutorials vs hot takes vs reviews vs reactions)
- Sentiment shifts (more negative takes? more excitement?)
- New product/tool mentions

#### e) Platform Distribution

1. Count posts per platform in the analysis window
2. Calculate percentage breakdown
3. Note any shifts from previous periods if data available

### Step 5: Generate Report

Create a markdown report with the structure below and save to:
- Default: `projects/{project-name}/reports/content-report-{YYYY-MM-DD}.md`
- Custom: Path specified by `--output` flag

Display a summary in the terminal with:
- Top 5 performing posts
- Top 5 trending topics/hashtags
- Sponsor activity summary
- Platform breakdown

---

## Report Format

```markdown
# Creator Content Report: [Project Name]

**Generated:** YYYY-MM-DD
**Analysis Period:** Last N days
**Creators Analyzed:** X

---

## Top Performing Content

| Creator | Post | Platform | Views | Engagement | vs Avg |
|---------|------|----------|-------|------------|--------|
| @techcreator | "Claude vs GPT..." | YouTube | 125K | 4.5K | +180% |
| @aidev | "Cursor AI tutorial" | TikTok | 89K | 12K | +220% |

### Notable Posts
1. **@techcreator** - [Claude vs GPT-4 Benchmark](url) - 125K views, 180% above average
   - Why it worked: Comparison content, trending topic, optimal length

---

## Sponsorship Activity

### Sponsors Detected
| Brand | Creators | Posts | Example |
|-------|----------|-------|---------|
| Cursor | 5 | 8 | @aidev: "Loving Cursor for..." |
| Vercel | 3 | 4 | @techcreator: "Deployed with Vercel" |
| AWS | 2 | 2 | @clouddev: "Running on AWS" |

### Sponsorship Insights
- **Cursor** most active sponsor this period (8 posts across 5 creators)
- Dev tools category dominates sponsorships
- Most sponsored posts use #ad or "sponsored by" patterns

---

## Trending Topics

### Top Hashtags
| Hashtag | Posts | Creators |
|---------|-------|----------|
| #vibecoding | 23 | 12 |
| #claudecode | 18 | 9 |
| #aiagent | 15 | 8 |
| #cursor | 12 | 7 |

### Emerging Themes
- **Agentic coding workflows** - 15 posts across 8 creators discussing autonomous coding agents
- **Claude Code adoption** - 12 posts reviewing/demoing Claude Code
- **Model benchmark comparisons** - 8 posts comparing Claude, GPT-4, Gemini on coding tasks
- **"Vibe coding" aesthetic** - 6 creators experimenting with ambient/flow-state coding content

---

## Platform Distribution

| Platform | Posts | % of Total |
|----------|-------|------------|
| YouTube | 89 | 45% |
| TikTok | 67 | 34% |
| Instagram | 32 | 16% |
| Twitter | 10 | 5% |

**Insight:** TikTok and YouTube dominate, with TikTok strong for short-form tutorials

---

## Creator Activity Summary

| Creator | Posts | Platforms | Sponsored | Top Hashtag |
|---------|-------|-----------|-----------|-------------|
| @techcreator | 12 | YT, TT | 2 | #aitools |
| @aidev | 8 | TT, IG | 1 | #coding |
| ... | ... | ... | ... | ... |

---

*Report generated by Claude Code*
```

---

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/projects/:id` | Get project name |
| GET | `/creators?project_id=X` | Fetch matched creators |
| POST | `/creators/batch-refresh-posts` | Refresh post data (optional) |

---

## Cost Estimate

| Operation | Cost | Notes |
|-----------|------|-------|
| Fetch creators | Free | Database query |
| Refresh posts | ~$0.01-0.05/platform | Optional, only if --refresh |

For 50 creators with 2 platforms each and --refresh: ~$2-5 total.
Without --refresh: Free (uses existing post data).

---

## Implementation Notes

### Filtering Posts by Date

The `recent_posts` array contains posts with `created_at` timestamps. Filter to the analysis window:

```javascript
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - daysBack);

const postsInWindow = creator.recent_posts.filter(post =>
  new Date(post.created_at) >= cutoffDate
);
```

### Calculating Engagement

Total engagement = likes + comments + (views if available)

For platforms where views aren't meaningful (Twitter), use likes + retweets + replies.

### Sponsor Detection Patterns

```javascript
const sponsorPatterns = [
  /#ad\b/i,
  /#sponsored\b/i,
  /#partner\b/i,
  /paid partnership/i,
  /sponsored by/i,
  /in partnership with/i,
  /thanks to .+ for sponsoring/i,
  /partner: @\w+/i
];

const isSponsored = sponsorPatterns.some(pattern =>
  pattern.test(post.caption)
);
```

### Extracting Brand Names

Look for:
1. @mentions after sponsor signals
2. Capitalized words immediately after "sponsored by", "thanks to"
3. Hashtags that look like brand names (#CursorAI, #Vercel)

---

## Dry Run Output

When using `--dry-run`, display:

```
=== Content Report Preview ===

Project: Kilo Code
Analysis Period: Last 30 days

Would analyze:
- 47 creators
- ~350 posts (estimated)
- 4 platforms: YouTube (45%), TikTok (34%), Instagram (16%), Twitter (5%)

Creators by status:
- not_contacted: 20
- contacted: 15
- in_progress: 8
- closed_won: 4

Post data freshness:
- Fresh (<7 days): 32 creators
- Stale (7-30 days): 12 creators
- Very stale (>30 days): 3 creators

Recommendation: Run with --refresh to update stale post data

To generate the full report:
/content-report --project-id <uuid>
```

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "No creators found" | No matched creators in project | Run discovery and review workflows first |
| "No post data available" | Creators lack recent_posts | Run enrichment or use --refresh |
| "Project not found" | Invalid project ID | Check project ID via /check-projects |

---

## Related Commands

- `/check-projects` - View project and creator status before running report
- `/discover-creators` - Add more creators to the project
- `/run-pipeline` - Run discovery + review workflow

---

## Future Enhancements

- **Email digest**: Auto-send weekly report via email
- **Comparison mode**: Compare two time periods
- **Topic clustering**: Use embeddings to group similar content themes
- **Competitor tracking**: Include creators not yet in project
- **Sentiment analysis**: Analyze comment sentiment on posts
