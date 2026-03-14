# Check Projects Command

**Command**: `/check-projects`

**Purpose**: View a summary of all projects, topics, saved searches, and creator pipeline statuses. Use this command to understand the current state before running discovery or review workflows.

---

## Usage

```bash
/check-projects                      # List all projects with summary
/check-projects --project-id <uuid>  # Detailed view of specific project
```

---

## Workflow

### Step 1: Fetch All Projects

```bash
curl -s "$TSG_API_URL/projects" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

### Step 2: Display Project Summary

For each project, show:
- Project name and ID
- Topic count
- Total saved searches
- Creator counts by pipeline status

**Example output:**
```
=== Projects Overview ===

┌─────────────────────────────────────────────────────────────────────────────┐
│ PROJECT: Kilo Code                                                          │
│ --project-id 2df4e0dc-5ab8-4d16-a1cc-0599273e473d                          │
│                                                                             │
│ Topics: 3 | Saved Searches: 25 | Creators: 47                              │
│                                                                             │
│ Pipeline Status:                                                            │
│ ├── discovered: 12 (pending review)                                         │
│ ├── enriched: 8 (pending review)                                            │
│ ├── approved: 20                                                            │
│ ├── skipped: 5                                                              │
│ └── contacted: 2                                                            │
└─────────────────────────────────────────────────────────────────────────────┘

Select a project for details [1] or 'q' to quit:
```

### Step 3: Fetch Project Details (if selected or --project-id provided)

For the selected project, fetch:

**Topics:**
```bash
curl -s "$TSG_API_URL/topics?project_id=$PROJECT_ID" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

**Saved searches per topic:**
```bash
curl -s "$TSG_API_URL/saved-searches?topic_id=$TOPIC_ID" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

**Creator counts by status:**
```bash
curl -s "$TSG_API_URL/creators?project_id=$PROJECT_ID" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

### Step 4: Display Detailed Project View

**Example output:**
```
=== PROJECT: Kilo Code ===
--project-id 2df4e0dc-5ab8-4d16-a1cc-0599273e473d

─────────────────────────────────────────────────────────────────────────────

TOPICS (3):

┌─────────────────────────────────────────────────────────────────────────────┐
│ TOPIC: AI model coding benchmarks                                           │
│ --topic-id ffe20ca0-5037-4fe5-9290-56471c8b982d                            │
│                                                                             │
│ Saved Searches (13):                                                        │
│ ├── YouTube (3): "Claude vs GPT coding", "best AI for coding 2025", ...    │
│ │   Last run: 2 days ago                                                    │
│ ├── TikTok (4): #claudecode, #vibecoding, #cursorai, #aiagents             │
│ │   Last run: 3 days ago                                                    │
│ ├── Instagram (3): #claudecode, #vibecoding, #cursorai                      │
│ │   Last run: never                                                         │
│ └── Twitter (3): #claudecode, #vibecoding, #cursorai                        │
│     Last run: never                                                         │
│                                                                             │
│ Creators: 25 total                                                          │
│ ├── pending review: 8 (5 discovered + 3 enriched)                           │
│ ├── approved: 15                                                            │
│ └── skipped: 2                                                              │
│                                                                             │
│ Review Criteria: ✅ Set                                                      │
│ ├── must_have: Posts video content, Posts weekly, Follower count > 1000    │
│ └── exclude_if: Primarily promotional content                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TOPIC: Coding agent review                                                  │
│ --topic-id 04dd16a3-3494-431a-a773-531f852c202c                            │
│                                                                             │
│ Saved Searches (15):                                                        │
│ ├── YouTube (3): Last run: 5 days ago                                       │
│ ├── TikTok (4): Last run: 1 day ago                                         │
│ ├── Instagram (4): Last run: never                                          │
│ └── Twitter (4): Last run: never                                            │
│                                                                             │
│ Creators: 18 total                                                          │
│ ├── pending review: 8                                                       │
│ ├── approved: 10                                                            │
│ └── skipped: 0                                                              │
│                                                                             │
│ Review Criteria: ✅ Set                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TOPIC: Kilo mentions                                                        │
│ --topic-id 4e960cca-2b0b-45ab-8cf6-5e05ee160170                            │
│                                                                             │
│ Saved Searches (8):                                                         │
│ ├── YouTube (4): Last run: never                                            │
│ ├── TikTok (1): Last run: never                                             │
│ ├── Instagram (1): Last run: never                                          │
│ └── Twitter (2): Last run: never                                            │
│                                                                             │
│ Creators: 4 total                                                           │
│ ├── pending review: 4                                                       │
│ └── approved: 0                                                             │
│                                                                             │
│ Review Criteria: ⚠️  NOT SET - Add before running /review-creators          │
└─────────────────────────────────────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────────────────────

SUMMARY:
• Total topics: 3
• Total saved searches: 36 (12 never run, 24 run in last 7 days)
• Total creators: 47 (15 approved, 8 skipped, 24 pending review)

SUGGESTED NEXT STEPS:
1. Run discovery for "Kilo mentions" (8 searches never executed)
2. Review 8 pending creators in "Coding agent review"
3. Review 8 pending creators in "AI model coding benchmarks"
4. Set review criteria for "Kilo mentions" before reviewing

─────────────────────────────────────────────────────────────────────────────

COPY-PASTE COMMANDS:

# Discover creators (runs searches not executed in last 3 days):
/discover-creators --project-id 2df4e0dc-5ab8-4d16-a1cc-0599273e473d --topic-id 4e960cca-2b0b-45ab-8cf6-5e05ee160170

# Review pending creators:
/review-creators --project-id 2df4e0dc-5ab8-4d16-a1cc-0599273e473d --topic-id 04dd16a3-3494-431a-a773-531f852c202c

# Identify new search terms:
/identify-search-terms --project-id 2df4e0dc-5ab8-4d16-a1cc-0599273e473d --topic-id ffe20ca0-5037-4fe5-9290-56471c8b982d
```

