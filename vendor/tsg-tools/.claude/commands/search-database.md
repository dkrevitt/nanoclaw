# /search-database

Search the existing creator database across all projects to find matches for your topic. This is FREE and instant - no Apify costs.

## Usage

```
# Mode A: Internal saved search (requires is_internal=true saved search)
/search-database --saved-search-id <uuid> --project-id <uuid>

# Mode B: Ad-hoc keyword search
/search-database --keywords "claude, cursor" --project-id <uuid> --topic-id <uuid>

# With options
/search-database --keywords "AI coding" --project-id <uuid> --topic-id <uuid> --platform youtube --limit 50
/search-database --saved-search-id <uuid> --project-id <uuid> --dry-run
```

## Arguments

| Argument | Required | Mode | Description |
|----------|----------|------|-------------|
| `--project-id <uuid>` | Yes | Both | Project to link creators to |
| `--topic-id <uuid>` | Mode B only | B | Topic for ad-hoc keyword search |
| `--saved-search-id <uuid>` | Mode A only | A | Internal saved search ID |
| `--keywords <text>` | Mode B only | B | Comma-separated search keywords |
| `--platform <name>` | Optional | Both | Filter by platform (youtube, tiktok, etc.) |
| `--min-followers <n>` | Optional | Both | Minimum follower count |
| `--limit <n>` | Optional | Both | Max results (default: 50) |
| `--dry-run` | Optional | Both | Preview matches without linking |

## When to Use

| Scenario | Use `/search-database`? |
|----------|------------------------|
| New topic for existing project | Yes - find relevant creators already in system |
| Cross-pollinate between projects | Yes - link creators from Project A to Project B |
| Quick exploratory search | Yes - free and instant |
| Need fresh creators | No - use `/discover-creators` |

## Cost Comparison

| Method | Cost | Speed | Finds New Creators? |
|--------|------|-------|---------------------|
| `/search-database` | Free | Instant | No (existing only) |
| `/discover-creators` | ~$0.50/search | Minutes | Yes |

## Workflow Steps

### Step 1: Validate Inputs

**Mode A (Saved Search):**
```bash
# Verify saved search exists and is internal
curl -s "$TSG_API_URL/saved-searches/$SAVED_SEARCH_ID" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'

# Check isInternal flag
# If isInternal is false, warn user this will use external discovery
```

**Mode B (Keywords):**
```bash
# Verify project and topic exist
npx tsx src/utils/api.ts project $PROJECT_ID
npx tsx src/utils/api.ts topic $TOPIC_ID
```

### Step 2: Execute Search

**Mode A - Internal Discovery:**
```bash
curl -s -X POST "$TSG_API_URL/internal-discovery/execute" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"savedSearchId\": \"$SAVED_SEARCH_ID\",
    \"projectId\": \"$PROJECT_ID\"
  }" | jq '.'
```

**Response:**
```json
{
  "discovered": 47,
  "linkedToProject": 35,
  "alreadyLinked": 12,
  "message": "Found 47 creators, linked 35 new creators to project"
}
```

**Mode B - Keyword Search:**
```bash
curl -s -X POST "$TSG_API_URL/creators/search-by-content" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"keywords\": [\"claude\", \"cursor\"],
    \"projectId\": \"$PROJECT_ID\",
    \"topicId\": \"$TOPIC_ID\",
    \"platform\": \"youtube\",
    \"minFollowers\": 1000,
    \"limit\": 50,
    \"dryRun\": false
  }" | jq '.'
```

**Response:**
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
    }
  ],
  "total": 35,
  "linked": 28,
  "alreadyLinked": 7
}
```

### Step 3: Display Results

Show a summary:
```
=== Database Search Results ===

Query: "claude, cursor" on youtube
Project: Kilo Code
Topic: AI coding agents

Found: 35 matching creators
├── Newly linked: 28
├── Already in project: 7
└── Skipped (dry-run): 0

Top matches:
1. @aicoder (25k followers) - "claude, cursor" in post caption
2. @devtools (18k followers) - "claude" in bio
3. @techreview (12k followers) - "cursor" in recent post

Next steps:
- Run AI review: /run-pipeline --project-id <id> --skip-discovery
- View creators: /check-projects --project-id <id>
```

### Step 4: Suggest Next Steps

After linking creators:
- Remind user to run AI review with `--skip-discovery` flag
- Link to `/check-projects` to view the updated creator list

## Example Output

```
/search-database --keywords "claude, cursor, ai coding" --project-id abc123 --topic-id def456

=== Searching existing database ===

Keywords: claude, cursor, ai coding
Project: Kilo Code
Topic: AI coding agents

Searching 3,247 creators across all projects...

Found 47 matching creators:
├── YouTube: 23
├── TikTok: 12
├── Twitter: 8
├── Instagram: 4

Linking to project...
├── Newly linked: 35
├── Already in project: 12

=== Top Matches ===

1. @claude_coder (YouTube, 45k followers)
   Match: "claude vs cursor comparison" in post title

2. @ai_dev_tips (TikTok, 32k followers)
   Match: "claude code review" in caption

3. @techreviewer (Twitter, 28k followers)
   Match: "ai coding assistant" in bio

=== Next Steps ===

Run AI review (skip discovery since we just added from database):
  /run-pipeline --project-id abc123 --topic-id def456 --skip-discovery

View project status:
  /check-projects --project-id abc123
```

## Creating Internal Saved Searches

To use Mode A, first create a saved search with `isInternal: true`:

```bash
curl -s -X POST "$TSG_API_URL/saved-searches" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topicId": "<uuid>",
    "projectId": "<uuid>",
    "platform": "youtube",
    "searchQuery": "AI coding tutorial",
    "isInternal": true
  }' | jq '.'
```

Internal saved searches:
- Search the existing database, not external platforms
- Are free (no Apify costs)
- Return instant results
- Can be re-run anytime

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/internal-discovery/execute` | Execute internal saved search |
| POST | `/creators/search-by-content` | Ad-hoc keyword search |
| GET | `/saved-searches/:id` | Verify saved search |
| GET | `/projects/:id` | Verify project |
| GET | `/topics/:id` | Verify topic |

## Related Commands

- `/discover-creators` - Find NEW creators via external platforms (Apify)
- `/run-pipeline` - Full discovery + review pipeline
- `/check-projects` - View project status and creator counts
