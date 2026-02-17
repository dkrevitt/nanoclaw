# TSG Creator Discovery Agent

AI-powered creator review and enrichment workflows for the TSG Creator Sourcing platform.

## Overview

This agent assists with evaluating discovered creators against review criteria and submitting reviews via API. The backend handles automated discovery, deduplication, and preliminary enrichment (Tier 2). This agent handles intelligent review and decision-making (steps 4-6).

## CRITICAL: API-Only Access

⛔ **NEVER write scripts that directly access Supabase**

All database operations MUST go through the backend API. Direct database access bypasses critical orchestration:

| Endpoint | What it orchestrates |
|----------|---------------------|
| `POST /creators/:id/review` (approved) | Triggers Tier 3 enrichment, creates project status |
| `POST /apify/execute-search` | Deduplication, creates pending_review records, Tier 2 enrichment |
| `POST /creators/batch-enrich` | Rate limiting, error handling, status tracking |

✅ **ALWAYS use:**
- `npx tsx src/utils/api.ts <command>` for CLI operations
- Import functions from `src/utils/api.ts` for TypeScript

❌ **NEVER do:**
- `import { createClient } from '@supabase/supabase-js'`
- Direct `supabase.from('table').insert/update/delete` calls
- Writing custom scripts in `tsg-extension-backend/scripts/`

## Architecture

### Unified Schema
Discoveries write directly to the `creators` table. There is no separate `creator_discoveries` table.

### Status Tracking (Multiple Systems)

**Important**: There are MULTIPLE status fields tracking different aspects of creators and companies:

| Table | Field | Purpose |
|-------|-------|---------|
| `creators` | `tier2_status`, `tier3_status`, `email_enrichment_status` | Enrichment completion |
| `creator_project_statuses` | `contact_status` | Review + outreach progress per project (creators) |
| `company_project_status` | `contact_status` | Outreach progress per project (companies) |
| `content_items` | `status` | Deal/deliverable progress |

**Key change:** Reviews are now project-level via `creator_project_statuses.contact_status`, not topic-level via the deprecated `creator_reviews` table.

**For marketer_search projects:** Companies discovered via `/discover-marketers` are linked to projects via `company_project_status`. Unlike creators, companies don't go through an AI review step—being discovered as a sponsor of relevant content is the qualification signal. The `contact_status` field tracks outreach progress only.

See "Creator Lifecycle & Status Fields" section below for full details.

### Automated Backend Workflows

Discovery now auto-chains to review via `POST /workflows/start-combined`:

1. **Discovery** - Execute searches, create entries in `creators` table
   - YouTube, TikTok, Instagram, Twitter → Apify actors
   - Newsletter/Substack (Substack, Beehiiv, Ghost, ConvertKit, Buttondown) → Tavily web search + LLM filtering
2. **Deduplication** - Merge duplicates, preserve `saved_search_ids[]` relationships
3. **Tier 2 Enrichment** - Enrich with follower counts, recent posts, engagement metrics
   - For newsletters: Extract social handles from page HTML for Tier 3 enrichment
4. **AI Review** - Evaluate creators against review criteria using Claude
5. **Tier 3 Enrichment** - Full cross-platform enrichment (auto-triggered on approval)

**Key change:** Reviews are now part of the automated pipeline via `/run-pipeline` command and `POST /workflows/start-combined`. Results are written to `creator_project_statuses.contact_status`.

### Standalone Workflows

Individual workflows can still be run separately:
- `POST /workflows/start` with `agentType: "discovery"` - Discovery only
- `POST /workflows/review` - AI review on existing creators
- `/discover-creators` command - Legacy discovery without auto-review

## Prerequisites

### 1. API Access Configuration

Set these environment variables for Claude Code to access the backend:

```bash
# Production backend URL
export TSG_API_URL="https://tsg-extension-backend-pink.vercel.app"

# API key (create via Chrome extension → 🔑 button → New Key)
export TSG_API_KEY="your-api-key-here"
```

Or add to `claude-agents/.env`:
```
TSG_API_URL=https://tsg-extension-backend-pink.vercel.app
TSG_API_KEY=your-api-key-here
```

**Note:** For local development, you can run the backend locally:
```bash
cd tsg-extension-backend
npm run dev  # Runs on http://localhost:3000
```
Then set `TSG_API_URL=http://localhost:3000`

### 2. Making API Calls

**REQUIRED: Use the `api.ts` utility** for all API calls. This handles authentication, error handling, and avoids shell escaping issues.

**CLI Usage:**
```bash
# Set environment variables first
export TSG_API_URL="https://tsg-extension-backend-pink.vercel.app"
export TSG_API_KEY="tsg_sk_your_key_here"

# List projects
npx tsx src/utils/api.ts projects

# List topics for a project
npx tsx src/utils/api.ts topics <project-id>

# Get topic details with saved searches
npx tsx src/utils/api.ts topic <topic-id>

# List creators with filters
npx tsx src/utils/api.ts creators --topic-id <id> --status pending_review --limit 20

# Execute a saved search
npx tsx src/utils/api.ts execute-search <search-id>

# Submit a review
npx tsx src/utils/api.ts review <creator-id> \
  --project-id <id> --topic-id <id> \
  --action approved --feedback "Great fit for AI content"
```

**TypeScript Import (for custom scripts):**
```typescript
import {
  getProjects,
  getTopics,
  getTopic,
  getCreators,
  executeSearch,
  submitReview,
} from './utils/api.js';

// All functions return ApiResponse<T> with { success, data?, error? }
const result = await getCreators({ topicId: 'xxx', pipelineStatus: 'pending_review' });
if (result.success) {
  console.log(result.data.creators);
}
```

