# /discover-creators

<command-name>discover-creators</command-name>

Discover and review creators for a project using direct Apify searches and AI evaluation.

## When to Use

- Finding new creators for a topic/project
- Running discovery with custom criteria
- Iterative discovery that learns from past approvals

## Arguments

| Argument | Description |
|----------|-------------|
| `--project` | Project folder name (e.g., "inngest") |
| `--auto-apply` | Apply learnings automatically (update searches/criteria) |
| `--dry-run` | Show what would be done without executing |

## Workspace Structure

All project configuration lives in workspace files (not the backend):

```
workspace/projects/{project}/
├── config.md        # Project ID, topic ID from backend
├── criteria.md      # Review criteria (you own this)
├── searches.md      # Active search terms (you own this)
└── results/         # Discovery results
    └── {date}.json
```

## Workflow

### 1. Load Project Context

Read the project folder to understand what we're looking for:

```bash
# Read project config (has backend IDs)
cat /workspace/group/workspace/projects/{project}/config.md

# Read criteria (what makes a good creator)
cat /workspace/group/workspace/projects/{project}/criteria.md

# Read active searches
cat /workspace/group/workspace/projects/{project}/searches.md
```

**config.md format:**
```markdown
# {Project Name}

project_id: uuid-from-backend
topic_id: uuid-from-backend
platform_priority: [youtube, tiktok, twitter, instagram]
```

**criteria.md format:**
```markdown
# Review Criteria

## Must Have
- Posts content about {topic} regularly
- Minimum 5k followers
- Active in last 30 days

## Nice to Have
- Tutorial/educational content style
- Engaged community (replies to comments)
- Cross-platform presence

## Exclude If
- Primarily promotional/ad content
- Inactive for 60+ days
- Controversial content history
```

**searches.md format:**
```markdown
# Active Searches

## High Performers (>40% approval)
- "cursor ide tutorial" [youtube]
- "ai coding assistant" [tiktok]

## Standard
- "vscode extensions" [youtube]
- "#devtools" [tiktok]

## Testing
- "developer productivity" [youtube]
```

### 2. Check Budget

Before running searches, estimate costs:

```
Use apify_estimate_cost tool:
- searches: {number of search terms}
- resultsPerSearch: 20
- platforms: [from config]
- profiles: 0 (enrich later)
```

If over budget, prioritize high-performing searches or wait.

### 3. Execute Searches

Run searches from searches.md using the Apify MCP tools:

**YouTube:**
```
apify_youtube_search(
  query: "cursor ide tutorial",
  maxResults: 20,
  sortBy: "relevance",
  uploadedAfter: "2024-01-01"
)
```

**TikTok:**
```
apify_tiktok_search(
  query: "#aicoding",
  maxResults: 20,
  searchType: "video"
)
```

**Twitter:**
```
apify_twitter_search(
  query: "cursor ide",
  maxResults: 20,
  minLikes: 50
)
```

**Instagram:**
```
apify_instagram_search(
  query: "#developertools",
  maxResults: 20,
  type: "hashtag"
)
```

### 4. Pre-Filter Results

Apply quick filters from criteria.md before AI review:

- **Minimum followers**: Skip if below threshold
- **Recency**: Skip if no recent posts
- **Deduplication**: Check against backend

```bash
# Check existing creators to avoid duplicates
cd /workspace/tsg-tools && npx tsx src/utils/api.ts creators --project-id {id} --limit 1000
```

### 5. Enrich Promising Results

For creators passing pre-filters, get full profile data:

```
apify_scrape_profile(
  platform: "youtube",
  handle: "@channelname",
  includePosts: true,
  maxPosts: 5
)
```

### 6. AI Review

For each enriched creator, evaluate against criteria.md:

**Your evaluation should produce:**
```json
{
  "handle": "@creator",
  "platform": "youtube",
  "decision": "approved" | "skipped",
  "confidence": 0.85,
  "reasoning": "Strong technical content, 50k followers, posts weekly tutorials...",
  "mustHavesMet": ["Posts regularly", "Technical content", ">5k followers"],
  "niceToHavesMet": ["Tutorial style", "Cross-platform"],
  "excludeReasons": []
}
```

