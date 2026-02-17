# /discover-marketers

Discovers marketers at companies that sponsor creators. Analyzes posts for sponsored content, resolves brands to companies via Apollo, and finds marketing contacts.

## Three Paths to Sponsor Discovery

This command provides two modes for finding sponsors. For a third approach (AI-driven ideation), see `/ideate-companies`.

| Path | Command | Best For |
|------|---------|----------|
| Post Search | `/discover-marketers --mode search_posts` | Finding sponsors actively advertising on social media |
| Creator Analysis | `/discover-marketers --mode analyze_creators` | Analyzing what brands your existing creators work with |
| AI Ideation | `/ideate-companies` | New projects, creative ideation, generating target companies |

All three paths produce the same output: enriched companies + marketers stored in `companies.sponsored_content` JSONB, linked to the project.

## Use Cases

- **Creator projects**: Identify competitor brands (which companies are sponsoring similar creators)
- **Marketer projects**: Find B2B leads (marketers responsible for influencer campaigns)

## Usage

```
/discover-marketers --project-id <uuid>
/discover-marketers --project-id <uuid> --mode search_posts                 # Direct post search (default)
/discover-marketers --project-id <uuid> --mode analyze_creators --creator-ids <id1,id2,id3>
/discover-marketers --project-id <uuid> --skip-ai-analysis                  # Deterministic only
/discover-marketers --project-id <uuid> --skip-marketer-discovery           # Brands only (no people search)
/discover-marketers --project-id <uuid> --dry-run                           # Preview without execution
```

**Arguments:**
- `--project-id <uuid>` - Required. Project ID
- `--mode <mode>` - Optional. One of:
  - `search_posts` (default) - Direct post-based search. Bypasses creator pipeline entirely. Recommended for marketer_search projects.
  - `analyze_creators` - Analyze existing creators' stored posts for brand mentions. Use when you already have creators with `recent_posts` data.
- `--creator-ids <ids>` - For `analyze_creators` mode. Comma-separated creator UUIDs.
- `--saved-search-ids <ids>` - For `search_posts` mode. Specific saved search UUIDs to execute (defaults to all approved `sponsored_content` searches for the project).
- `--skip-ai-analysis` - Use deterministic checks only (hashtags, phrases). Saves Claude API costs.
- `--skip-marketer-discovery` - Extract brands/companies only, skip Apollo people search
- `--max-companies <n>` - Max companies to process (default: 20)
- `--max-marketers <n>` - Max marketers per company (default: 5)
- `--max-results-per-search <n>` - Max Apify results per search (default: 50)
- `--lookback-days <n>` - How far back to search for posts (default: 30)
- `--dry-run` - Preview the workflow without triggering Inngest

## Prerequisites

1. **Database migration applied**: Run `100_marketer_discovery_schema.sql` in Supabase
2. **Apollo API key**: Set `APOLLO_API_KEY` in `tsg-extension-backend/.env`
3. **Backend running**: `cd tsg-extension-backend && npm run dev`
4. **Inngest dev server**: `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`
5. **For `search_posts` mode**: Approved saved searches with `search_intent: 'sponsored_content'` (create via `/identify-search-terms`)
6. **For `analyze_creators` mode**: Creators with `recent_posts` data

## Workflow Steps

### Step 0: Validate Prerequisites

```bash
# Check Apollo API health
curl -s "$TSG_API_URL/companies/apollo-health" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'

# For search_posts mode: check for approved sponsored_content searches
curl -s "$TSG_API_URL/topics/$TOPIC_ID/saved-searches?search_intent=sponsored_content&status=approved" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.total'

# For analyze_creators mode: check for creators with posts
curl -s "$TSG_API_URL/creators?has_recent_posts=true&limit=5" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.total'
```

### Step 1: Trigger Marketer Discovery Workflow

```bash
# Mode: search_posts (recommended for marketer_search projects)
# Searches → posts → filter sponsored → extract brands → companies → marketers
curl -s -X POST "$TSG_API_URL/brand-deals/start-marketer-discovery" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "project_id": "'$PROJECT_ID'",
    "mode": "search_posts",
    "skip_ai_analysis": false,
    "skip_marketer_discovery": false,
    "max_companies": 20,
    "max_marketers_per_company": 5,
    "max_results_per_search": 50,
    "lookback_days": 30
  }' | jq '.'

# Mode: analyze_creators (for analyzing specific creators' existing posts)
curl -s -X POST "$TSG_API_URL/brand-deals/start-marketer-discovery" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "project_id": "'$PROJECT_ID'",
    "mode": "analyze_creators",
    "creator_ids": ["uuid1", "uuid2"],
    "skip_ai_analysis": false,
    "skip_marketer_discovery": false,
    "max_companies": 20,
    "max_marketers_per_company": 5
  }' | jq '.'
```

**Response:**
```json
{
  "execution_id": "marketer-discovery-1234567890-abc123",
  "status": "started",
  "mode": "search_posts",
  "message": "Marketer discovery workflow started in search_posts mode"
}
```

### Step 2: Monitor Progress

Watch the Inngest dashboard at http://localhost:8288, or check execution status:

```bash
# Check execution status
curl -s "$TSG_API_URL/workflows/$EXECUTION_ID" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

### Step 3: Review Results

```bash
# List discovered companies
curl -s "$TSG_API_URL/companies?limit=20" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.companies[] | {name, domain, industry, marketerCount: .marketers | length}'

# List discovered marketers
curl -s "$TSG_API_URL/marketers?limit=20" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.marketers[] | {name: .full_name, title, company: .company.name, email}'