**Available API Functions:**
- `getProjects()` / `getProject(id)`
- `getTopics(projectId)` / `getTopic(id)`
- `getSavedSearches(topicId)`
- `getCreators(options)` / `getCreator(id)`
- `searchCreatorsByContent(keywords, options)`
- `executeSearch(searchId)` / `testSearch(searchId)`
- `submitReview(options)`
- `enrichCreator(id, tier)` / `batchEnrichCreators(ids, tier)`
- `createSavedSearch(options)` / `deleteSavedSearch(id)`

**Alternative: Raw curl** (use only when api.ts doesn't cover the endpoint):
```bash
curl -s "$TSG_API_URL/endpoint" -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

**For complex curl requests, use a shell script:**
```bash
#!/bin/bash
API_URL="https://tsg-extension-backend-pink.vercel.app"
API_KEY="tsg_sk_your_key_here"

curl -s -X POST "$API_URL/creators/$CREATOR_ID/review" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"topicId\": \"$TOPIC_ID\",
    \"action\": \"approved\",
    \"reviewFeedback\": \"Great fit - posts weekly AI tutorials\"
  }" | jq '.'
```

**Common endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Check API status |
| GET | `/projects` | List all projects |
| GET | `/topics?project_id=X` | List topics for project |
| GET | `/saved-searches?topic_id=X` | List saved searches |
| GET | `/creators?pipeline_status=X` | List creators by status |
| POST | `/saved-searches` | Create saved search |
| POST | `/apify/execute-search` | Run discovery search |
| POST | `/creators/:id/review` | Submit creator review |

### 3. Database Migration Applied
Run in Supabase SQL Editor:
```sql
-- Apply migration from:
-- tsg-extension-backend/src/db/migrations/001_deduplication_and_review.sql
```

### 4. Review Criteria Set
Update `projects.review_criteria` in Supabase Dashboard:

```sql
UPDATE projects
SET review_criteria = '{
  "must_have": [
    "Posts video content primarily",
    "Posts at least weekly",
    "Follower count > 10,000"
  ],
  "nice_to_have": [
    "Verified account",
    "Engagement rate > 5%"
  ],
  "exclude_if": [
    "Primarily promotional content",
    "Posts inconsistently (less than monthly)"
  ]
}'::jsonb
WHERE id = 'your-project-id';
```

**Note:** Review criteria is now project-level (not topic-level). All topics within a project share the same review criteria.

## Available Commands

### `/search-database`

Search the existing creator database across all projects to find matches for your topic. This is FREE and instant - no Apify costs.

**Usage:**
```
# Mode A: Internal saved search (requires is_internal=true saved search)
/search-database --saved-search-id <uuid> --project-id <uuid>

# Mode B: Ad-hoc keyword search
/search-database --keywords "claude, cursor" --project-id <uuid> --topic-id <uuid>
```

**Options:**
- `--platform <name>` - Filter by platform (youtube, tiktok, etc.)
- `--min-followers <n>` - Minimum follower count
- `--limit <n>` - Max results (default: 50)
- `--dry-run` - Preview matches without linking

**What it does:**
1. Searches the existing database (creators from all projects)
2. Matches by profile name, bio, and post content
3. Links matching creators to your project via `creator_project_statuses`

**When to use:**
- New topic for existing project - find relevant creators already in system
- Cross-pollinate between projects - link creators from Project A to Project B
- Quick exploratory search before running expensive external discovery

**Cost comparison:**
| Method | Cost | Speed | Finds New Creators? |
|--------|------|-------|---------------------|
| `/search-database` | Free | Instant | No (existing only) |
| `/discover-creators` | ~$0.50/search | Minutes | Yes |

See `commands/search-database.md` for detailed workflow.

### `/check-projects`

View a summary of all projects, topics, saved searches, and creator pipeline statuses. Use this as a starting point to understand current state before running other workflows.

**Usage:**
```
/check-projects                      # List all projects with summary
/check-projects --project-id <uuid>  # Detailed view of specific project
```

**What it shows:**
1. All projects with topic counts and creator totals
2. For each topic: saved searches grouped by platform
3. Creator counts by pipeline status (discovered, enriched, approved, skipped)
4. Review criteria status (warns if missing)
5. Suggested next steps and ready-to-copy commands

**Example:**
```
=== Project: Kilo Code ===
Topics: 3 | Saved Searches: 36 | Creators: 47

Topic 1: AI model coding benchmarks
├── Saved Searches: YouTube (3), TikTok (4), Instagram (3), Twitter (3)
├── Creators: 25 (15 approved, 5 discovered, 3 enriched, 2 skipped)
└── Review criteria: ✅ Set

