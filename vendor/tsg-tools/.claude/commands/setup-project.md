# /setup-project

Create a new project or edit an existing one through a conversational workflow.

## Usage

```
/setup-project                      # Interactive mode - list projects and choose
/setup-project --new                # Create new project
/setup-project --edit <project-id>  # Edit existing project by ID
/setup-project --list               # List all projects with summary
```

## Arguments

- `--new` - Start creating a new project directly
- `--edit <uuid>` - Edit existing project by ID
- `--list` - List all projects with summary (same as `/check-projects`)

---

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Mode Selection                                         │
│  - List existing projects                                        │
│  - Ask: Create NEW or edit existing?                             │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────────┐
│  NEW PROJECT FLOW           │ │  EDIT PROJECT FLOW              │
│  - Name, description        │ │  - Fetch current state          │
│  - Project type             │ │  - Display topics, criteria     │
│  - Represented creator      │ │  - Offer edit options           │
│  - Initial topics           │ │  - Apply changes                │
└─────────────────────────────┘ └─────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TOPIC SETUP (both flows)                                        │
│  - Add/edit topics                                               │
│  - Set review criteria per topic                                 │
│  - Optionally add initial saved searches                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Mode Selection

### List Existing Projects

```bash
curl -s "$TSG_API_URL/projects" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

Display:
```
=== Existing Projects ===

1. Kilo Code (creator_search)
   ID: 2df4e0dc-5ab8-4d16-a1cc-0599273e473d
   Topics: 3 | Creators: 47

2. Sponsor Outreach for @techcreator (marketer_search)
   ID: 8a1b2c3d-4e5f-6789-abcd-ef0123456789
   Topics: 2 | Companies: 12
   Represented Creator: @techcreator (YouTube)

Would you like to:
[1] Create a NEW project
[2] Edit an existing project (enter number or ID)
```

---

## New Project Flow

### Step 2a: Gather Project Details

Ask the user for:

1. **Project name** (required)
2. **Description** (optional)
3. **Project type**:
   - `creator_search` (default) - Find creators to pitch for sponsorships
   - `marketer_search` - Find sponsors/marketers for a represented creator

```
What would you like to name this project?
> AI Coding Tools Creators

Description (optional, press Enter to skip):
> Finding creators who review AI coding assistants

Project type:
[1] Creator Search (find creators to pitch) - default
[2] Marketer Search (find sponsors for a creator you represent)
> 1
```

### Step 2b: For Marketer Search - Link Represented Creator

If `marketer_search` is selected, we need to link the creator we represent:

```
For Marketer Search, we need to link the creator you represent.

Do you have:
[1] An existing creator ID
[2] A profile URL (we'll create/find the creator)
> 2

Enter the creator's profile URL:
> https://youtube.com/@techreviewer

Checking database...
```

**If URL provided, create/find creator:**

```bash
# Extract platform from URL
# youtube.com → youtube
# tiktok.com → tiktok
# instagram.com → instagram
# twitter.com or x.com → twitter

curl -s -X POST "$TSG_API_URL/creators" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "profileUrl": "https://youtube.com/@techreviewer",
    "primaryPlatform": "youtube"
  }' | jq '.'
```

Response:
```json
{
  "creator": {
    "id": "creator-uuid",
    "primary_handle": "techreviewer",
    "display_name": "Tech Reviewer",
    "follower_count": 150000
  },
  "alreadyExisted": false,
  "wasMerged": false
}
```

Display:
```
✓ Found/created creator: Tech Reviewer (@techreviewer)
  Platform: YouTube | Followers: 150,000
  ID: creator-uuid

Link this creator to your project? [y/n]
```

### Step 2c: Create the Project

```bash
curl -s -X POST "$TSG_API_URL/projects" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "name": "AI Coding Tools Creators",
    "description": "Finding creators who review AI coding assistants",
    "projectType": "creator_search"
  }' | jq '.'
```

For marketer_search with represented creator:
```bash
curl -s -X POST "$TSG_API_URL/projects" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "name": "Sponsor Outreach for @techreviewer",
    "description": "Finding sponsors for Tech Reviewer",
    "projectType": "marketer_search",
    "representedCreatorId": "creator-uuid"
  }' | jq '.'