# List sponsored content for a company
curl -s "$TSG_API_URL/companies/<company-id>/sponsorships" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'

# List sponsored content across all companies
curl -s "$TSG_API_URL/brand-deals?limit=20" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.brand_deals[] | {creator_handle, company_name, platform, deal_type}'
```

## What the Workflow Does

### Mode: `search_posts` (recommended)

Bypasses the creator pipeline entirely — no creator records created, no enrichment needed:

1. **Execute Saved Searches** - Runs approved `sponsored_content` searches via Apify
2. **Get Posts Directly** - Maps raw Apify results to post-level data (captions, hashtags, engagement) instead of discarding post content to extract creator profiles
3. **Filter Sponsored** - Deterministic checks for sponsorship signals (#ad, #sponsored, "paid partnership", etc.)
4. **Extract Brands** - Uses AI + deterministic checks to identify sponsoring brands in each post
5. **Resolve Companies** - Looks up brands via Apollo company enrichment
6. **Find Marketers** - Searches for marketing contacts at each company (unless `--skip-marketer-discovery`)
7. **Create Creators** - Creates creator records if they don't exist (for linking sponsored content)
8. **Store Results** - Creates records in `companies`, `marketers` tables; stores sponsored content in `companies.sponsored_content` JSONB; links to project via junction tables

### Mode: `analyze_creators`

1. **Fetch Creators** - Gets creators with `recent_posts` or specified by `creator_ids`
2. **Analyze Posts** - Uses AI + deterministic checks to detect sponsored content
3. **Extract Brands** - Aggregates unique brands from sponsored posts with confidence scores
4. **Resolve Companies** - Looks up brands via Apollo company enrichment
5. **Find Marketers** - Searches for marketing contacts at each company
6. **Store Results** - Creates records in `companies`, `marketers` tables; stores sponsored content in `companies.sponsored_content` JSONB

## Example Output

```
=== Marketer Discovery for project "Find Sponsors for @creator" ===
=== Mode: search_posts ===

Executing 6 saved searches for sponsored posts...
  ✓ "#ad tech tools" (youtube): 42 posts
  ✓ "#sponsored software" (twitter): 28 posts
  ✓ "#paidpartnership devtools" (tiktok): 35 posts
  ... 3 more searches

Posts collected: 187 total
  ✓ 47 posts have sponsorship signals (25%)
  ✓ Extracted 15 unique brands

Resolving companies via Apollo...
  ✓ Notion (notion.so) - 201-500 employees, Series C
  ✓ Figma (figma.com) - 501-1000 employees, Series D
  ✓ Linear (linear.app) - 51-200 employees, Series B
  ... 12 more companies

Finding marketers...
  ✓ Notion: Found 5 marketers (2 VPs, 3 Directors)
  ✓ Figma: Found 4 marketers (1 CMO, 2 Directors, 1 Manager)
  ...

=== Summary ===
├── Searches executed: 6
├── Posts found: 187
├── Sponsored posts: 47
├── Companies discovered: 15
├── Marketers found: 52
├── Creators created: 23
└── Sponsored content added: 47

Next steps:
  - Review companies: /review-companies --project-id <id>
  - Review marketers: /review-marketers --project-id <id>
```

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/companies/apollo-health` | Check Apollo API status |
| POST | `/brand-deals/start-marketer-discovery` | Start Inngest workflow |
| GET | `/workflows/:id` | Check execution status |
| GET | `/companies` | List discovered companies |
| GET | `/marketers` | List discovered marketers |
| GET | `/brand-deals` | List brand deals |

## Cost Estimates

| Operation | Cost | Notes |
|-----------|------|-------|
| Post search (Apify) | ~$0.50/search | Returns raw posts instead of profiles |
| Brand extraction (AI) | ~$0.001/post | Claude Sonnet API |
| Brand extraction (deterministic) | Free | No API calls |
| Company enrichment | 1 credit/company | Apollo |
| Marketer search | 1 credit/search | Apollo |
| Apollo credits | ~$49-99/month | 1000+ credits |

**Cost optimization:**
- Use `--skip-ai-analysis` for deterministic-only detection (free)
- Use `--skip-marketer-discovery` for brand identification only (no people search costs)
- Set `--max-companies` to limit Apollo usage
- `search_posts` mode is more efficient than `analyze_creators` because it skips creator enrichment

## Related Commands

- `/ideate-companies` - AI-driven company ideation (third path to sponsor discovery)
- `/check-projects` - View project summary and creator counts
- `/identify-search-terms` - Generate search terms (prerequisite for `search_posts` mode)
- `/discover-creators` - Discover creators for topics (prerequisite for `analyze_creators` mode)
- `/list-companies` - Review discovered companies
- `/list-marketers` - Review discovered marketers

## Troubleshooting

**Apollo API not working:**
```bash
# Check if APOLLO_API_KEY is set
grep APOLLO_API_KEY tsg-extension-backend/.env
```

**Inngest workflow not starting:**
```bash
# Make sure Inngest dev server is running
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

**No saved searches for search_posts mode:**
```bash
# Generate search terms first
/identify-search-terms --project-id <id> --topic-id <id>
# Then approve the generated searches in the UI or via API
```

**No creators with posts (for analyze_creators mode):**
```bash
# Check if any creators have recent_posts
curl -s "$TSG_API_URL/creators?has_recent_posts=true&limit=1" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.total'

# If 0, run creator discovery first with Tier 2 enrichment
/discover-creators --project-id <id> --topic-id <id>
```

**Migration not applied:**
Run `100_marketer_discovery_schema.sql` in Supabase SQL Editor.