Topic 2: Kilo mentions
├── Saved Searches: YouTube (4), TikTok (1), Instagram (1), Twitter (2)
├── Creators: 4 (0 approved, 4 discovered)
└── Review criteria: ⚠️ Missing
```

See `commands/check-projects.md` for detailed workflow.

### `/discover-creators` (Legacy)

Executes discovery workflow without auto-review. **Prefer `/run-pipeline`** for full automation.

**Usage:**
```
/discover-creators --project-id <uuid> --topic-id <uuid>
/discover-creators --project-id <uuid>                              # All topics in project
/discover-creators --project-id <uuid> --skip-recent-days 7         # Skip searches run in last 7 days
/discover-creators --project-id <uuid> --force                      # Force re-run all searches
```

**What it does:**
1. Fetches saved searches for the topic(s)
2. Filters out recently executed searches (unless `--force`)
3. Executes remaining searches via `POST /apify/execute-search`
4. Backend handles deduplication and Tier 2 enrichment
5. Does NOT auto-chain to review (use `/run-pipeline` for that)

See `commands/discover-creators.md` for detailed workflow.

### `/identify-search-terms`

Identifies optimal search terms for a project and topic by running test searches and evaluating result quality. Execute this BEFORE `/discover-creators` to ensure high-quality discovery results.

**Usage:**
```
/identify-search-terms --project-id <uuid> --topic-id <uuid>
/identify-search-terms --project-id <uuid> --topic-id <uuid> --platforms youtube,tiktok
/identify-search-terms --project-id <uuid> --topic-id <uuid> --auto-create
```

**What it does:**
1. Fetches project and topic review criteria to understand target creator profile
2. Generates 10-15 candidate search terms based on:
   - Topic description and review criteria
   - Platform-specific conventions (hashtags, keywords)
   - Content type signals (comparisons, reviews, tutorials)
3. Runs test searches for each candidate term (limited to 10 results)
4. Evaluates result quality using:
   - Relevance score (0-10): Profile metadata match to topic
   - Precision estimate (%): Likely match percentage
   - Diversity score (0-10): Variety of accounts
   - Sample size: Results count (sweet spot: 10-50)
5. Ranks search terms by quality score (precision × 0.4 + relevance × 0.3 + diversity × 0.2 + volume × 0.1)
6. Recommends top search terms and creates saved searches

**Example output:**
```
TOP TIER (Precision ≥ 70%, Relevance ≥ 7):
1. "AI coding agent comparison" (YouTube)
   - Score: 8.9/10 | Precision: 85% | Results: 23

SKIP (Precision < 50%):
5. #claudepartner (TikTok)
   - Score: 3.2/10 | Precision: 20% | Results: 48
   - Why: Campus ambassadors and travel creators, NOT technical content
