# Marketer Skills

Manage marketers (B2B contacts at companies) for sponsor outreach.

## Available Skills

| Skill | Description |
|-------|-------------|
| [/list-marketers](marketers/list-marketers.md) | List marketers with filters |
| [/get-marketer](marketers/get-marketer.md) | Get marketer with company info |
| [/create-marketer](marketers/create-marketer.md) | Create and auto-enrich marketer at a company |
| [/link-marketer-to-project](marketers/link-marketer-to-project.md) | Link existing marketer to a project |
| [/enrich-marketer-email](marketers/enrich-marketer-email.md) | Find email via Apollo |

## Quick Reference

### List marketers in a project
```bash
/list-marketers --project-id <id> --has-email true --limit 20
```
Filter by project, company, seniority, or email presence.

### Get full marketer details
```bash
/get-marketer <marketer-id>
```
Returns company info, reviews, contact details.

### Create marketer at a company
```bash
/create-marketer --company-id <id> --name "Jane Smith" --title "VP Marketing"
```
Auto-enriches via Apollo to find email.

### Link to project
```bash
/link-marketer-to-project --marketer-id <id> --project-id <id>
```
Creates project_marketers link for tracking.

### Enrich marketer email
```bash
/enrich-marketer-email --marketer-id <id>
```
Finds email via Apollo using name + company domain.

## Pipeline Statuses

| Status | Description |
|--------|-------------|
| `discovered` | Found via brand deal analysis |
| `enriched` | Has email and verified info |
| `approved` | Ready for outreach |
| `skipped` | Not a fit |

## Contact Statuses

| Status | Description |
|--------|-------------|
| `not_contacted` | Ready for outreach |
| `drafted` | Email draft created |
| `contacted` | Initial outreach sent |
| `in_progress` | Active conversation |
| `closed_won` | Deal closed |
| `closed_lost` | Deal fell through |

## Typical Use Cases

- **Ad-hoc research**: Found a marketing director on LinkedIn? Create them with `/create-marketer` (auto-enriches email)
- **Cross-project linking**: Marketer from Project A relevant to Project B? Link with `/link-marketer-to-project`
- **Email enrichment**: Missing email? Run `/enrich-marketer-email` to find via Apollo
- **Outreach prep**: Use `/get-marketer` to see full context before drafting email
