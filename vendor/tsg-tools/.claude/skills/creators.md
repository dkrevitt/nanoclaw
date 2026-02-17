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

## Contact Statuses

| Status | Description |
|--------|-------------|
| `needs_final_review` | Agent-approved, awaiting human QA |
| `skipped` | Failed review criteria |
| `no_fit` | Human confirmed not a fit |
| `not_contacted` | Human-approved, ready for outreach |
| `drafted` | Email draft created |
| `contacted` | Initial outreach sent |
| `in_progress` | Active conversation |
| `closed_won` | Deal closed successfully |
| `closed_lost` | Deal fell through |

## Typical Use Cases

- **Pre-review check**: List enriched creators to see queue size
- **Deep dive**: Get full creator details before drafting email
- **Content matching**: Find creators who discuss specific topics
- **Ad-hoc research**: Found a creator on YouTube? Create with `/create-creator --url <url>`
- **Cross-project linking**: Creator from Project A relevant to Project B? Use `/link-creator-to-project`
- **Outreach tracking**: Update status as you progress through outreach funnel
