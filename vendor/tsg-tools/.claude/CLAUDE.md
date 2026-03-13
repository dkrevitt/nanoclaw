# TSG Creator Discovery Agent

AI-powered creator discovery, review, enrichment, and outreach workflows for the TSG Creator Sourcing platform.

## What This System Does

TSG Creator Sourcing finds and manages creator relationships across social platforms (YouTube, TikTok, Instagram, Twitter/X, LinkedIn, Twitch) and newsletter platforms (Substack, Beehiiv, Ghost, ConvertKit, Buttondown). It supports two project types:

### Creator Search (default)
**Goal**: Find creators who produce content relevant to a topic → Pitch them to produce sponsored content for us.
- Projects contain `review_criteria` describing what makes a good creator fit
- Saved searches use `search_intent: 'creator_discovery'`
- Pipeline: Discover creators → Enrich → AI Review → Outreach via email campaigns

### Marketer Search
**Goal**: Find companies that sponsor creators → Pitch them to sponsor our represented creator.
- Projects link to a `represented_creator_id` (the creator we represent)
- Projects contain `marketer_review_criteria` describing what makes a good sponsor
- Saved searches use `search_intent: 'sponsored_content'`
- Pipeline: Search for sponsored posts → Extract brands → Find companies → Find marketers → Outreach

### Deciding Which Workflow to Run

| I want to... | Project Type | Command |
|---|---|---|
| Find new creators for a topic | `creator_search` | `/discover-creators` |
| Review existing undiscovered creators | `creator_search` | `/discover-creators --skip-discovery` |
| Generate search terms for a topic | either | `/identify-search-terms` |
| Search our existing database | either | `/search-database` |
| Find sponsors from creator posts | `marketer_search` | `/discover-marketers` |
| Find sponsor companies via AI research | `marketer_search` | `/ideate-companies` |
| Send outreach emails to approved creators | `creator_search` | `/run-campaign` or `/draft-emails` |
| Get market intelligence on creator content | either | `/content-report` |

---

## CRITICAL: API-Only Access

**NEVER write scripts that directly access Supabase.** All database operations MUST go through the backend API. The backend orchestrates important side effects:

| Endpoint | What it orchestrates |
|----------|---------------------|
| `POST /workflows/start-combined` | **Primary**: Inngest-based pipeline with parallel searches, enrichment, AI review, progress tracking |
| `POST /creators/:id/review` | Triggers Tier 3 enrichment on approval, creates/updates project status |
| `POST /creators/:id/enrich` | Single creator enrichment (Tier 2 or 3, optional email) |
| `POST /creators/batch-enrich` | Batch enrichment with filtering (sync or async via Inngest) |
| `POST /creators/:id/find-email` | Email-only lookup (no profile enrichment) |
| `POST /creators/batch-find-emails` | Batch email lookup |
| `POST /apify/execute-search` | Legacy: synchronous single-search (use for testing only) |

---

## Authentication

The backend API supports two authentication methods. **Claude agents should use API key authentication.**

### API Key Authentication (for agents)

All API requests must include the `X-API-Key` header:

```bash
curl -s "$TSG_API_URL/health" \
  -H "X-API-Key: $TSG_API_KEY"
```

API keys have the format `tsg_sk_<32 hex characters>` (e.g., `tsg_sk_a1b2c3d4e5f6...`).

### Creating an API Key

API keys are created via the backend API itself (you need an existing authenticated session):

```bash
# Create a new API key (requires existing auth — e.g., Bearer token from Chrome extension login)
curl -s -X POST "$TSG_API_URL/api-keys" \
  -H "Authorization: Bearer <your-supabase-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name": "claude-agent", "description": "API key for Claude agent workflows"}'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "claude-agent",
  "key": "tsg_sk_a1b2c3d4e5f6...",
  "key_prefix": "tsg_sk_a1b2",
  "message": "Store this key securely - it cannot be retrieved again."
}
```

**The `key` field is only returned once at creation time.** Save it immediately to your `.env` file.

### Managing API Keys

```bash
# List all keys (shows prefix and status, never the full key)
curl -s "$TSG_API_URL/api-keys" -H "X-API-Key: $TSG_API_KEY"

# Revoke a key
curl -s -X DELETE "$TSG_API_URL/api-keys/<key-id>" -H "X-API-Key: $TSG_API_KEY"

# Regenerate a key (old key stops working, new key returned)
curl -s -X POST "$TSG_API_URL/api-keys/<key-id>/regenerate" -H "X-API-Key: $TSG_API_KEY"
```

### Project-Scoped Keys

API keys can optionally be scoped to specific projects:

```bash
curl -s -X POST "$TSG_API_URL/api-keys" \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name": "project-specific", "project_ids": ["project-uuid-1", "project-uuid-2"]}'
```

If `project_ids` is omitted, the key inherits access to all projects the creating user can access.