---

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List all projects |
| GET | `/topics?project_id=X` | List topics for a project |
| GET | `/saved-searches?topic_id=X` | List saved searches for a topic |
| GET | `/creators?project_id=X` | List creators for a project |
| GET | `/creators?topic_id=X` | List creators for a topic |

---

## Implementation Notes

### Fetching Creator Counts by Status

The `/creators` endpoint returns paginated results. To get counts by status efficiently:

```bash
# Get all creators for project with status counts
curl -s "$TSG_API_URL/creators?project_id=$PROJECT_ID&limit=1000" \
  -H "X-API-Key: $TSG_API_KEY" | jq '
  .creators | group_by(.pipeline_status) |
  map({status: .[0].pipeline_status, count: length})
'
```

Or for a specific topic:
```bash
curl -s "$TSG_API_URL/creators?topic_id=$TOPIC_ID&limit=1000" \
  -H "X-API-Key: $TSG_API_KEY" | jq '
  .creators | group_by(.pipeline_status) |
  map({status: .[0].pipeline_status, count: length})
'
```

### Grouping Saved Searches by Platform

```bash
curl -s "$TSG_API_URL/saved-searches?topic_id=$TOPIC_ID" \
  -H "X-API-Key: $TSG_API_KEY" | jq '
  .saved_searches | group_by(.platform) |
  map({platform: .[0].platform, count: length, queries: [.[].search_query]})
'
```

---

## Shell Script Helper

For quick project status checks, you can use this script:

```bash
#!/bin/bash
# check-projects.sh - Quick project status

API_URL="${TSG_API_URL:-https://tsg-extension-backend-pink.vercel.app}"
API_KEY="${TSG_API_KEY:-your-api-key}"

echo "=== Projects Overview ==="
echo ""

# Fetch all projects
PROJECTS=$(curl -s "$API_URL/projects" -H "X-API-Key: $API_KEY")

echo "$PROJECTS" | jq -r '.projects[] | "Project: \(.name)\n  ID: \(.id)\n"'

# For each project, get topic count
for PROJECT_ID in $(echo "$PROJECTS" | jq -r '.projects[].id'); do
  PROJECT_NAME=$(echo "$PROJECTS" | jq -r ".projects[] | select(.id==\"$PROJECT_ID\") | .name")

  # Get topics
  TOPICS=$(curl -s "$API_URL/topics?project_id=$PROJECT_ID" -H "X-API-Key: $API_KEY")
  TOPIC_COUNT=$(echo "$TOPICS" | jq '.topics | length')

  # Get creator counts
  CREATORS=$(curl -s "$API_URL/creators?project_id=$PROJECT_ID&limit=1000" -H "X-API-Key: $API_KEY")
  CREATOR_COUNT=$(echo "$CREATORS" | jq '.creators | length')
  APPROVED=$(echo "$CREATORS" | jq '[.creators[] | select(.pipeline_status=="approved")] | length')
  DISCOVERED=$(echo "$CREATORS" | jq '[.creators[] | select(.pipeline_status=="discovered")] | length')

  echo "─────────────────────────────────────────"
  echo "$PROJECT_NAME"
  echo "  Topics: $TOPIC_COUNT"
  echo "  Creators: $CREATOR_COUNT total ($APPROVED approved, $DISCOVERED pending)"
  echo ""
done
```

---

## Error Handling

- **No projects found**: Display message suggesting to create a project via the Chrome extension
- **API unreachable**: Check TSG_API_URL and network connectivity
- **Auth failed**: Verify TSG_API_KEY is correct

---

## Related Commands

After checking project status:
- `/identify-search-terms` - Add/improve search terms for a topic
- `/discover-creators` - Run discovery for a topic
- `/review-creators` - Review discovered creators
