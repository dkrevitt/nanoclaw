# /ideate-companies

Uses AI research to identify target companies that would be good sponsors for the represented creator in a marketer_search project.

## Use Cases

- **New marketer_search project**: Bootstrap a project with AI-generated target companies
- **Expand company list**: Find new potential sponsors beyond what post search discovered
- **Generate search terms**: Auto-create branded search terms for each target company

## Comparison with Other Sponsor Discovery Paths

| Path | Entry Point | Best For |
|------|-------------|----------|
| `/ideate-companies` | AI research | New projects, creative ideation, generating targets |
| `/discover-marketers --mode search_posts` | Social media post search | Finding companies actively sponsoring content |
| `/discover-marketers --mode analyze_creators` | Existing creator posts | Analyzing what brands your creators already work with |

All three paths produce the same output: enriched companies + marketers stored in `companies` and `marketers` tables, linked to the project.

## Usage

```
/ideate-companies --project-id <uuid>
/ideate-companies --project-id <uuid> --max-companies 30
/ideate-companies --project-id <uuid> --skip-marketer-discovery        # Companies only
/ideate-companies --project-id <uuid> --skip-search-term-generation    # No saved searches
/ideate-companies --project-id <uuid> --platforms youtube,tiktok       # Specific platforms for search terms
/ideate-companies --project-id <uuid> --dry-run                        # Preview without execution
```

**Arguments:**
- `--project-id <uuid>` - Required. Must be a `marketer_search` project.
- `--max-companies <n>` - Max companies to ideate (default: 20)
- `--max-marketers <n>` - Max marketers per company (default: 5)
- `--skip-marketer-discovery` - Create companies only, skip finding marketers
- `--skip-search-term-generation` - Skip creating branded saved searches
- `--platforms <list>` - Comma-separated platforms for search terms (default: youtube,tiktok,twitter,instagram)
- `--dry-run` - Preview the workflow without triggering Inngest

## Prerequisites

1. **marketer_search project exists**: Create with `project_type: 'marketer_search'`
2. **Represented creator linked** (optional but recommended): Links the creator we're finding sponsors for
3. **Topic with company_review_criteria**: Helps AI understand target company profile
4. **Apollo API key**: Set `APOLLO_API_KEY` in `tsg-extension-backend/.env`
5. **Backend running**: `cd tsg-extension-backend && npm run dev`
6. **Inngest dev server**: `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`

## Workflow Steps

### Step 0: Validate Prerequisites

```bash
# Check project is marketer_search type
curl -s "$TSG_API_URL/projects/$PROJECT_ID" \
  -H "X-API-Key: $TSG_API_KEY" | jq '{type: .project.project_type, represented_creator: .project.represented_creator_id}'

# Check topics have company_review_criteria
curl -s "$TSG_API_URL/topics?project_id=$PROJECT_ID" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.topics[] | {topic: .topic, criteria: .company_review_criteria}'
```

### Step 1: Trigger Company Ideation Workflow

```bash
curl -s -X POST "$TSG_API_URL/brand-deals/start-company-ideation" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "project_id": "'$PROJECT_ID'",
    "max_companies": 20,
    "max_marketers_per_company": 5,
    "skip_marketer_discovery": false,
    "skip_search_term_generation": false,
    "search_term_platforms": ["youtube", "tiktok", "twitter", "instagram"]
  }' | jq '.'
```

**Response:**
```json
{
  "execution_id": "company-ideation-1234567890-abc123",
  "status": "started",
  "message": "Company ideation workflow started"
}
```

### Step 2: Monitor Progress

Watch the Inngest dashboard at http://localhost:8288, or check execution status:

```bash
curl -s "$TSG_API_URL/workflows/$EXECUTION_ID" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.status, .checkpoint_data.stats'
```

### Step 3: Review Results