### 7. Find Email (if not in profile)

If `apify_scrape_profile` didn't find an email, run the email waterfall:

```
apify_find_email(
  platform: "youtube",
  handle: "@channelname",
  bio: "Bio text from profile...",
  linktreeUrl: "https://linktr.ee/creator"  // if found in bio
)
```

The waterfall tries (in order, stops at first success):
1. Bio text extraction (FREE)
2. Linktree scraping (FREE)
3. YouTube email scraper (~$0.01, 47% hit rate)
4. TikTok email scraper (~$0.01, 13% hit rate)
5. Generic social scraper (~$0.01, 10% hit rate)

### 8. Save to Backend

Save approved creators to the backend:

```bash
# Create/link creator in backend with review
cd /workspace/tsg-tools && npx tsx src/utils/api.ts review {creatorId} \
  --project-id {project_id} \
  --topic-id {topic_id} \
  --action approved \
  --feedback "{reasoning}"
```

### 9. Draft Outreach (if email found)

If email was found, draft personalized outreach:

1. Load pitch angles from `workspace/projects/{project}/config.md`
2. Select appropriate angle based on creator's content and topic match
3. Generate personalized email by filling in the template variables:
   - `{{first_name}}` or `{{creator_name}}` - from profile
   - `{{ topic 1 }}`, `{{ topic 2 }}` - personalized based on their content
4. Create Gmail draft via backend:

```bash
curl -X POST "$TSG_API_URL/outreach/create-draft" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "creatorId": "{creator_id}",
    "projectId": "{project_id}",
    "to": "{email}",
    "subject": "{subject}",
    "body": "{drafted_email_body}"
  }'
```

This creates the draft in Gmail AND updates the creator status to "drafted".

**Skip if:**
- No email found
- Creator already contacted (status != not_contacted)

### 10. Update Learning Log

After each run, append insights to the learning log:

```bash
# Append to learning log
cat >> /workspace/group/workspace/learning-log.md << 'EOF'

## {date} Discovery Run

**Project:** {project}
**Searches:** {n} queries across {platforms}
**Results:** {discovered} found, {approved} approved, {skipped} skipped

### What Worked
- "{search term}" had 60% approval rate
- TikTok creators had higher engagement

### What Didn't Work
- "{search term}" had 0% approval (too broad)
- Instagram results were mostly promotional

### Adjustments Made
- Added "{new term}" based on approved creator bios
- Raised min followers from 5k to 10k (too many low-quality)
EOF
```

### 11. Self-Improvement (with --auto-apply)

If `--auto-apply` is set, update searches.md and criteria.md based on learnings:

**Search Term Management:**
- Move high performers (>40% approval) to "High Performers" section
- Remove underperformers (<10% approval after 3 runs)
- Add new terms mined from approved creator content

**Criteria Adjustment:**
- If 90% of approvals have >10k followers, raise minimum
- If good creators are being missed, add exceptions
- Track platform-specific patterns

## Example Run

```
User: /discover-creators --project inngest

Agent:
1. Loading project context from workspace/projects/inngest/...
2. Found 8 search terms across 3 platforms
3. Estimating cost: ~$0.32 for searches, $0.50 remaining today
4. Running 8 searches...
   - "inngest tutorial" [youtube]: 15 results
   - "durable execution" [youtube]: 12 results
   - "#serverless" [tiktok]: 20 results
   ...
5. Pre-filtering: 47 unique creators, 32 pass minimum criteria
6. Enriching 32 profiles...
7. AI Review complete:
   - 8 approved
   - 24 skipped
8. Saved 8 creators to backend
9. Updated learning log

Summary:
- Approval rate: 25% (above baseline)
- Best search: "inngest tutorial" (60% approval)
- Cost: $0.28

Next steps:
- High performers getting traction on YouTube
- Consider adding "background jobs" search term
- TikTok results were weak this run (mostly promotional)
```

## Tips

- Start with 2-3 search terms and expand based on approval rates
- YouTube typically has highest approval rates for technical content
- Run during off-peak hours for faster Apify execution
- Use `--dry-run` first to preview what will be searched
