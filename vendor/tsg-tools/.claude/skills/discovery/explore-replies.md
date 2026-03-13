# /explore-replies

Discover creators from Twitter/X thread replies.

## Usage

```
/explore-replies <tweet-url> [--max-results 50] [--min-followers 1000]
```

## What it does

Calls `POST /twitter/explore-replies` to scrape replies from a Twitter/X thread and extract creator profiles from the repliers. This is useful for finding engaged developers who respond to viral tweets (e.g., Riley Brown's OpenClaw threads, popular tech announcements).

**Use cases:**
- Find developers who engage with viral AI/tech threads
- Discover creators who comment on competitor announcements
- Build lists from community discussions

## Parameters

- `tweetUrl` (required): Full Twitter/X status URL (e.g., `https://x.com/user/status/123456`)

## Options

- `--max-results <number>`: Maximum replies to fetch (default: 50, max: 200)
- `--min-followers <number>`: Filter out profiles with fewer followers (default: 0)
- `--save`: Create discovery records in database (requires `--project-id` and `--topic-id`)
- `--project-id <uuid>`: Project to associate discoveries with
- `--topic-id <uuid>`: Topic to associate discoveries with

## Examples

### Preview mode (no records created)

```bash
/explore-replies https://x.com/rileybrown/status/2024334527217455270

# Output:
# Original Tweet: @rileybrown (50K followers)
# "Openclaw can control blender..."
# 2,500 likes | 342 replies
#
# Found 47 unique profiles:
# 1. @dev_user (15K followers) - "This is amazing..."
# 2. @ai_enthusiast (8.2K followers) - "How does it work..."
# ...
```

### With minimum follower filter

```bash
/explore-replies https://x.com/rileybrown/status/123 --min-followers 5000

# Output:
# Found 12 unique profiles (filtered from 47 with minFollowers=5000)
```

### Save to project

```bash
/explore-replies https://x.com/rileybrown/status/123 \
  --save \
  --project-id abc123 \
  --topic-id def456

# Output:
# Created 47 discovery records in topic "AI Developers"
```

## API

### Explore replies (preview mode)

```bash
curl -s -X POST "$TSG_API_URL/twitter/explore-replies" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tweetUrl": "https://x.com/user/status/123456",
    "maxResults": 50,
    "minFollowers": 1000
  }'
```

### Explore and save discoveries

```bash
curl -s -X POST "$TSG_API_URL/twitter/explore-replies" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tweetUrl": "https://x.com/user/status/123456",
    "maxResults": 50,
    "minFollowers": 1000,
    "createDiscoveries": true,
    "projectId": "project-uuid",
    "topicId": "topic-uuid"
  }'
```

### Validate URL

```bash
curl -s "$TSG_API_URL/twitter/validate-url?url=https://x.com/user/status/123456" \
  -H "X-API-Key: $TSG_API_KEY"
```

## Response Format

```json
{
  "originalTweet": {
    "tweetUrl": "https://x.com/rileybrown/status/123",
    "tweetId": "123",
    "author": {
      "handle": "rileybrown",
      "displayName": "Riley Brown",
      "followerCount": 50000,
      "profileUrl": "https://x.com/rileybrown",
      "verified": true
    },
    "text": "Openclaw can control blender...",
    "engagement": {
      "likes": 2500,
      "replies": 342,
      "retweets": 150,
      "views": 100000
    }
  },
  "profiles": [
    {
      "profileUrl": "https://x.com/dev_user",
      "handle": "dev_user",
      "displayName": "Dev User",
      "followerCount": 15000,
      "verified": false,
      "bio": "Building cool stuff with AI",
      "reply": {
        "text": "This is amazing! How does it handle physics?",
        "likes": 45,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    }
  ],
  "metadata": {
    "uniqueProfiles": 47,
    "totalReplies": 342,
    "executedAt": "2024-01-15T12:00:00Z",
    "durationMs": 15000,
    "runId": "apify-run-id"
  },
  "discoveries": [],
  "discoveriesCreated": 0
}
```

## Cost Estimate

- Uses Apify Twitter reply scraper: ~$0.50-1.00 per exploration
- Requires paid Apify plan (~$49/month) for Twitter scraping

---

## Reply Mining in Saved Searches

You can configure a saved search to automatically use reply mining mode during discovery workflows. This is useful for recurring discovery runs where you want to find engaged users from replies to viral tweets.

### Create a Reply Mining Saved Search

```bash
curl -s -X POST "$TSG_API_URL/saved-searches" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topicId": "your-topic-uuid",
    "searchQuery": "openclaw min_retweets:5",
    "platform": "twitter",
    "discoveryMode": "reply_mining",
    "replyMiningConfig": {
      "minReplies": 10,
      "maxTweetsToExplore": 5,
      "minFollowers": 1000
    }
  }'
```

### How It Works

When the discovery pipeline runs a saved search with `discoveryMode: "reply_mining"`:

1. **Search for tweets** matching the query (e.g., `openclaw min_retweets:5`)
2. **Filter to high-engagement tweets** with at least `minReplies` replies
3. **Explore replies** on up to `maxTweetsToExplore` viral tweets
4. **Extract profiles** from repliers with at least `minFollowers` followers
5. **Process through normal pipeline** (enrichment, AI review, etc.)

### Configuration Options

| Field | Default | Description |
|-------|---------|-------------|
| `minReplies` | 20 | Minimum reply count to explore a tweet |
| `maxTweetsToExplore` | 5 | Max viral tweets to mine replies from |
| `minFollowers` | 500 | Filter out profiles with fewer followers |

### Discovery Mode Comparison

| Mode | Actor | Finds | Best For |
|------|-------|-------|----------|
| `standard` | `apidojo/tweet-scraper` | People who POST about a topic | Finding active content creators |
| `reply_mining` | `scraper_one/x-post-replies-scraper` | People who ENGAGE with viral content | Finding "regular developers" who discuss topics in replies |

### Run Discovery with Reply Mining

```bash
# Start a discovery workflow that includes reply mining saved searches
curl -s -X POST "$TSG_API_URL/workflows/start-combined" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-uuid",
    "topicId": "your-topic-uuid",
    "autoEnrich": true,
    "autoAiReview": true
  }'
```

The pipeline automatically detects reply mining saved searches and uses the appropriate discovery method.

---

## Related Skills

- [/execute-search](execute-search.md) - Execute saved search queries
- [/create-saved-search](create-saved-search.md) - Create saved search for repeated use
- [/search-by-content](search-by-content.md) - Search existing creators by content
