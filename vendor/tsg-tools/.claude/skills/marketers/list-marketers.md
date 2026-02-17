# /list-marketers

List marketers with filtering options.

## Usage

```
/list-marketers --project-id <id>
/list-marketers --company-id <id> --has-email true
/list-marketers --seniority director --search "marketing"
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--project-id` | No | Filter by project (via junction table) |
| `--company-id` | No | Filter by company |
| `--pipeline-status` | No | Filter by status (discovered, enriched, approved) |
| `--contact-status` | No | Filter by contact status |
| `--seniority` | No | Filter by seniority (entry, senior, manager, director, vp, c_suite, owner) |
| `--has-email` | No | Filter by email presence (true/false) |
| `--search` | No | Text search in name, title, email |
| `--limit` | No | Results limit (default: 50) |
| `--offset` | No | Pagination offset (default: 0) |

## API Call

```bash
# List marketers in a project
curl -s "$TSG_API_URL/marketers?project_id=<id>&has_email=true" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'

# Filter by company
curl -s "$TSG_API_URL/marketers?company_id=<id>" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'

# Search by name/title
curl -s "$TSG_API_URL/marketers?search=marketing&seniority=director" \
  -H "X-API-Key: $TSG_API_KEY" | jq '.'
```

## Response

```json
{
  "marketers": [
    {
      "id": "uuid",
      "full_name": "Jane Smith",
      "title": "VP of Marketing",
      "email": "jane@acme.com",
      "seniority": "vp",
      "pipeline_status": "enriched",
      "company": {
        "id": "uuid",
        "name": "Acme Corp",
        "domain": "acme.com",
        "industry": "Technology"
      }
    }
  ],
  "total": 15,
  "hasMore": false
}
```

## Example

```
/list-marketers --project-id abc123 --has-email true --limit 10

Found 10 marketers (15 total):

1. Jane Smith - VP of Marketing @ Acme Corp
   Email: jane@acme.com | Seniority: vp

2. John Doe - Director of Growth @ Widgets Inc
   Email: john@widgets.io | Seniority: director
...
```

## Related

- Get marketer details: `/get-marketer`
- Create marketer: `/create-marketer`
- Find email: `/enrich-marketer-email`