```bash
# List created companies
curl -s "$TSG_API_URL/companies?project_id=$PROJECT_ID" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.companies[] | {name, domain, industry}'

# List marketers
curl -s "$TSG_API_URL/marketers?project_id=$PROJECT_ID" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.marketers[] | {name: .full_name, title, company: .company.name}'

# List generated search terms
curl -s "$TSG_API_URL/topics/$TOPIC_ID/saved-searches?search_intent=sponsored_content" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.saved_searches[] | {query: .search_query, platform, notes}'
```

## What the Workflow Does

1. **Gather Context**:
   - Fetch project details and represented creator
   - Get topics with company_review_criteria
   - List existing companies in project (to avoid duplicates)

2. **AI Research** (Claude):
   - Analyze creator niche, audience, and content style
   - Research companies that sponsor similar creators
   - Generate list of target companies with reasoning and fit scores

3. **Create/Enrich Companies** (Apollo):
   - Validate domains via Apollo company enrichment
   - Store company data (name, industry, funding, etc.)
   - Link to project via `company_project_status`

4. **Find Marketers** (Apollo):
   - Search for marketing contacts at each company
   - Store marketer data (title, email, LinkedIn)
   - Link to project via `project_marketers`

5. **Generate Search Terms**:
   - Create branded search terms for each company
   - e.g., "#ad notion", "sponsored by Figma"
   - Store as `topic_saved_searches` with `search_intent: 'sponsored_content'`

## Example Output

```
=== Company Ideation for "Find sponsors for @techcreator" ===

Using context:
  - Represented creator: @techcreator (YouTube, 150K followers)
  - Niche: Developer tools, productivity
  - Review criteria: Series A+, consumer or B2B SaaS

AI Research complete. Ideated 20 target companies.

Enriching via Apollo...
  ✓ Notion (notion.so) - 501-1000 employees, Series C
  ✓ Figma (figma.com) - 501-1000 employees, Acquired
  ✓ Linear (linear.app) - 51-200 employees, Series B
  ✓ Raycast (raycast.com) - 11-50 employees, Series A
  ... 16 more companies

Finding marketers...
  ✓ Notion: Found 5 marketers
  ✓ Figma: Found 4 marketers
  ...

Generating branded search terms...
  ✓ Created 64 saved searches across 4 platforms

=== Summary ===
├── Companies ideated: 20
├── Companies created: 18
├── Marketers found: 72
├── Search terms generated: 64
└── Saved searches created: 64

Next steps:
  - Review companies: /list-companies --project-id <id>
  - Execute searches: /discover-marketers --project-id <id> --mode search_posts
```

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/brand-deals/start-company-ideation` | Start Inngest workflow |
| GET | `/workflows/:id` | Check execution status |
| GET | `/companies` | List created companies |
| GET | `/marketers` | List created marketers |
| GET | `/topics/:id/saved-searches` | List generated search terms |

## Cost Estimates

| Operation | Cost | Notes |
|-----------|------|-------|
| AI research (Claude) | ~$0.01-0.05 | Single prompt for all companies |
| Company enrichment | 1 credit/company | Apollo |
| Marketer search | 1 credit/search | Apollo |
| Apollo credits | ~$49-99/month | 1000+ credits |

**Cost optimization:**
- Use `--skip-marketer-discovery` to skip people search (company data only)
- Use `--skip-search-term-generation` to skip creating saved searches
- Set `--max-companies` to limit Apollo usage

## Related Commands

- `/discover-marketers` - Search for sponsors in social media posts
- `/check-projects` - View project summary
- `/list-companies` - Review discovered companies
- `/list-marketers` - Review discovered marketers

## Troubleshooting

**Project type error:**
```bash
# Ensure project is marketer_search type
curl -s "$TSG_API_URL/projects/$PROJECT_ID" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.project.project_type'
```

**No companies ideated:**
- Check that represented creator has bio/niche info
- Ensure topic has company_review_criteria set

**Apollo API not working:**
```bash
curl -s "$TSG_API_URL/companies/apollo-health" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```