### Local Development Auth Bypass

For local development, you can skip authentication entirely:

```bash
# In tsg-extension-backend/.env, add:
DISABLE_AUTH=true
```

This injects a mock user and bypasses all auth checks. **Never use in production.**

---

## Environment Setup

### Required: `.env` file in `claude-agents/`

Create a `.env` file with:

```bash
# Backend API URL
TSG_API_URL=https://tsg-extension-backend-pink.vercel.app  # Production
# TSG_API_URL=http://localhost:3000                         # Local dev

# API Key (created via POST /api-keys — see Authentication section)
TSG_API_KEY=tsg_sk_your_key_here
```

### Loading environment variables

```bash
# Option 1: Source .env before running curl commands
source <(grep -v '^#' claude-agents/.env | sed 's/^/export /')

# Option 2: Use the api.ts utility (auto-loads .env via dotenv)
cd claude-agents && npx tsx src/utils/api.ts projects
```

### Running the backend locally

```bash
cd tsg-extension-backend && npm run dev  # Starts on http://localhost:3000
```

When running locally, update `TSG_API_URL=http://localhost:3000` in your `.env`.

---

## Quick Start

### Using curl (recommended for agents)

```bash
# Verify connectivity
curl -s "$TSG_API_URL/health"
# Returns: {"status":"ok"}

# Verify authentication
curl -s "$TSG_API_URL/projects" -H "X-API-Key: $TSG_API_KEY"

# List projects
curl -s "$TSG_API_URL/projects" -H "X-API-Key: $TSG_API_KEY" | jq '.[]'

# List topics for a project
curl -s "$TSG_API_URL/topics?project_id=<uuid>" -H "X-API-Key: $TSG_API_KEY"

# List creators with filters
curl -s "$TSG_API_URL/creators?topic_id=<uuid>&contact_status=needs_final_review&limit=20" \
  -H "X-API-Key: $TSG_API_KEY"
```

### Using api.ts utility

```bash
cd claude-agents
npx tsx src/utils/api.ts projects
npx tsx src/utils/api.ts topics <project-id>
npx tsx src/utils/api.ts topic <topic-id>
npx tsx src/utils/api.ts creators --topic-id <id> --status pending_review --limit 20
```

---

## Commands

Full documentation in `commands/*.md`. Commands are orchestrated multi-step workflows.

| Command | Description |
|---------|-------------|
| `/check-projects` | View project summary, topics, creator counts |
| `/discover-creators` | **Primary**: Discovery + AI Review pipeline (Inngest) |
| `/discovery-loop` | Agentic iterative discovery that learns and improves |
| `/identify-search-terms` | Generate/test search terms before discovery |
| `/search-database` | Search existing creators (free, instant) |
| `/setup-project` | Interactive project creation/editing |
| `/draft-emails` | Create email drafts for approved creators |
| `/run-campaign` | Bulk email campaign workflow |
| `/content-report` | Market intelligence report from creator posts |
| `/discover-marketers` | Find sponsors from sponsored content |
| `/ideate-companies` | AI research for target sponsor companies |

## Skills

Full documentation in `skills/*.md`. Skills are single API operations with curl examples.

| Category | Skills |
|----------|--------|
| [Auth](skills/auth.md) | create-api-key, list-api-keys, revoke-api-key, verify-auth |
| [Workflows](skills/workflows.md) | start-workflow, start-pipeline, workflow-status, cancel-workflow |
| [Discovery](skills/discovery.md) | execute-search, test-search, create-saved-search |
| [Discovery Loop](skills/discovery-loop.md) | Agentic iterative discovery with learning |
| [Learn](skills/learn.md) | Analyze review outcomes, suggest improvements |
| [Creators](skills/creators.md) | list-creators, get-creator, search-by-content, update-status |
| [Companies](skills/companies.md) | list-companies, get-company, create-company, link-to-project |
| [Marketers](skills/marketers.md) | list-marketers, get-marketer, create-marketer, enrich-email |
| [Enrichment](skills/enrichment.md) | enrich-creator, batch-enrich, refresh-posts |
| [Outreach](skills/outreach.md) | generate-email, create-draft, create-campaign |
| [Projects](skills/projects.md) | list-projects, create-project, update-topic |
| [Content Items](skills/content-items.md) | list-content-items, create-content-item, parse-proposal |
| [Integrations](skills/integrations.md) | gmail-accounts, sync-sheets |
| [Reports](skills/reports.md) | content-report, export-report |

## Reference Docs

| Document | Contents |
|----------|----------|
| [API Endpoints](reference/api-endpoints.md) | Full endpoint reference with request/response shapes |
| [Status Fields](reference/status-fields.md) | Creator/company/campaign status tracking |
| [Review Criteria](reference/review-criteria.md) | Criteria format and evaluation guidelines |

---

## Architecture Overview