```

See `commands/identify-search-terms.md` for detailed workflow.

### `/run-pipeline`

Orchestrates a full creator discovery pipeline: Discovery → Review. This is the primary command for automated creator sourcing.

**Usage:**
```
/run-pipeline --project-id <uuid> --topic-id <uuid>
/run-pipeline --project-id <uuid> --topic-id <uuid> --saved-search-ids <id1,id2>
/run-pipeline --project-id <uuid> --topic-id <uuid> --skip-discovery  # Review-only mode
/run-pipeline --project-id <uuid> --topic-id <uuid> --dry-run
```

**What it does:**
1. Validates project, topic, and saved searches
2. Creates a pipeline via `POST /workflows/start-combined`
3. Executes discovery (Apify searches with auto-deduplication and Tier 2 enrichment)
4. Auto-chains to AI review (evaluates against review criteria)
5. Updates `creator_project_statuses` with review results
6. Tier 3 enrichment auto-triggered for approved creators

**Review-only mode:** Use `--skip-discovery` to run AI review on existing creators without new discovery.

See `commands/run-pipeline.md` for detailed workflow.

### `/draft-emails`

Creates personalized email drafts for approved creators using AI-generated or template-based emails via the backend API.

**Prerequisites:**
1. Gmail account connected to project (via Chrome extension → Project Settings)
2. Pitch angles set on the project (via extension Edit Project)
3. Approved creators with email addresses

**Usage:**
```
/draft-emails --project-id <uuid> --topic-id <uuid>
/draft-emails --project-id <uuid> --topic-id <uuid> --limit 10
/draft-emails --project-id <uuid> --topic-id <uuid> --dry-run
```

**Options:**
- `--angle <id>` - Use specific pitch angle (default: auto-select best fit)
- `--limit <n>` - Max creators to draft for
- `--dry-run` - Preview emails without creating drafts
- `--mode dynamic|static` - Generation mode (dynamic=AI personalization, static=template)

**What it does:**
1. Fetches pitch angles from project settings
2. Fetches approved creators with emails for the topic
3. For each creator: generates email via `POST /outreach/generate`
4. Creates Gmail drafts via `POST /outreach/create-draft`

**Alternative:** For bulk email drafting, use email campaigns via Chrome extension.

See `commands/draft-emails.md` for detailed workflow.

### `/content-report`

Generates a market intelligence report summarizing recent content from creators matched to a project. Use this to track what top creators are doing, identify trends, and spot sponsorship opportunities.

**Usage:**
```
/content-report --project-id <uuid>                    # Analyze last 30 days
/content-report --project-id <uuid> --days 14          # Custom time window
/content-report --project-id <uuid> --refresh          # Refresh posts first
/content-report --project-id <uuid> --dry-run          # Preview analysis
```

**What it analyzes:**
1. High-performing posts (above-average engagement for each creator)
2. Sponsorship activity (brands detected via #ad, #sponsored, partnership signals)
3. Trending topics and hashtags (frequency across creators)
4. Platform distribution (content mix across YouTube, TikTok, etc.)

**Output:**
- Full report saved to `projects/{project-name}/reports/content-report-{date}.md`
- Terminal shows summary with top posts, trending topics, sponsor activity

**Cost:**
- Without `--refresh`: Free (uses existing post data)
- With `--refresh`: ~$2-5 for 50 creators across 2 platforms

See `commands/content-report.md` for detailed workflow.

### Sponsor Discovery (3 Paths)

Three ways to discover sponsor companies for marketer_search projects. All produce the same output: companies + marketers stored in `companies.sponsored_content` JSONB.

| Path | Command | Best For |
|------|---------|----------|
| Post Search | `/discover-marketers --mode search_posts` | Finding sponsors actively advertising on social media |
| Creator Analysis | `/discover-marketers --mode analyze_creators` | Analyzing brands your existing creators work with |
| AI Ideation | `/ideate-companies` | New projects, creative ideation, generating targets |

### `/discover-marketers`

Discovers marketers at companies that sponsor creators. Searches posts for sponsored content, resolves brands to companies via Apollo, and finds marketing contacts.

**Modes:**
- `search_posts` (default): Direct post search via Apify. Best for marketer_search projects.
- `analyze_creators`: Analyze existing creators' stored posts for brand mentions.

**Usage:**
```
/discover-marketers --project-id <uuid>                              # search_posts mode (default)
/discover-marketers --project-id <uuid> --mode analyze_creators --creator-ids <id1,id2,id3>
/discover-marketers --project-id <uuid> --skip-ai-analysis           # Deterministic only (free)
/discover-marketers --project-id <uuid> --skip-marketer-discovery    # Brands only (no people search)
```

**Cost:**
- Brand extraction (AI): ~$0.001/post
- Company enrichment: 1 Apollo credit/company
- Marketer search: 1 Apollo credit/search

See `commands/discover-marketers.md` for detailed workflow.

### `/ideate-companies`

Uses AI research to identify target companies that would be good sponsors for the represented creator in a marketer_search project.

**What it does:**
1. Uses project context (represented creator, review criteria, existing sponsors)
2. AI researches potential target companies based on niche fit
3. Creates/enriches company records via Apollo
4. Finds marketers at each company
5. Generates branded search terms for post search

**Usage:**
```
/ideate-companies --project-id <uuid>
/ideate-companies --project-id <uuid> --max-companies 30
/ideate-companies --project-id <uuid> --skip-marketer-discovery      # Companies only
/ideate-companies --project-id <uuid> --skip-search-term-generation  # No saved searches
```

**Prerequisites:**
- Project must be `marketer_search` type
- Recommended: Link a represented creator to the project
- Recommended: Set `company_review_criteria` on topics

**Cost:**
- AI research (Claude): ~$0.01-0.05 per run
- Company enrichment: 1 Apollo credit/company
- Marketer search: 1 Apollo credit/search

See `commands/ideate-companies.md` for detailed workflow.

## Available Skills

Skills provide quick access to individual backend operations. Unlike commands (which orchestrate full workflows), skills perform single API operations for ad-hoc use.

Skills are organized by category, with master files linking to detailed skill documentation:

| Category | Master File | Skills |
|----------|-------------|--------|
| Workflows & Pipelines | [workflows.md](skills/workflows.md) | start-workflow, start-pipeline, workflow-status, pipeline-status, workflow-logs, workflow-records, cancel-workflow |
| Discovery & Search | [discovery.md](skills/discovery.md) | execute-search, test-search, create-saved-search, list-saved-searches, internal-discovery |
| Creator Management | [creators.md](skills/creators.md) | list-creators, get-creator, search-by-content, create-creator, link-creator-to-project, update-creator-status |
| Company Management | [companies.md](skills/companies.md) | list-companies, get-company, create-company, link-company-to-project, update-company-status |
| Marketer Management | [marketers.md](skills/marketers.md) | list-marketers, get-marketer, create-marketer, link-marketer-to-project, enrich-marketer-email |
| Enrichment | [enrichment.md](skills/enrichment.md) | enrich-creator, batch-enrich, refresh-posts, search-cross-platform, extended-posts |
| Email & Outreach | [outreach.md](skills/outreach.md) | generate-email, create-draft, create-campaign, list-campaigns, campaign-status |
| Reports & Analytics | [reports.md](skills/reports.md) | content-report |
| Integrations | [integrations.md](skills/integrations.md) | sync-sheets, gmail-accounts |
| Projects & Topics | [projects.md](skills/projects.md) | list-projects, create-project, update-project, get-topic, create-topic, update-topic |

**Structure:**
```
skills/
├── workflows.md           # Master: Workflows & Pipelines
├── discovery.md           # Master: Discovery & Search
├── discovery/
│   ├── execute-search.md
│   ├── test-search.md
│   ├── create-saved-search.md
│   └── list-saved-searches.md
├── creators.md            # Master: Creator Management
├── creators/
│   ├── list-creators.md
│   ├── get-creator.md
│   ├── search-by-content.md
│   ├── create-creator.md
│   ├── link-creator-to-project.md
│   └── update-creator-status.md
├── companies.md           # Master: Company Management
├── companies/
│   ├── list-companies.md
│   ├── get-company.md
│   ├── create-company.md
│   ├── link-company-to-project.md
│   └── update-company-status.md
├── marketers.md           # Master: Marketer Management
├── marketers/
│   ├── list-marketers.md
│   ├── get-marketer.md
│   ├── create-marketer.md
│   ├── link-marketer-to-project.md
│   └── enrich-marketer-email.md
├── enrichment.md          # Master: Enrichment
├── enrichment/
│   ├── enrich-creator.md
│   └── batch-enrich.md
├── outreach.md            # Master: Email & Outreach
├── outreach/
│   ├── generate-email.md
│   ├── create-draft.md
│   ├── create-campaign.md
│   ├── list-campaigns.md
│   └── campaign-status.md
├── reports.md             # Master: Reports & Analytics
├── integrations.md        # Master: Integrations
├── integrations/
│   ├── sync-sheets.md
│   └── gmail-accounts.md
├── projects.md            # Master: Projects & Topics
└── projects/
    ├── list-projects.md
    ├── create-project.md
    ├── update-project.md
    ├── get-topic.md
    ├── create-topic.md
    └── update-topic.md
