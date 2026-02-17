# /internal-discovery

Search the existing creator database across ALL projects using a saved search. This is the recommended method for cross-project creator discovery.

## Usage

```
/internal-discovery <saved-search-id> --project-id <uuid>
```

## What it does

Calls `POST /internal-discovery/execute` to search the existing creator database and link matching creators to your project.

**Key differences from external discovery:**
- **Free** - No Apify costs
- **Instant** - No waiting for external API calls
- **Existing only** - Won't find new creators not already in the system

## Parameters

- `savedSearchId` (required): UUID of the saved search (must have `isInternal: true`)
- `projectId` (required): Project to link matching creators to
- `topicId` (optional): Topic ID (defaults to saved search's topic)

## Creating an Internal Saved Search

Before using internal discovery, create a saved search with `isInternal: true`:

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

**Key:** Set `isInternal: true` to mark this as an internal search.

## Executing Internal Discovery

```bash
curl -s -X POST "$TSG_API_URL/internal-discovery/execute" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "savedSearchId": "<uuid>",
    "projectId": "<uuid>",
    "topicId": "<uuid>"
  }' | jq '.'
```

## Response

```json
{
  "discovered": 47,
  "linkedToProject": 35,
  "alreadyLinked": 12,
  "message": "Found 47 creators, linked 35 new creators to project"
}
```

**Fields:**
- `discovered`: Total creators matching the search query
- `linkedToProject`: Number of NEW creators linked to this project
- `alreadyLinked`: Creators that were already linked to this project
- `message`: Human-readable summary

## What Gets Searched

Internal discovery searches across:
- Creator `display_name` and `primary_handle`
- Creator `bio`
- **Post content** - captions, titles, descriptions in `recent_posts`

## Use Cases

| Scenario | Use Internal Discovery? |
|----------|------------------------|
| New topic for existing project | Yes - find relevant creators already in system |
| Cross-pollinate between projects | Yes - link creators from Project A to Project B |
| Fresh discovery with new sources | No - use external Apify discovery |
| Re-run on same topic | Maybe - faster but won't find new creators |

## Cost Comparison

| Method | Cost | Speed | New Creators |
|--------|------|-------|--------------|
| Internal discovery | Free | Instant | No |
| Apify discovery | ~$0.50/search | Minutes | Yes |

## Typical Workflow

1. **Create internal saved search** for new topic
2. **Execute internal discovery** to link existing creators
3. **Review results** - linked creators appear in project
4. **Supplement with external discovery** if more creators needed

## Example

```bash
# 1. Create internal saved search
curl -s -X POST "$TSG_API_URL/saved-searches" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topicId": "topic-123",
    "projectId": "project-456",
    "platform": "youtube",
    "searchQuery": "cursor vs copilot",
    "isInternal": true
  }' | jq '.id'

# Returns: "search-789"

# 2. Execute internal discovery
curl -s -X POST "$TSG_API_URL/internal-discovery/execute" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "savedSearchId": "search-789",
    "projectId": "project-456"
  }' | jq '.'

# Returns:
# {
#   "discovered": 23,
#   "linkedToProject": 18,
#   "alreadyLinked": 5,
#   "message": "Found 23 creators, linked 18 new creators to project"
# }
```

## API

```
POST /internal-discovery/execute
{
  "savedSearchId": "uuid",
  "projectId": "uuid",
  "topicId": "uuid"  // optional
}
```

## Related Skills

- [/execute-search](execute-search.md) - External Apify discovery
- [/search-by-content](search-by-content.md) - Ad-hoc keyword search
- [/create-saved-search](create-saved-search.md) - Create a new saved search
