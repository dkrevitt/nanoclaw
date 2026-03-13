# Creator Skills

Manage creators for discovery and outreach workflows.

## Available Skills

| Skill | Description |
|-------|-------------|
| [/list-creators](creators/list-creators.md) | List creators with filters |
| [/get-creator](creators/get-creator.md) | Get full details for a creator |
| [/search-by-content](creators/search-by-content.md) | Search creators by post content keywords |
| [/create-creator](creators/create-creator.md) | Create and auto-enrich creator from profile URL |
| [/link-creator-to-project](creators/link-creator-to-project.md) | Link existing creator to a project |
| [/update-creator-status](creators/update-creator-status.md) | Update contact status for a creator in a project |
| [/manual-review](creators/manual-review.md) | Manually review AI-rejected creators and recover good ones |

## Quick Reference

### List creators
```bash
/list-creators --topic-id <id> --status pending_review --limit 20
```
Filter by topic, pipeline status, platform, or limit results.

### Get full details
```bash
/get-creator <creator-id>
```
Returns enrichment data, recent posts, cross-platform handles.

### Search by content
```bash
/search-by-content --keywords "claude,gpt,ai coding" --topic-id <id>
```
Find creators whose posts contain specific keywords.

### Create creator from URL
```bash
/create-creator --url "https://youtube.com/@channelname"
```
Auto-enriches via Apify with follower counts, posts.

### Link to project
```bash
/link-creator-to-project --creator-ids <id1,id2> --project-id <id>
```
Creates project status link for tracking.

### Update contact status
```bash
/update-creator-status --creator-id <id> --project-id <id> --status contacted
```
Track outreach progress per project.

## Pipeline Statuses

| Status | Description |
|--------|-------------|
| `discovered` | Raw entry from search |
| `enriched` | Has Tier 2 data (follower counts, posts) |
| `approved` | Passed review (triggers Tier 3) |
| `skipped` | Failed review criteria |
| `contacted` | Outreach initiated |
| `in_progress` | Active conversation |
| `closed_won` | Deal closed |
| `closed_lost` | Deal lost |

## Contact Statuses (Review Workflow)

The `contact_status` field tracks review + outreach progress per project:

### Review Stage
| Status | Description | Next Action |
|--------|-------------|-------------|
| `null` | Not yet reviewed (newly discovered) | Run AI review or manual review |
| `needs_final_review` | AI-approved, awaiting human review | Human reviews and approves/rejects |
| `skipped` | AI rejected (doesn't match criteria) | Can be recovered via `/manual-review` |
| `no_fit` | Human confirmed not a fit | No action needed |
| `not_contacted` | **Human-approved, ready for outreach** | Start email outreach |

### Outreach Stage
| Status | Description |
|--------|-------------|
| `drafted` | Email draft created in Gmail |
| `contacted` | Initial outreach sent |
| `in_progress` | Active conversation |
| `closed_won` | Deal closed successfully |
| `closed_lost` | Deal fell through |

### Filtering by Status
```bash
# Get creators needing review (null or needs_final_review)
curl "$TSG_API_URL/creators?project_id=<id>&saved_search_ids=<ids>&pending_review=true"

# Get approved creators ready for outreach
curl "$TSG_API_URL/creators?project_id=<id>&contact_status=not_contacted"
```

**Note:** Use `saved_search_ids` (snake_case) not `savedSearchIds` (camelCase).

## Typical Use Cases

- **Pre-review check**: List enriched creators to see queue size
- **Deep dive**: Get full creator details before drafting email
- **Content matching**: Find creators who discuss specific topics
- **Ad-hoc research**: Found a creator on YouTube? Create with `/create-creator --url <url>`
- **Cross-project linking**: Creator from Project A relevant to Project B? Use `/link-creator-to-project`
- **Outreach tracking**: Update status as you progress through outreach funnel
- **Manual review**: AI rejected Twitter/text creators? Review `no_fit` creators and recover good ones with `/manual-review`