```

See master files for quick reference and typical workflows, or individual skill files for full API details.

## API Endpoints Reference

### Workflow & Pipeline Endpoints
```
# Workflows
POST  /workflows/start                    # Start single workflow (discovery, review, search_term_gen)
POST  /workflows/start-combined           # Start discovery+review pipeline
POST  /workflows/review                   # Run AI review on existing creators
GET   /workflows/active?project_id=X      # Get running executions for project
GET   /workflows?project_id=X             # List all executions
GET   /workflows/:id                      # Get execution details
GET   /workflows/:id/status               # Polling endpoint (progress, currentItem)
GET   /workflows/:id/logs                 # Step-by-step execution logs
GET   /workflows/:id/records              # Get created records
POST  /workflows/:id/cancel               # Cancel running workflow

# Pipelines
GET   /pipelines?project_id=X             # List pipelines
GET   /pipelines/:id                      # Get pipeline with linked executions
GET   /pipelines/:id/status               # Pipeline status with step progress
POST  /pipelines                          # Create new pipeline
PATCH /pipelines/:id                      # Update pipeline
POST  /pipelines/:id/cancel               # Cancel pipeline
```

### Internal Discovery
```
POST  /internal-discovery/execute         # Search existing database across all projects
```

### Creator Endpoints (Primary)
```
GET  /creators?pipeline_status=<status>&topic_id=<id>&limit=<n>
GET  /creators/:id                        # Get creator with enrichment data
POST /creators/:id/enrich                 # Tier 2 enrichment
POST /creators/batch-enrich               # Batch Tier 2 enrichment
POST /creators/:id/refresh-posts          # Refresh recent posts (cheap)
POST /creators/batch-refresh-posts        # Batch refresh posts
POST /creators/search-cross-platform      # Find creator on other platforms
GET  /creators/:id/posts-across-platforms # Extended post history
```

### Company & Marketer Endpoints (for marketer_search projects)

Companies and marketers are discovered via `/discover-marketers` workflow. They are **global** (not siloed per project) and linked to projects via junction tables.

**Sponsored Content Storage:** Sponsored content is stored as JSONB in `companies.sponsored_content` (similar to `creators.recent_posts`). This replaces the old `creator_brand_deals` table.

```
# Companies
GET  /companies                           # List companies (with filters)
GET  /companies?project_id=X&contact_status=Y  # Filter by project + outreach status
GET  /companies/:id                       # Get company with marketers and sponsored_content
GET  /companies/:id/sponsorships          # Get sponsored content with computed summary
POST /companies                           # Create/enrich company by domain
POST /companies/:id/enrich                # Refresh company data from Apollo
POST /companies/:id/find-marketers        # Find marketers at company via Apollo

# Company Project Status (outreach tracking)
GET  /companies/:id/project-statuses      # All project statuses for a company
GET  /companies/:id/project-status/:projectId   # Status for specific project
PUT  /companies/:id/project-status/:projectId   # Update contact_status
     Body: { "contactStatus": "drafted" }

# Project-Company Links
GET  /projects/:id/companies              # List companies linked to project
POST /projects/:id/companies              # Link company to project
     Body: { "companyId": "uuid" }
DELETE /projects/:id/companies/:companyId # Unlink company from project

# Marketers
GET  /marketers                           # List marketers (with filters)
GET  /marketers/:id                       # Get marketer with company info
GET  /companies/:id/marketers             # List marketers at a company
POST /marketers/:id/enrich-email          # Find email via Apollo

# Sponsored Content (stored in companies.sponsored_content JSONB)
GET  /brand-deals                         # List sponsored content across all companies
GET  /brand-deals/by-company              # Companies sorted by sponsored content count
GET  /brand-deals/by-creator              # Creators sorted by sponsored content appearances
POST /brand-deals                         # Add sponsored content to a company
```

**Contact status values** (same as creators):
`not_contacted` → `drafted` → `contacted` → `in_progress` → `closed_won` / `closed_lost`

### Review Submission (via Workflows)

**Preferred method:** Use `POST /workflows/start-combined` or `POST /workflows/review` for automated AI review.

**Legacy endpoint** (still functional for manual reviews):
```json
POST /creators/:id/review
{
  "action": "approved",  // or "skipped"
  "reviewFeedback": "Great fit - posts weekly AI tutorials with 50k+ followers",
  "projectId": "proj-uuid",
  "topicId": "topic-uuid"
}
```

**Note:** Reviews now update `creator_project_statuses.contact_status` instead of the deprecated `creator_reviews` table.

### Legacy Discovery Endpoints
```
GET  /discoveries?...                     # Still used for ambient discovery
POST /discoveries/batch-ambient           # Create discoveries from page scrape
POST /discoveries/resolve-posts           # Resolve post IDs to creators
```

### Gmail Integration
```
POST /gmail/authorize                     # Start OAuth flow, returns { authUrl }
GET  /gmail/callback                      # Handle OAuth callback from Google
GET  /gmail/accounts                      # List connected Gmail accounts
GET  /gmail/accounts/:id                  # Get specific Gmail account
DELETE /gmail/accounts/:id                # Revoke/delete Gmail account
```

### Google Sheets Integration
```
POST /sheets/sync                         # Sync approved creators to Google Sheets
```

**Request:**
```json
{
  "projectId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "rowCount": 47,
  "syncedAt": "2024-01-10T12:00:00Z",
  "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/..."
}
```

**Prerequisites:** Project must have `gmail_account_id`, `sheets_spreadsheet_id`, and `sheets_tab_name` configured.

### Email Campaigns (Bulk Email Drafting with Multi-Angle Selection)

Campaigns now support **multi-angle pitch selection** where AI chooses the best angle for each creator.

```
# Campaign Management
GET  /campaigns?project_id=<id>           # List campaigns for project
GET  /campaigns/:id                       # Get campaign with status counts
POST /campaigns                           # Create new campaign (with pitchAngleIds array)
PATCH /campaigns/:id                      # Update campaign
DELETE /campaigns/:id                     # Delete campaign

