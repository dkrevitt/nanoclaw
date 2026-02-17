# /list-companies

List companies with filtering options.

## Usage

```
/list-companies --project-id <id>
/list-companies --project-id <id> --contact-status not_contacted
/list-companies --search "acme" --has-marketers true
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--project-id` | No | Filter by project (via junction table) |
| `--contact-status` | No | Filter by project-level contact status |
| `--pipeline-status` | No | Filter by pipeline status (discovered, enriched, approved) |
| `--industry` | No | Filter by industry |
| `--search` | No | Text search in name, domain |
| `--has-marketers` | No | Filter to companies with/without marketers (true/false) |
| `--limit` | No | Results limit (default: 50) |
| `--offset` | No | Pagination offset (default: 0) |

## API Call

```bash
# List all companies
curl -s "$TSG_API_URL/companies" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'

# Filter by project
curl -s "$TSG_API_URL/companies?project_id=<id>&contact_status=not_contacted" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'

# Search by name/domain
curl -s "$TSG_API_URL/companies?search=acme&has_marketers=true" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

## Response

```json
{
  "companies": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "domain": "acme.com",
      "industry": "Technology",
      "employee_count_range": "51-200",
      "pipeline_status": "enriched",
      "marketer_count": 3,
      "contact_status": "not_contacted",
      "created_at": "..."
    }
  ],
  "total": 25,
  "hasMore": true
}
```

## Example

```
/list-companies --project-id abc123 --contact-status not_contacted --limit 10

Found 10 companies (25 total):

1. Acme Corp (acme.com)
   Industry: Technology | Marketers: 3 | Status: not_contacted

2. Widgets Inc (widgets.io)
   Industry: SaaS | Marketers: 2 | Status: not_contacted
...
```

## Related

- Get company details: `/get-company`
- Create company: `/create-company`
- Update status: `/update-company-status`
