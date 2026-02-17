# Company Skills

Manage companies for marketer discovery workflows.

## Available Skills

| Skill | Description |
|-------|-------------|
| [/list-companies](companies/list-companies.md) | List companies with filters |
| [/get-company](companies/get-company.md) | Get company with marketers and sponsored content |
| [/create-company](companies/create-company.md) | Create and auto-enrich company by domain |
| [/link-company-to-project](companies/link-company-to-project.md) | Link existing company to a project |
| [/update-company-status](companies/update-company-status.md) | Update contact status for a company in a project |

## Quick Reference

### List companies in a project
```bash
/list-companies --project-id <id> --contact-status not_contacted --limit 20
```
Filter by project, contact status, industry, or search by name/domain.

### Get full company details
```bash
/get-company <company-id>
```
Returns marketers, sponsored content (JSONB), enrichment data.

### Get sponsored content summary
```bash
curl -s "$TSG_API_URL/companies/<id>/sponsorships" -H "X-API-Key: $TSG_API_KEY" | jq '.'
```
Returns sponsored content array with computed summary (total, platforms, unique creators).

### Create company from domain
```bash
/create-company --domain "acme.com"
```
Auto-enriches via Apollo with company info, funding, tech stack.

### Link to project
```bash
/link-company-to-project --company-id <id> --project-id <id>
```
Creates company_project_status link for tracking.

### Update contact status
```bash
/update-company-status --company-id <id> --project-id <id> --status contacted
```
Track outreach progress per project.

## Contact Statuses

| Status | Description |
|--------|-------------|
| `not_contacted` | Ready for outreach |
| `drafted` | Email draft created |
| `contacted` | Initial outreach sent |
| `in_progress` | Active conversation |
| `closed_won` | Deal closed successfully |
| `closed_lost` | Deal fell through |

## Sponsored Content Storage

Sponsored content is now stored as JSONB in `companies.sponsored_content` (similar to `creators.recent_posts`). Each entry includes:

```json
{
  "post_url": "https://youtube.com/watch?v=...",
  "platform": "youtube",
  "post_date": "2024-01-15",
  "post_title": "Best Productivity Tools 2024",
  "creator_id": "uuid-of-creator",
  "creator_handle": "@techreviewer",
  "creator_name": "Tech Reviewer",
  "deal_type": "sponsored_video",
  "confidence_score": 0.95,
  "publication_note": "500K subs, covers productivity tools weekly",
  "discovered_at": "2024-02-16T10:00:00Z"
}
```

## Typical Use Cases

- **Ad-hoc research**: Found a sponsor company on LinkedIn? Create it with `/create-company --domain sponsor.com`
- **Cross-project linking**: Company from Project A relevant to Project B? Link it with `/link-company-to-project`
- **Outreach tracking**: Update status as you progress through outreach funnel
- **Marketer search**: After creating company, use `/get-company` to see available marketers
- **Sponsored content analysis**: Check `/get-company` or `/sponsorships` endpoint to see what creators they've worked with