# Campaign Creators
GET  /campaigns/:id/creators              # List creators in campaign
POST /campaigns/:id/creators              # Add creators to campaign
DELETE /campaigns/:id/creators/:creatorId # Remove creator from campaign
PATCH /campaigns/:id/creators/:creatorId  # Update creator email
PATCH /campaigns/:id/creators/:creatorId/content  # Edit draft content
PATCH /campaigns/:id/creators/:creatorId/angle    # Override AI-selected angle

# Angle Selection (NEW)
POST /campaigns/:id/select-angles         # Trigger AI angle selection
GET  /campaigns/:id/angle-selection-status # Check selection progress

# Draft Generation & Creation
POST /campaigns/:id/generate              # Generate drafts with AI (async)
GET  /campaigns/:id/generation-status     # Check generation progress
POST /campaigns/:id/create-drafts         # Create Gmail drafts (async)
GET  /campaigns/:id/draft-status          # Check draft creation progress
```

**Campaign Statuses:** `draft` → `selecting_angles` → `angles_ready` → `generating` → `ready` → `creating_drafts` → `completed`

**Creator Statuses:** `pending` → `selecting_angle` → `angle_selected` → `generating` → `generated` → `draft_created`

**4-Step Workflow:**
1. **Select Creators** - Add creators from topic or by ID
2. **Select Angles** - Choose multiple pitch angles, AI selects best per creator
3. **Review Angles** - Review AI selections, override if needed
4. **Review & Send** - Generate drafts and create Gmail drafts

### Email Outreach (Individual Emails)
```
GET  /outreach?project_id=<id>            # List outreach records
GET  /outreach/:id                        # Get outreach record
POST /outreach                            # Create outreach record manually
PATCH /outreach/:id                       # Update status (sent, replied, etc.)

POST /outreach/generate                   # Generate email with Claude AI
POST /outreach/create-draft               # Create Gmail draft + record outreach
```

**Generate Email:**
```json
POST /outreach/generate
{
  "creatorId": "uuid",
  "projectId": "uuid",
  "topicId": "uuid",           // optional
  "pitchAngleId": "string",    // optional
  "customInstructions": "..."  // optional
}

Response:
{
  "subject": "Generated subject line",
  "body": "Generated email body...",
  "recipientEmail": "creator@example.com",
  "pitchAngleUsed": "Product Review Request"
}
```

**Create Draft:**
```json
POST /outreach/create-draft
{
  "creatorId": "uuid",
  "projectId": "uuid",
  "topicId": "uuid",           // optional
  "pitchAngleId": "string",    // optional
  "pitchAngleName": "string",  // optional
  "recipientEmail": "creator@example.com",
  "subject": "Email subject",
  "body": "Email body..."
}

Response:
{
  "outreach": { ... },
  "draftId": "gmail-draft-id",
  "messageId": "gmail-message-id"
}
```

## Utility Scripts

### `backfill-saved-posts.sh`

Backfills saved posts for approved creators who were reviewed before the saved posts feature was implemented.

**Location:** `claude-agents/backfill-saved-posts.sh`

**Usage:**
```bash
# List available topics
./backfill-saved-posts.sh

# Preview what would be saved (dry run)
./backfill-saved-posts.sh <topic_id> --dry-run

