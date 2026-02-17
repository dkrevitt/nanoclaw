# /create-company

Create a company from domain with auto-enrichment via Apollo.

## Usage

```
/create-company --domain "acme.com"
/create-company --domain "acme.com" --name "Acme Corp"
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--domain` | Yes | Company domain (e.g., "acme.com") |
| `--name` | No | Company name (will be enriched from Apollo) |
| `--project-id` | No | Project to associate with (creates link) |

## What it does

1. Checks if company already exists by domain
2. If not, enriches company via Apollo API to get:
   - Name, description, logo
   - Industry, employee count, founded year
   - Funding info (stage, total funding)
   - Tech stack / marketing stack
   - LinkedIn, Twitter handles
3. Creates company record in database
4. If `--project-id` provided, links company to project

## API Call

```bash
curl -s -X POST "$TSG_API_URL/companies" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "domain": "acme.com",
    "name": "Acme Corp"
  }' | jq '.'
```

## Response

```json
{
  "company": {
    "id": "uuid",
    "name": "Acme Corp",
    "domain": "acme.com",
    "website": "https://acme.com",
    "industry": "Technology",
    "employee_count_range": "51-200",
    "founded_year": 2015,
    "funding_total": 50000000,
    "funding_stage": "Series B",
    "linkedin_url": "https://linkedin.com/company/acme",
    "marketing_stack": ["HubSpot", "Segment"],
    "enrichment_provider": "apollo",
    "enriched_at": "2024-01-15T10:00:00Z"
  },
  "created": true
}
```

If company already exists:
```json
{
  "company": { ... },
  "created": false
}
```

## Example

```
/create-company --domain "notion.so"

Created company:
  Name: Notion Labs Inc
  Domain: notion.so
  Industry: Software
  Employees: 201-500
  Funding: $275M (Series C)
  Tech Stack: Segment, Amplitude, Intercom

Next steps:
  1. Find marketers: POST /companies/<id>/find-marketers
  2. Link to project: /link-company-to-project --company-id <id> --project-id <id>
```

## Cost

- Apollo company enrichment: 1 credit per lookup

## Related

- Link to project: `/link-company-to-project`
- Find marketers: `POST /companies/:id/find-marketers`
- Get company: `/get-company`
