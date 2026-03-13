# Enrichment Skills

Enrich creators with additional profile data.

## Available Skills

| Skill | Description |
|-------|-------------|
| [/enrich-creator](enrichment/enrich-creator.md) | Enrich a single creator (Tier 2 or 3) |
| [/batch-enrich](enrichment/batch-enrich.md) | Batch enrich multiple creators |
| [/find-email](#email-only-lookup) | Find email for a single creator (no profile enrichment) |
| [/batch-find-emails](#batch-email-lookup) | Find emails for multiple creators |
| [/refresh-posts](#post-refresh) | Refresh recent posts for a creator |
| [/search-cross-platform](#cross-platform-discovery) | Find creator on other platforms |
| [/extended-posts](#extended-post-history) | Fetch extended post history |

## Quick Reference

### Single creator enrichment (POST /creators/:id/enrich)
```bash
/enrich-creator <creator-id>                    # Tier 2 (default)
/enrich-creator <creator-id> --tier 3           # Tier 3 (cross-platform)
/enrich-creator <creator-id> --include-email    # Tier 2 + email enrichment
```

### Batch enrichment (POST /creators/batch-enrich)
```bash
/batch-enrich <id1> <id2> <id3>                 # Tier 2 (default)
/batch-enrich <id1> <id2> --tier 3              # Tier 3
/batch-enrich --project-id <uuid> --async       # Async via Inngest
```

## Enrichment Tiers

### Tier 2 (Apify) - ~$0.01/profile
- Follower/subscriber counts
- Recent posts with engagement metrics
- Bio and profile metadata
- Post frequency analysis

**Newsletter/Substack Tier 2:**
- Fetches newsletter HTML page
- Extracts social handles (Twitter, YouTube, Instagram, etc.)
- Extracts subscriber count (if displayed)
- Stores handles in `extracted_social_handles` for Tier 3

### Tier 3 (Apify) - ~$0.01-0.10/profile
For newsletters, Tier 3 uses extracted social handles to enrich via Apify profile scrapers:
- Uses Twitter handle → Apify Twitter profile scraper
- Uses YouTube handle → Apify YouTube channel scraper
- Gets follower counts, recent posts, engagement metrics

### Tier 3 (Apify) - ~$0.10-0.50/profile
For social platforms, uses Apify profile scrapers:
- Cross-platform handle discovery (via Social Media Finder)
- Full profile data per platform
- Email addresses (via email scraper waterfall)
- Extended engagement metrics

**Note:** influencers.club is available but Apify is the default provider for cost efficiency. Tier 3 runs automatically during the discovery workflow.

## Typical Workflow

1. **Tier 2** runs automatically during discovery
2. **Review** creators based on Tier 2 data
3. **Tier 3** auto-triggered on approval (for cross-platform + email)

Manual enrichment is rarely needed - use these skills for:
- Re-enriching stale data
- Testing enrichment on specific creators
- Debugging enrichment failures

---

## Email-Only Lookup

Find email for a creator without running full profile enrichment. Uses the email waterfall:
1. Apify email scraper (uses platform user_id from tier2 metadata)
2. Cross-platform discovery (for TikTok - finds other profiles first)
3. influencers.club (if enabled)

### Single Creator

```bash
POST /creators/:id/find-email
```

**Request:**
```json
{
  "force": false  // Re-run even if email already exists
}
```

**Response:**
```json
{
  "success": true,
  "email": "creator@example.com",
  "provider": "apify",
  "metadata": {
    "source": "youtube_channel",
    "lookup_method": "channel_about_page"
  }
}
```

### Batch Email Lookup

```bash
POST /creators/batch-find-emails
```

**Request:**
```json
{
  "creatorIds": ["uuid1", "uuid2"],  // OR use projectId/topicId
  "projectId": "optional-filter",
  "topicId": "optional-filter",
  "limit": 100,
  "onlyMissing": true  // Only process creators without email (default: true)
}
```

**Response:**
```json
{
  "total": 10,
  "succeeded": 7,
  "failed": 2,
  "skipped": 1,
  "results": [
    { "creatorId": "...", "success": true, "email": "...", "provider": "apify" },
    { "creatorId": "...", "success": false, "error": "No user_id available" }
  ],
  "message": "Found 7 emails out of 10 creators"
}
```

### When to Use Email-Only vs Full Enrichment

| Scenario | Use |
|----------|-----|
| Already have Tier 2 data, just need email | `POST /creators/:id/find-email` |
| Batch email lookup for approved creators | `POST /creators/batch-find-emails` |
| Need profile data + email | `POST /creators/:id/enrich` with `{ includeEmail: true }` |
| Full cross-platform + email | `POST /creators/:id/enrich` with `{ tier: 3, includeEmail: true }` |

### Cost

~$0.01 per lookup (Apify email scraper)

---

## Cross-Platform Discovery

Find a creator's profiles on other platforms. Uses Social Media Finder to discover handles across YouTube, TikTok, Instagram, Twitter, etc.

### Endpoint

```bash
POST /creators/search-cross-platform
```

### Request

```json
{
  "creatorId": "<uuid>"
}
```

Or search by handle:
```json
{
  "handle": "techcreator123",
  "platform": "youtube"
}
```

### Response

```json
{
  "creator": {
    "id": "<uuid>",
    "youtube_handle": "techcreator123",
    "tiktok_handle": "techcreator123",
    "instagram_handle": "tech_creator_123",
    "twitter_handle": "TechCreator"
  },
  "platformsFound": ["youtube", "tiktok", "instagram", "twitter"]
}
```

### Use Cases

- **Email discovery**: Find alternate platforms to try email lookup
- **Cross-platform reach**: Understand creator's total audience
- **Verification**: Confirm handles match the same person

### Cost

~$0.10-0.20 per lookup (uses Social Media Finder API)

---

## Extended Post History

Fetch extended post history (20+ posts per platform) for deeper content analysis.

### Endpoint

```bash
GET /creators/:id/posts-across-platforms
```

### Query Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxDaysBack` | 90 | How far back to fetch posts |
| `platforms` | all | Comma-separated platforms to include |

### Example

```bash
curl "$TSG_API_URL/creators/<id>/posts-across-platforms?maxDaysBack=60&platforms=youtube,tiktok" \
  -H "X-API-Key: $TSG_API_KEY"
```

### Response

```json
{
  "creatorId": "<uuid>",
  "posts": {
    "youtube": [
      {
        "post_url": "https://youtube.com/watch?v=...",
        "title": "Claude vs GPT-4 Benchmark",
        "caption": "...",
        "created_at": "2024-01-05T12:00:00Z",
        "engagement": {
          "views": 125000,
          "likes": 4500,
          "comments": 320
        }
      }
    ],
    "tiktok": [ ... ]
  },
  "analysis": {
    "postTimingPatterns": { ... },
    "topHashtags": ["#ai", "#coding", "#tech"],
    "contentCategories": ["tutorials", "reviews"]
  }
}
```

### Use Cases

- **Content analysis**: Review broader content history
- **Engagement patterns**: Analyze post timing and frequency
- **Topic relevance**: Find posts matching specific keywords

---

## Post Refresh

Refresh recent posts for a creator without running full enrichment. This is cheap (~$0.01-0.05/platform) compared to Tier 3 enrichment.

### Single Creator

```bash
POST /creators/:id/refresh-posts
```

**Request:**
```json
{
  "maxDaysBack": 30,
  "platforms": ["youtube", "tiktok"]
}
```

**Response:**
```json
{
  "creatorId": "<uuid>",
  "platformsRefreshed": ["youtube", "tiktok"],
  "postsFound": {
    "youtube": 8,
    "tiktok": 12
  },
  "updatedAt": "2024-01-10T12:00:00Z"
}
```

### Batch Refresh

```bash
POST /creators/batch-refresh-posts
```

**Request:**
```json
{
  "creatorIds": ["<uuid>", "<uuid>", "<uuid>"],
  "maxDaysBack": 30
}
```

**Response:**
```json
{
  "refreshed": 3,
  "results": [
    { "creatorId": "<uuid>", "postsFound": 15 },
    { "creatorId": "<uuid>", "postsFound": 8 },
    { "creatorId": "<uuid>", "postsFound": 22 }
  ]
}
```

### When to Use

| Scenario | Use Post Refresh? |
|----------|-------------------|
| Data is stale (>7 days) | Yes |
| Need latest engagement metrics | Yes |
| Need cross-platform handles | No - use Tier 3 |
| Need email address | No - use Tier 3 |
| Need demographics | No - use Tier 3 |

### Cost Comparison

| Operation | Cost | What It Updates |
|-----------|------|-----------------|
| Post refresh | ~$0.01-0.05/platform | Recent posts, engagement |
| Tier 2 enrichment | ~$0.01/profile | Profile + posts |
| Tier 3 enrichment (Apify) | ~$0.10-0.50/profile | Cross-platform, email |
| Tier 3 enrichment (influencers.club) | ~$0.50-1.00/profile | Cross-platform, email, demographics, AI niches |

**Note:** Apify is the default provider for both tiers. influencers.club is available as a fallback (configurable via env vars) and provides additional demographics data.

### Typical Workflow

1. **Initial discovery** - Tier 2 runs automatically
2. **Review and approve** - Tier 3 auto-triggered on approval
3. **Periodic refresh** - Use post refresh for data freshness (weekly/monthly)

---

## Async Batch Enrichment via Inngest

For large batches (20+ creators), use the async mode to run enrichment via Inngest for reliable background execution with proper retries.

```bash
curl -X POST "$TSG_API_URL/creators/batch-enrich" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<project-uuid>",
    "tier": 3,
    "async": true,
    "limit": 100
  }'
```

### Tracking Progress

The workflow runs asynchronously via Inngest. To monitor:

1. Check Inngest dashboard (if deployed): `https://app.inngest.com`
2. Query creators to see updated `tier3_status` values:
   ```bash
   curl "$TSG_API_URL/creators?project_id=<uuid>&limit=500" \
     -H "X-API-Key: $TSG_API_KEY" \
     | jq '[.creators[] | {display_name, tier3_status}] | group_by(.tier3_status) | map({status: .[0].tier3_status, count: length})'
   ```

### Cost

~$0.10-0.50 per creator (Apify) + optional ~$0.01 for email fallback

### When to Use Async vs Sync

| Scenario | Recommended Approach |
|----------|---------------------|
| 1-5 creators | `POST /creators/:id/enrich` with `{ tier: 3 }` (loop) |
| 5-20 creators | `POST /creators/batch-enrich` with `{ tier: 3 }` (sync) |
| 20+ creators | `POST /creators/batch-enrich` with `{ tier: 3, async: true }` |
| During discovery workflow | Automatic (runs in `process-search` Inngest step) |