```

---

## Edit Project Flow

### Step 2a: Fetch Current State

```bash
# Get project details
curl -s "$TSG_API_URL/projects/$PROJECT_ID" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'

# Get topics for project
curl -s "$TSG_API_URL/topics?project_id=$PROJECT_ID" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

### Step 2b: Display Current State

```
=== PROJECT: AI Coding Tools Creators ===
Type: creator_search
Description: Finding creators who review AI coding assistants

TOPICS (2):

┌─────────────────────────────────────────────────────────────────┐
│ 1. AI model coding benchmarks                                   │
│    ID: ffe20ca0-5037-4fe5-9290-56471c8b982d                    │
│                                                                 │
│    Review Criteria:                                             │
│    ├── must_have: Posts video content, Posts weekly            │
│    ├── nice_to_have: Verified account                          │
│    └── exclude_if: Primarily promotional                       │
│                                                                 │
│    Saved Searches: 13 (YouTube: 3, TikTok: 4, ...)             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. Coding agent reviews                                         │
│    ID: 04dd16a3-3494-431a-a773-531f852c202c                    │
│                                                                 │
│    Review Criteria: ⚠️ NOT SET                                  │
│                                                                 │
│    Saved Searches: 8                                            │
└─────────────────────────────────────────────────────────────────┘

What would you like to do?
[1] Update project name/description
[2] Add a new topic
[3] Edit topic review criteria
[4] Add saved searches to a topic
[5] Done - exit setup
```

---

## Topic Setup

### Add a New Topic

```
Topic name:
> Cursor AI tutorials

Description (optional):
> Creators who make Cursor AI tutorial content

Creating topic...
```

```bash
curl -s -X POST "$TSG_API_URL/topics" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "projectId": "project-uuid",
    "topic": "Cursor AI tutorials",
    "description": "Creators who make Cursor AI tutorial content"
  }' | jq '.'
```

### Set Review Criteria

After creating a topic (or when editing), prompt for review criteria:

```
Now let's set review criteria for "Cursor AI tutorials".

Review criteria help the AI agent evaluate creators during review.
Format: Plain-English statements that Claude will interpret.

MUST HAVE (required - creator must meet ALL):
Enter criteria one per line, empty line when done:
> Posts video content primarily
> Posts at least weekly
> Has more than 5,000 followers
> Content is in English
>

NICE TO HAVE (bonus signals):
> Verified account
> High engagement rate (>5%)
> Makes tutorial/educational content
>

EXCLUDE IF (disqualifying - auto-skip if ANY match):
> Company or brand account
> Primarily promotional content
> Inactive (no posts in 30 days)
>

Minimum follower threshold (optional, enter number or skip):
> 5000

Saving review criteria...
```

```bash
curl -s -X PATCH "$TSG_API_URL/topics/$TOPIC_ID" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "reviewCriteria": {
      "must_have": [
        "Posts video content primarily",
        "Posts at least weekly",
        "Has more than 5,000 followers",
        "Content is in English"
      ],
      "nice_to_have": [
        "Verified account",
        "High engagement rate (>5%)",
        "Makes tutorial/educational content"
      ],
      "exclude_if": [
        "Company or brand account",
        "Primarily promotional content",
        "Inactive (no posts in 30 days)"
      ],
      "min_followers": 5000
    }
  }' | jq '.'
```

### Add Saved Searches (Optional)

```
Would you like to add initial saved searches for this topic? [y/n]
> y

Platform:
[1] YouTube
[2] TikTok
[3] Instagram
[4] Twitter
[5] Newsletter
> 1

Search query (for YouTube, use keywords like "Cursor AI tutorial"):
> Cursor AI tutorial 2025

Creating saved search...
```

```bash
curl -s -X POST "$TSG_API_URL/saved-searches" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "topicId": "topic-uuid",
    "searchQuery": "Cursor AI tutorial 2025",
    "platform": "youtube"
  }' | jq '.'
```