# Actually save the posts
./backfill-saved-posts.sh <topic_id>
```

**What it does:**
1. Fetches approved creators for the specified topic via `GET /creators/reviews/by-topic/:topicId`
2. For each creator, checks if they already have saved posts for this topic
3. Filters creator's `recent_posts` by topic-specific keywords
4. Saves up to 3 matching posts via `POST /creators/:id/save-post`

**Topic keywords are defined in the script:**
- **AI model coding benchmarks**: benchmark, comparison, versus, vs, claude, gpt, gemini, sonnet, opus, o1, o3
- **Coding agent review**: cursor, claude code, copilot, windsurf, cline, aider, agent, vibe coding
- **Kilo mentions**: kilo, kilocode

**Environment variables:**
```bash
export TSG_API_URL="https://tsg-extension-backend-pink.vercel.app"  # Default
export TSG_API_KEY="your-api-key"
export PROJECT_ID="your-project-id"
```

## Review Criteria Format

Review criteria exist at three levels:

### 1. Global Baseline (hardcoded in agent)
These criteria apply to **ALL** reviews across all projects and topics:

**Must Have:**
- At least 1,000 followers
- Posted content in the last 30 days
- Creator (individual, not a company account)
- Posts about other software products (not just own projects)
- Content is in English
- Based in US or Europe

**Exclude If:**
- Based in India or Pakistan
- Company or brand account
- Only posts about own products
- Content not in English
- Inactive (no posts in 30 days)

### 2. Project-Wide Criteria
Stored in `projects.review_criteria` as JSONB. This is the primary location for review criteria. All topics within a project share these criteria.

**Format:**
```json
{
  "must_have": [
    "Plain-English requirement 1",
    "Plain-English requirement 2"
  ],
  "nice_to_have": [
    "Optional criterion 1",
    "Optional criterion 2"
  ],
  "exclude_if": [
    "Disqualifying factor 1",
    "Disqualifying factor 2"
  ]
}
```

The agent combines both levels: Global baseline + Project criteria.

**Examples:**
- "Posts video content primarily"
- "Follower count > 10,000"
- "Posts at least weekly"
- "Engagement rate > 3%"
- "Not primarily promotional content"

Claude interprets these using its judgment based on the discovery's enrichment data.

## Creator Lifecycle & Status Fields

Understanding the status fields is critical. There are **multiple status tracking systems** for different purposes:

### 1. Enrichment Statuses (on `creators` table)

Track enrichment completion independently:

| Field | Values | Meaning |
|-------|--------|---------|
| `tier2_status` | `pending` → `in_progress` → `success` / `failed` | Apify profile enrichment (followers, posts) |
| `tier3_status` | `pending` → `in_progress` → `success` / `failed` | influencers.club cross-platform + demographics |
| `email_enrichment_status` | `pending` → `in_progress` → `success` / `failed` | Email discovery waterfall |

**Key point**: These are independent. A creator can have `tier2_status: 'success'` but `tier3_status: 'pending'`.

### 2. Contact Status (on `creator_project_statuses` table)

Tracks review + outreach progress **per project**. This is the single source of truth for creator status:

| `contact_status` | Stage | Meaning |
|------------------|-------|---------|
| `NULL` | Review | Pending AI review |
| `needs_final_review` | Review | Agent-approved, awaiting human QA |
| `skipped` | Review | Agent skipped (doesn't match criteria) |
| `no_fit` | Review | Human confirmed not a fit |
| `not_contacted` | Outreach | Human-approved, ready for outreach |
| `drafted` | Outreach | Email draft created in Gmail |
| `contacted` | Outreach | Initial outreach sent |
| `in_progress` | Outreach | Active conversation |
| `closed_won` | Outreach | Deal closed successfully |
| `closed_lost` | Outreach | Deal fell through |

**Review metadata** is stored in the same row:
- `review_feedback` - Plain-English reasoning for review decision
- `reviewer_type` - 'agent' or 'human'
- `reviewed_by` - User ID who made the decision
- `reviewed_at` - Timestamp of review

### 3. Content Item Status (on `content_items` table)

Tracks deal/deliverable progress:

| `status` | Meaning |
|----------|---------|
| `proposed` | Initial proposal from creator |
| `planned` | Deal agreed, awaiting execution |
| `in-progress` | Content being created |
| `published` | Content live |
| `cancelled` | Deal cancelled |

### 4. Email Outreach Status (on `email_outreach` table)

Tracks individual email state:

| `status` | Meaning |
|----------|---------|
| `draft_created` | Draft in Gmail |
| `sent` | Email sent |
| `opened` | Email opened |
| `replied` | Creator replied |
| `bounced` | Email bounced |

---

## Enrichment Pipeline

The backend orchestrates enrichment automatically. **Do not call enrichment manually** unless debugging.

### Tier 2: Apify Profile Enrichment (~$0.01/profile)

**Triggered by**: `POST /apify/execute-search` (auto-enriches during discovery)

**What it fetches**:
- Follower/subscriber count
- Recent posts (up to 10) with engagement metrics
- Bio, profile picture, verification status
- Platform-specific user_id (needed for email enrichment)

**Stored in**: `creators.tier2_status`, `creators.tier2_metadata`, `creators.recent_posts`

### Tier 3: influencers.club Cross-Platform (~$0.50-1.00/profile)

**Triggered by**: AI review approval (via `/workflows/start-combined` or `/workflows/review`)

**What it fetches**:
- Cross-platform handles (finds their YouTube if you have their TikTok, etc.)
- Audience demographics (gender, age groups)
- Verified email addresses

**Stored in**: `creators.tier3_status`, `creators.tier3_metadata`, `creators.youtube_handle`, etc.

### Cross-Platform Discovery

Find a creator's profiles on other platforms without full Tier 3 enrichment:

```
POST /creators/search-cross-platform
{ "creatorId": "<uuid>" }
```

Uses Social Media Finder to discover handles (~$0.10-0.20/lookup).

### Post Refresh (~$0.01-0.05/platform)

Refresh recent posts without full enrichment:

```
POST /creators/:id/refresh-posts
{ "maxDaysBack": 30, "platforms": ["youtube", "tiktok"] }

