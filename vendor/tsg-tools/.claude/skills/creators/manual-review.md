# Manual Review Workflow

Review AI-rejected creators and recover good ones that were filtered out by automated criteria.

## When to Use

Use manual review when:
- AI pre-review is too strict (e.g., "video content" requirement filtering out Twitter text creators)
- Platform-specific content doesn't fit generic review criteria
- Nuanced evaluation is needed (e.g., distinguishing content creators from random users)

## Workflow

### Step 1: Find AI-Rejected Creators

Query creators with `contact_status=no_fit` for the topic:

```bash
curl -s "$TSG_API_URL/creators?topic_id=<topic-id>&contact_status=no_fit&limit=50" \
  -H "X-API-Key: $TSG_API_KEY" | jq '[.creators[] | {
    id,
    name: .display_name,
    handle: .primary_handle,
    platform: .primary_platform,
    bio,
    followers: .follower_count,
    posts: [.recent_posts[:3][] | .caption[0:150]]
  }]'
```

### Step 2: Evaluate Each Creator

For each creator, assess:

| Criteria | Good Sign | Bad Sign |
|----------|-----------|----------|
| **Content relevance** | Discusses the topic substantively | Only passing mention or unrelated |
| **Creator type** | Individual content creator | Brand/company/bot account |
| **Content quality** | Original insights, tutorials, reviews | Retweets, memes only, promotional |
| **Engagement** | Active discussions, replies | Silent account, no engagement |

### Step 3: Approve Good Creators

Update status to `needs_final_review` for creators worth pursuing:

```bash
curl -s -X PUT "$TSG_API_URL/creators/<creator-id>/project-status/<project-id>" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "contactStatus": "needs_final_review",
    "reviewFeedback": "Manual review: <reason for approval>"
  }'
```

### Step 4: Batch Approve Multiple Creators

For approving several at once:

```bash
curl -s -X POST "$TSG_API_URL/creators/batch-update-status" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "projectId": "<project-id>",
    "creatorIds": ["id1", "id2", "id3"],
    "contactStatus": "needs_final_review"
  }'
```

## Example: Twitter Creator Review

Twitter creators often get AI-rejected because project criteria require "video content." Manual review can recover good text-based creators:

```bash
# Find Twitter creators rejected from OpenClaw topic
curl -s "$TSG_API_URL/creators?topic_id=57742...&contact_status=no_fit&primary_platform=twitter&limit=30" \
  -H "X-API-Key: $TSG_API_KEY" | jq '[.creators[] | {
    name: .display_name,
    handle: .primary_handle,
    bio,
    sample_post: .recent_posts[0].caption[0:200]
  }]'
```

Evaluation criteria for Twitter:
- **Approve**: Developers sharing OpenClaw tips, building with it, technical discussions
- **Skip**: Parody accounts, crypto promoters using hashtags for reach, bots, news aggregators

## Filtering by Platform

```bash
# Get rejected Instagram creators
curl -s "$TSG_API_URL/creators?topic_id=<id>&contact_status=no_fit&primary_platform=instagram&limit=50" \
  -H "X-API-Key: $TSG_API_KEY"

# Get rejected Twitter creators
curl -s "$TSG_API_URL/creators?topic_id=<id>&contact_status=no_fit&primary_platform=twitter&limit=50" \
  -H "X-API-Key: $TSG_API_KEY"
```

## Status Flow

```
discovered → enriched → no_fit (AI rejected)
                           ↓
                    [Manual Review]
                           ↓
                   needs_final_review → not_contacted → contacted → ...
```

## Related

- Update status: `/update-creator-status`
- List creators: `/list-creators`
- Get creator details: `/get-creator`