```
✓ Created saved search: "Cursor AI tutorial 2025" on YouTube

Add another search? [y/n]
> y

Platform: [1-5]
> 2

Search query (for TikTok, hashtags work well like #cursorai):
> #cursorai

✓ Created saved search: "#cursorai" on TikTok

Add another search? [y/n]
> n
```

---

## Review Criteria Structure

```json
{
  "must_have": [
    "Plain-English requirement - creator must meet ALL of these",
    "Posts video content primarily",
    "Has more than 5,000 followers"
  ],
  "nice_to_have": [
    "Bonus criteria - positive signals but not required",
    "Verified account",
    "High engagement rate"
  ],
  "exclude_if": [
    "Disqualifying criteria - auto-skip if ANY match",
    "Company or brand account",
    "Primarily promotional content"
  ],
  "min_followers": 5000
}
```

**Tips for writing criteria:**
- Use plain English that Claude can interpret
- Be specific but not overly rigid
- Include context when helpful (e.g., "High engagement rate (>5%)")
- Consider edge cases in your wording

---

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List all projects |
| GET | `/projects/:id` | Get project with details |
| POST | `/projects` | Create new project |
| PATCH | `/projects/:id` | Update project name/description |
| GET | `/topics?project_id=X` | List topics for project |
| GET | `/topics/:id` | Get topic with saved searches |
| POST | `/topics` | Create new topic |
| PATCH | `/topics/:id` | Update topic (including review_criteria) |
| POST | `/saved-searches` | Create saved search |
| GET | `/saved-searches?topic_id=X` | List saved searches |
| POST | `/creators` | Create/find creator from URL |

---

## Complete Example Session

```
User: /setup-project --new

Agent: Let's create a new project!

What would you like to name this project?
User: Sponsor Outreach for TechReviewer

Description (optional):
User: Finding sponsors for my YouTube channel

Project type:
[1] Creator Search (find creators to pitch)
[2] Marketer Search (find sponsors for a creator you represent)
User: 2

For Marketer Search, we need to link the creator you represent.
Enter the creator's profile URL:
User: https://youtube.com/@TechReviewer

Checking database...
✓ Created creator: TechReviewer (@TechReviewer)
  Platform: YouTube | Followers: 250,000
  ID: abc123-def456

Creating project...
✓ Project created: "Sponsor Outreach for TechReviewer"
  ID: proj-789xyz
  Type: marketer_search
  Represented Creator: @TechReviewer

Now let's add a topic. Topics help organize your discovery efforts.

Topic name:
User: Tech SaaS sponsors

Description:
User: B2B SaaS companies that sponsor tech content

Creating topic...
✓ Topic created: "Tech SaaS sponsors"

Now let's set review criteria. These help evaluate potential sponsor companies.

MUST HAVE (one per line, empty line when done):
User: Series B or later funding
User: Consumer or prosumer product
User: Active on social media
User:

NICE TO HAVE:
User: Existing influencer marketing program
User: Previous YouTube sponsorships
User:

EXCLUDE IF:
User: Direct competitor to existing sponsors
User: B2B enterprise only (no consumer presence)
User:

✓ Review criteria saved!

Would you like to add initial saved searches? [y/n]
User: y

Platform [1-5]:
User: 1

Search query:
User: #ad tech tools

✓ Created: "#ad tech tools" on YouTube

Add another? [y/n]
User: n

=== Setup Complete! ===

Project: Sponsor Outreach for TechReviewer
├── Type: marketer_search
├── Represented Creator: @TechReviewer (YouTube)
└── Topics: 1
    └── Tech SaaS sponsors (1 saved search)

Next steps:
• /identify-search-terms --project-id proj-789xyz --topic-id topic-123
• /discover-marketers --project-id proj-789xyz
```

---

## Error Handling

- **Project name already exists**: Warn user, suggest different name
- **Invalid creator URL**: Show supported platforms, ask for valid URL
- **Creator not found/enrichment failed**: Create with minimal data, warn user
- **API errors**: Display error message, suggest retry or manual setup in Chrome extension

---

## Related Commands

- `/check-projects` - View all projects and their state
- `/identify-search-terms` - Generate search terms for topics
- `/discover-creators` - Run discovery after setup
- `/discover-marketers` - Run marketer discovery (for marketer_search projects)