POST /creators/batch-refresh-posts
{ "creatorIds": ["<uuid>", "<uuid>"], "maxDaysBack": 30 }
```

### Extended Post History

Fetch 20+ posts per platform for deeper content analysis:

```
GET /creators/:id/posts-across-platforms?maxDaysBack=90&platforms=youtube,tiktok
```

### Email Enrichment: Apify Waterfall (~$0.01/attempt)

**Orchestrated by the backend** - runs automatically after Tier 3 enrichment if no email found.

**Important**: `enrichCreatorEmail()` skips influencers.club by default because it's expensive full enrichment (~$0.50-1.00), not email-only lookup. Email lookups use Apify (~$0.01/attempt).

**Waterfall order** (stops at first success):

1. **Apify Email Scraper** - Tries ALL platform user_ids from tier2/tier3 metadata:
   - YouTube channel_id → Instagram pk → TikTok id → Twitter id
2. **Cross-Platform Discovery** - Uses Social Media Finder to discover profiles on other platforms, enriches them to get user_ids, then tries email lookup
   - Currently auto-triggered only for TikTok creators in the waterfall
   - Can be called manually via `enrichViaCrossPlatform(creatorId)` for ANY platform

**Automatic chaining**: When Tier 3 completes without finding an email, `background-enrichment.ts` automatically calls `enrichCreatorEmail(creatorId)` which runs the Apify waterfall.

**Stored in**: `creators.email`, `creators.email_enrichment_status`, `creators.email_enrichment_provider`

---

## Full Lifecycle Flow

All workflows are **orchestrated by the backend API** via `POST /workflows/start-combined` or `/run-pipeline` command.

```
COMBINED PIPELINE (recommended)
├── POST /workflows/start-combined
│   ├── Creates pipeline record
│   └── Starts discovery execution
│
├── DISCOVERY (step 1)
│   ├── Executes saved searches via Apify actors
│   ├── Auto-triggers Tier 2 enrichment (followers, posts, user_ids)
│   └── Creates creators with tier2_status='success'
│
├── AI REVIEW (step 2, auto-chained)
│   ├── Evaluates creators against project review criteria
│   ├── Updates creator_project_statuses.contact_status:
│   │   └── 'needs_final_review' (approved) or 'skipped' (rejected)
│   └── Stores review_feedback, reviewer_type='agent'
│
└── TIER 3 ENRICHMENT (auto-triggered on approval)
    ├── influencers.club → cross-platform handles, demographics, email
    └── If no email found, enrichCreatorEmail() runs:
        ├── Apify Email Scraper (all user_ids: YT → IG → TikTok → Twitter)
        └── Cross-platform discovery (currently TikTok auto, any platform manual)

OUTREACH
├── POST /outreach/create-draft
│   ├── Creates Gmail draft
│   └── Updates contact_status='drafted'

CONTENT TRACKING
└── content_items tracks deals: proposed → planned → in-progress → published
```

---

## Key Fields for Review Evaluation

When reviewing creators, examine these fields from `GET /creators/:id`:

**Identity**:
- `primary_platform`, `primary_handle`, `display_name`, `bio`

**Metrics** (from Tier 2):
- `follower_count`, `engagement_rate`

**Content** (from Tier 2):
- `recent_posts[]` - Array with `post_url`, `caption`, `created_at`, `engagement.likes/comments/views`

**Review Criteria** (from `GET /topics/:id`):
- `review_criteria.must_have[]`, `review_criteria.nice_to_have[]`, `review_criteria.exclude_if[]`

## Evaluation Guidelines

When reviewing creators:

1. **Read the review criteria** - Understand must_have, nice_to_have, exclude_if
2. **Examine enrichment data** - Check follower count, engagement rate, post frequency, content type
3. **Use your judgment** - Criteria are guidelines, not rigid rules. Consider:
   - Context and edge cases
   - Quality over quantity (e.g., 5k engaged followers > 50k fake followers)
   - Content relevance to project goals
4. **Provide clear reasoning** - Explain your decision in `reviewFeedback`:
   - What criteria were met/not met
   - Why you approved/skipped
   - Any notable observations

**Good review feedback examples:**
- ✅ "Great fit - posts weekly AI tutorials, 50k followers, 8% engagement rate. Verified account. Meets all must-have criteria."
- ✅ "Skip: Low post frequency (only 2 posts in last 90 days). Does not meet 'posts weekly' requirement."
- ✅ "Borderline approval - 8k followers (below 10k threshold) but exceptional 15% engagement rate and high-quality content. Worth considering."

**Bad review feedback examples:**
- ❌ "Approved" (no reasoning)
- ❌ "Good creator" (vague)
- ❌ "Skip" (no explanation)

## Monitoring

Use `/check-projects` to see review status and pipeline counts. The Chrome extension also shows creator status and review history.

## Troubleshooting

**Backend not running:**
```bash
cd tsg-extension-backend && npm run dev
```

**Database schema out of date:**
Apply migration in Supabase SQL Editor (see Prerequisites #2)

**No enrichment data:**
Make sure creators have been enriched with Tier 2 data. This happens automatically during discovery. To manually trigger:
```bash
POST /creators/batch-enrich { "creatorIds": ["uuid-1", "uuid-2", "uuid-3"] }
```

**Review criteria not found:**
Set review criteria in database (see Prerequisites #3)

## Cost Optimization

| Tier | Cost | When to Run |
|------|------|-------------|
| Tier 2 (Apify) | ~$0.01/profile | Auto during discovery |
| Tier 3 (influencers.club) | ~$0.50-1.00/profile | Auto on approval only |
| Email Enrichment | ~$0.01/attempt | On-demand for outreach |

**Strategy**: Tier 2 runs on ALL discovered creators (cheap). Tier 3 auto-triggers only on approval (expensive). With typical 10-20% approval rate, this saves 80-90% on enrichment costs.

## After Reviews

Check status via the proper tables:

| What to Check | Table | Field |
|---------------|-------|-------|
| Review + outreach status | `creator_project_statuses` | `contact_status`, `review_feedback` |
| Enrichment status | `creators` | `tier2_status`, `tier3_status`, `email_enrichment_status` |
| Workflow progress | `agent_executions` | `status`, `result_summary` |
| Pipeline progress | `pipeline_executions` | `status`, `current_step` |
| Deal status | `content_items` | `status` |

Use `/check-projects` command to see aggregated counts, or the Chrome extension for individual creator details.