### Unified Schema
- Discoveries write directly to `creators` table (no separate discoveries table)
- Reviews tracked in `creator_project_statuses.contact_status` (per project)
- Companies/marketers are global, linked to projects via junction tables
- Projects are multi-tenant with role-based access (owner/admin/member/viewer)

### Automated Pipeline Flow

**Always use `POST /workflows/start-combined`** — it uses Inngest for proper orchestration:

```
POST /workflows/start-combined
├── Discovery → Runs all saved searches via Inngest (parallel execution)
├── Pre-filtering → Project-level filters (min followers, etc.)
├── Tier 2 Enrichment → Followers, posts, engagement (~$0.01/profile)
├── AI Pre-Review → Sets contact_status (needs_final_review or no_fit)
└── Pipeline tracking → GET /pipelines/:id/status for progress
```

**Important: AI Pre-Review uses PROJECT-level `review_criteria`, not topic-level.**
Topic `review_criteria` is for documentation/reference only. To change what the AI evaluates, update the project's criteria via `PATCH /projects/:id`.

**Tier 3 Enrichment** (~$0.10-0.50/profile via Apify, or ~$0.50-1.00/profile via influencers.club fallback) is triggered separately when a creator is approved for outreach.

Note: `POST /apify/execute-search` is a legacy synchronous endpoint useful only for testing single searches.

### Status Systems

| Table | Field | Tracks |
|-------|-------|--------|
| `creators` | `tier2_status`, `tier3_status`, `email_enrichment_status` | Enrichment completion |
| `creator_project_statuses` | `contact_status` | Review + outreach progress (per project) |
| `company_project_status` | `contact_status` | Company outreach progress (per project) |
| `agent_executions` | `status` | Workflow execution progress |
| `pipeline_executions` | `status`, `current_step` | Multi-step pipeline progress |
| `campaigns` | `status` | Email campaign lifecycle |

See [Status Fields Reference](reference/status-fields.md) for full details.

### Cost Optimization

| Tier | Cost | When |
|------|------|------|
| Tier 2 (Apify) | ~$0.01/profile | Auto during discovery |
| Tier 3 (Apify - default) | ~$0.10-0.50/profile | Auto on approval only |
| Tier 3 (influencers.club - fallback) | ~$0.50-1.00/profile | On-demand (provides demographics) |
| Email Enrichment | ~$0.01/attempt | On-demand |
| Post Refresh | ~$0.01-0.05/platform | On-demand (cheaper than re-enriching) |

Strategy: Tier 2 on all discovered, Tier 3 only on approved (saves 80-90% on enrichment). Apify is the default provider for both tiers; influencers.club is available as a fallback (configurable via env vars).

---

## Troubleshooting

### Authentication failures (401 Unauthorized)

1. **Check the API key is set**: `echo $TSG_API_KEY` — should start with `tsg_sk_`
2. **Check the URL is correct**: `echo $TSG_API_URL` — should not have a trailing slash
3. **Verify with health endpoint**: `curl -s "$TSG_API_URL/health"` — should return `{"status":"ok"}`
4. **Verify auth works**: `curl -s "$TSG_API_URL/projects" -H "X-API-Key: $TSG_API_KEY"` — should return project list, not `{"error":"Unauthorized"}`
5. **Key may be revoked**: List keys to check status: `GET /api-keys`
6. **Regenerate if needed**: `POST /api-keys/<id>/regenerate` — returns a new key

### Backend not running (local dev)

```bash
cd tsg-extension-backend && npm run dev  # Starts on http://localhost:3000
curl http://localhost:3000/health        # Should return {"status":"ok"}
```

### No enrichment data

Tier 2 runs automatically during discovery. To manually trigger:
```bash
curl -s -X POST "$TSG_API_URL/creators/batch-enrich" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"creatorIds": ["uuid-1", "uuid-2"]}'
```

### Review criteria not found

Set review criteria on the **project** (not topic) via the API:
```bash
curl -s -X PATCH "$TSG_API_URL/projects/<project-id>" \
  -H "X-API-Key: $TSG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "review_criteria": {
      "must_have": ["Posts video content", "Posts weekly"],
      "nice_to_have": ["Verified account"],
      "exclude_if": ["Primarily promotional content"]
    }
  }'
```

> **Note**: Topic-level `review_criteria` is deprecated. AI pre-review only uses project-level criteria.

### Apify rate limits
- YouTube/TikTok: Works with free Apify plan
- Twitter/Instagram: Requires paid Apify plan (~$49/month)
- If rate limited, wait and retry, or run searches individually instead of in batch

### Marketer Search
Find sponsor companies → Pitch to sponsor our creator
- Links to `represented_creator_id`
- Project description = sponsorship thesis (describes ideal sponsor match)
- `marketer_review_criteria` on project = hard filters (must_have, exclude_if, industries)
- Saved searches have `search_intent: 'sponsored_content'`
