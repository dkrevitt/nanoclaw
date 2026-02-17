# /search-by-content

Search creators by keywords in their content, bio, and profile. This is an ad-hoc alternative to internal discovery when you don't want to create a saved search first.

## Usage

```
/search-by-content --keywords "claude, cursor" --project-id <uuid> --topic-id <uuid>
```

## What it does

Calls `POST /creators/search-by-content` to search the existing creator database and optionally link matching creators to your project.

**Use this when:**
- You want a quick exploratory search
- You don't want to create a saved search
- You're testing different keyword combinations

**Use internal discovery instead when:**
- You want to save the search for re-use
- You're running a formal cross-project search
- You want to track search execution history

## Parameters

- `keywords` (required): Array of search keywords
- `projectId` (required): Project to link matching creators to
- `topicId` (required): Topic to associate with linked creators
- `platform` (optional): Filter by platform (youtube, tiktok, instagram, twitter)
- `minFollowers` (optional): Minimum follower count
- `limit` (optional): Max results (default: 50)
- `dryRun` (optional): Preview matches without linking

## Example

```bash
curl -s -X POST "$TSG_API_URL/creators/search-by-content" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["claude", "cursor", "ai coding"],
    "projectId": "project-123",
    "topicId": "topic-456",
    "platform": "youtube",
    "minFollowers": 5000,
    "limit": 25
  }' | jq '.'
```

## Response

```json
{
  "matches": [
    {
      "creator_id": "uuid",
      "display_name": "AI Coder",
      "primary_handle": "@aicoder",
      "primary_platform": "youtube",
      "follower_count": 25000,
      "match_reason": "Post caption contains: claude, cursor",
      "linked": true
    },
    {
      "creator_id": "uuid",
      "display_name": "Tech Reviews",
      "primary_handle": "@techreviews",
      "primary_platform": "youtube",
      "follower_count": 18000,
      "match_reason": "Bio contains: ai coding",
      "linked": true
    }
  ],
  "total": 35,
  "linked": 28,
  "alreadyLinked": 7
}
```

**Fields:**
- `matches`: Array of matching creators with details
- `total`: Total matches found
- `linked`: Number of NEW creators linked to project
- `alreadyLinked`: Creators already in the project

## What Gets Searched

Keyword search looks at:
- Creator `display_name` and `primary_handle`
- Creator `bio`
- **Post content** - captions, titles, descriptions in `recent_posts`
- **Hashtags** - in post metadata

## Dry Run Mode

Preview matches without linking:

```bash
curl -s -X POST "$TSG_API_URL/creators/search-by-content" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["claude", "cursor"],
    "projectId": "project-123",
    "topicId": "topic-456",
    "dryRun": true
  }' | jq '.'
```

Response will show matches but `linked` will be `false` for all.

## Keyword Syntax

Keywords are matched case-insensitively:
- Single words: `["claude", "cursor"]`
- Phrases: `["claude code", "ai coding agent"]`
- Hashtags: `["#claudecode", "#aitools"]`

**Note:** Keywords are OR-matched - a creator matching ANY keyword is included.

## Filtering Options

```bash
# Platform filter
"platform": "youtube"  # or tiktok, instagram, twitter

# Follower minimum
"minFollowers": 10000

# Limit results
"limit": 100
```

## Comparison with Internal Discovery

| Feature | search-by-content | internal-discovery |
|---------|-------------------|-------------------|
| Requires saved search | No | Yes |
| Re-runnable | No (ad-hoc) | Yes |
| Tracks execution history | No | Yes |
| Cost | Free | Free |
| Speed | Instant | Instant |

## API

```
POST /creators/search-by-content
{
  "keywords": ["string", ...],
  "projectId": "uuid",
  "topicId": "uuid",
  "platform": "string",        // optional
  "minFollowers": number,      // optional
  "limit": number,             // optional, default 50
  "dryRun": boolean            // optional, default false
}
```

## TypeScript Usage

```typescript
import { searchCreatorsByContent } from './utils/api.js';

const result = await searchCreatorsByContent(
  ['claude', 'cursor'],
  { topicId: 'topic-123', limit: 25 }
);

if (result.success) {
  console.log(`Found ${result.data.matches.length} creators`);
}
```

## Related Skills

- [/internal-discovery](internal-discovery.md) - Saved search-based internal discovery
- [/execute-search](execute-search.md) - External Apify discovery
- [/list-saved-searches](list-saved-searches.md) - View existing saved searches
