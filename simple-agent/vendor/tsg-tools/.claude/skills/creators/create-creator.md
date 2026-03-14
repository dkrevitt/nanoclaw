# /create-creator

Create a creator from a profile URL with auto-enrichment.

## Usage

```
/create-creator --url "https://youtube.com/@channelname"
/create-creator --url "https://tiktok.com/@username" --platform tiktok
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--url` | Yes | Profile URL (YouTube, TikTok, Instagram, Twitter, etc.) |
| `--platform` | No | Platform name (auto-detected from URL) |

## What it does

1. Parses URL to extract platform and handle
2. Creates creator record in database
3. Runs **Tier 2 enrichment** (Apify profile scraper) to get:
   - Follower count, engagement rate
   - Recent posts with engagement metrics (likes, comments, views)
   - Bio, profile picture, verification status
   - Platform-specific user_id
4. Runs **Tier 3 enrichment** (Apify cross-platform + email) to get:
   - Cross-platform handles (YouTube, Twitter, TikTok, Instagram)
   - Email address (if discoverable)
5. Sets `tier2_status` and `tier3_status` based on enrichment results

## API Call

```bash
curl -s -X POST "$TSG_API_URL/creators" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "profileUrl": "https://youtube.com/@channelname",
    "primaryPlatform": "youtube"
  }' | jq '.'
```

## Response

```json
{
  "creator": {
    "id": "uuid",
    "display_name": "Tech Channel",
    "primary_handle": "@channelname",
    "primary_platform": "youtube",
    "profile_url": "https://youtube.com/@channelname",
    "bio": "AI and coding tutorials",
    "follower_count": 150000,
    "tier2_status": "success",
    "tier3_status": "success",
    "enrichment_tier": 3,
    "recent_posts": [
      {
        "post_url": "https://youtube.com/watch?v=...",
        "caption": "Claude AI Tutorial",
        "created_at": "2024-01-10",
        "engagement": { "likes": 1500, "comments": 200, "views": 45000 }
      }
    ],
    "twitter_handle": "@techchannel",
    "email": "contact@techchannel.com",
    "engagement_rate": 4.5
  },
  "alreadyExisted": false
}
```

If creator already exists:
```json
{
  "creator": { ... },
  "alreadyExisted": true
}
```

## Example

```
/create-creator --url "https://youtube.com/@AIExplained"

Created creator:
  Name: AI Explained
  Platform: YouTube
  Handle: @AIExplained
  Followers: 1.2M
  Recent Posts: 10 posts loaded
  Enrichment: Tier 2 + Tier 3 (Apify)
  Email: contact@aiexplained.com
  Cross-platform: Twitter (@aiexplained)

Next steps:
  1. Link to project: /link-creator-to-project --creator-ids <id> --project-id <id>
  2. View details: /get-creator <id>
```

## Supported Platforms

| Platform | URL Patterns |
|----------|--------------|
| YouTube | youtube.com/@handle, youtube.com/channel/ID |
| TikTok | tiktok.com/@handle |
| Instagram | instagram.com/handle |
| Twitter | twitter.com/handle, x.com/handle |
| LinkedIn | linkedin.com/in/handle |
| Twitch | twitch.tv/handle |

## Cost

- Tier 2 (Apify profile): ~$0.01-0.10 per profile
- Tier 3 (Apify cross-platform + email): ~$0.10-0.20 per profile
- Total: ~$0.11-0.30 per creator

## Related

- Link to project: `/link-creator-to-project`
- Enrich creator: `POST /creators/:id/enrich`
- Get creator: `/get-creator`
