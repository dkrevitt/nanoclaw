# /create-marketer

Create a marketer at a company with auto-enrichment via Apollo.

## Usage

```
/create-marketer --company-id <id> --name "Jane Smith" --title "VP Marketing"
/create-marketer --company-id <id> --name "Jane Smith" --linkedin "https://linkedin.com/in/janesmith"
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--company-id` | No | UUID of the company (required for auto-enrichment) |
| `--name` | Yes | Full name of the marketer |
| `--first-name` | No | First name (auto-parsed from full name) |
| `--last-name` | No | Last name (auto-parsed from full name) |
| `--title` | No | Job title |
| `--email` | No | Email address (skips enrichment if provided) |
| `--linkedin` | No | LinkedIn profile URL |
| `--skip-enrichment` | No | Skip auto-enrichment (default: false) |

## What it does

1. Creates marketer record in database
2. If `company_id` provided and no email:
   - Gets company domain from database
   - Calls Apollo to find email by name + domain
   - Updates marketer with verified email
3. Sets `email_enrichment_status` to track result

## API Call

```bash
curl -s -X POST "$TSG_API_URL/marketers" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TSG_API_KEY" \
  -d '{
    "company_id": "<company-id>",
    "full_name": "Jane Smith",
    "title": "VP of Marketing",
    "linkedin_url": "https://linkedin.com/in/janesmith"
  }' | jq '.'
```

## Response

```json
{
  "marketer": {
    "id": "uuid",
    "full_name": "Jane Smith",
    "first_name": "Jane",
    "last_name": "Smith",
    "title": "VP of Marketing",
    "email": "jane@acme.com",
    "email_verified": true,
    "email_enrichment_status": "success",
    "email_enrichment_provider": "apollo",
    "linkedin_url": "https://linkedin.com/in/janesmith",
    "linkedin_handle": "janesmith",
    "company_id": "uuid",
    "pipeline_status": "discovered"
  },
  "enriched": true,
  "emailStatus": "verified"
}
```

If enrichment fails:
```json
{
  "marketer": { ... },
  "enriched": false,
  "enrichmentError": "Email not found"
}
```

## Example

```
/create-marketer --company-id abc123 --name "Jane Smith" --title "VP Marketing"

Created marketer:
  Name: Jane Smith
  Title: VP of Marketing
  Company: Acme Corp (acme.com)
  Email: jane@acme.com (verified)
  Enrichment: success

Next steps:
  1. Link to project: /link-marketer-to-project --marketer-id <id> --project-id <id>
  2. View details: /get-marketer <id>
```

## Cost

- Apollo email lookup: 1 credit per lookup

## Related

- Link to project: `/link-marketer-to-project`
- Enrich email: `/enrich-marketer-email`
- Get marketer: `/get-marketer`
