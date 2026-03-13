# Content Item Skills

Track deliverables (blog posts, videos, social posts) from creator deals and monitor their performance.

## Available Skills

| Skill | Description |
|-------|-------------|
| [/list-content-items](#list-content-items) | List content items with filters |
| [/get-content-item](#get-content-item) | Get content item details |
| [/create-content-item](#create-content-item) | Create a new content item |
| [/update-content-item](#update-content-item) | Update content item fields |
| [/parse-proposal](#parse-proposal) | Parse creator proposal text via AI |
| [/content-summary](#content-summary) | Get spend/count summary |
| [/add-link](#add-link) | Add published URL to content item |
| [/refresh-analytics](#refresh-analytics) | Refresh link analytics |

## Quick Reference

### List content items
```bash
curl -s "$TSG_API_URL/content-items?project_id=<uuid>" \
  -H "X-API-Key: $TSG_API_KEY"
```

### Get spend summary
```bash
curl -s "$TSG_API_URL/content-items/summary?project_id=<uuid>" \
  -H "X-API-Key: $TSG_API_KEY"
```

---

## Skill Details

### /list-content-items

List content items with optional filters.

**Endpoint:** `GET /content-items`

```bash
curl -s "$TSG_API_URL/content-items?project_id=<uuid>&status=published&limit=20" \
  -H "X-API-Key: $TSG_API_KEY"
```

**Query parameters:**
- `project_id` - Filter by project
- `topic_id` - Filter by topic
- `creator_id` - Filter by creator
- `company_id` - Filter by company
- `status` - Filter by status (proposed, planned, in_progress, published, cancelled)
- `platform` - Filter by platform
- `search` - Text search
- `creator_search` - Search by creator name
- `limit` / `offset` - Pagination

---

### /get-content-item

Get full details for a content item including creator, project, and links.

**Endpoint:** `GET /content-items/:id`

```bash
curl -s "$TSG_API_URL/content-items/<id>" \
  -H "X-API-Key: $TSG_API_KEY"
```

---

### /create-content-item

Create a new content item (deliverable from a creator deal).

**Endpoint:** `POST /content-items`

```bash
curl -s -X POST "$TSG_API_URL/content-items" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "uuid",
    "creatorId": "uuid",
    "name": "AI Coding Tutorial Video",
    "format": "video",
    "platforms": ["youtube"],
    "cost": 5000,
    "status": "planned",
    "launchDate": "2024-03-01"
  }'
```

**Request body:**
- `projectId` (required): Project UUID
- `creatorId` (required): Creator UUID
- `name` (required): Content item name
- `format` (required): Content format (video, blog, social_post, etc.)
- `topicId` - Topic UUID
- `description` - Description
- `platforms` - Array of platforms
- `cost` - Cost in dollars
- `targetCpm` / `targetImpressions` - Performance targets
- `sowLink` - Statement of work link
- `launchDate` - Target publish date
- `status` - Initial status (default: proposed)
- `postQuantity` - Number of posts
- `proposalSource` / `proposalRawText` - Source proposal data

---

### /update-content-item

Update fields of a content item.

**Endpoint:** `PATCH /content-items/:id`

```bash
curl -s -X PATCH "$TSG_API_URL/content-items/<id>" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "published",
    "publishedUrl": "https://youtube.com/watch?v=...",
    "actualViews": 150000
  }'
```

---

### /parse-proposal

Parse a creator's proposal text using AI to extract content items.

**Endpoint:** `POST /content-items/parse-proposal`

```bash
curl -s -X POST "$TSG_API_URL/content-items/parse-proposal" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "rawText": "I can do 2 YouTube videos at $3k each and 3 TikToks at $500 each...",
    "creatorId": "uuid"
  }'
```

Returns parsed content items (not saved — review and create individually).

---

### /content-summary

Get aggregated spend and count summary by status.

**Endpoint:** `GET /content-items/summary`

```bash
curl -s "$TSG_API_URL/content-items/summary?project_id=<uuid>" \
  -H "X-API-Key: $TSG_API_KEY"
```

---

### /add-link

Add a published URL to a content item. Auto-detects platform from URL.

**Endpoint:** `POST /content-items/:id/links`

```bash
curl -s -X POST "$TSG_API_URL/content-items/<id>/links" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://youtube.com/watch?v=abc123",
    "title": "AI Coding Tutorial"
  }'
```

Automatically triggers analytics refresh for supported platforms (YouTube, TikTok, Instagram).

---

### /refresh-analytics

Refresh performance analytics for published content links.

**Single link:**
```bash
curl -s -X POST "$TSG_API_URL/content-items/<id>/links/<linkId>/refresh-analytics" \
  -H "X-API-Key: $TSG_API_KEY"
```

**Batch refresh (all eligible links in a project):**
```bash
curl -s -X POST "$TSG_API_URL/content-items/batch-refresh-analytics" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "uuid"}'
```

Supported platforms: YouTube, TikTok, Instagram. Rate limited to once per hour per link.

---

## Content Item Statuses

| Status | Description |
|--------|-------------|
| `proposed` | Initial proposal from creator |
| `planned` | Deal agreed, awaiting execution |
| `in_progress` | Content being created |
| `published` | Content live |
| `cancelled` | Deal cancelled |

## Related

- Reports: `/content-report` command for market intelligence
- Creators: `/get-creator` for creator details
- Projects: `/list-projects` for project management
